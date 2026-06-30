import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { OtpService } from './otp.service';
import { OtpPurpose } from './enums/otp-purpose.enum';
import { UsersRepository } from '../users/users.repository';
import { CustomersRepository } from '../customers/customers.repository';
import { SellersRepository } from '../sellers/sellers.repository';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { Role, SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';
import { JwtPayload } from '../../common/interfaces';
import { MailService } from '../../infra/mailer/mailer.service';
import { buildWelcomeEmail } from '../../infra/mailer/templates';
import {
  SendOtpDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RegisterSellerDto,
} from './dto';

interface TokenPair { accessToken: string; refreshToken: string; }

interface PublicUser {
  userId: string;
  email: string;
  role: Role;
  customerId?: string;
  sellerId?: string;
  name: string;
  sellerStatus?: string;
}

interface RegisterResult {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SALT_ROUNDS: number;

  constructor(
    private readonly otpService: OtpService,
    private readonly users: UsersRepository,
    private readonly customers: CustomersRepository,
    private readonly sellers: SellersRepository,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
  ) {
    this.SALT_ROUNDS = this.config.get<number>('app.bcryptSaltRounds') ?? 10;
  }

  //  customer registration

  async initiateRegistration(dto: SendOtpDto): Promise<void> {
    if (dto.purpose !== OtpPurpose.REGISTRATION) {
      throw new BadRequestException('This endpoint is only for REGISTRATION purpose.');
    }
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password!, this.SALT_ROUNDS);
    await this.otpService.sendOtp(
      dto.email,
      OtpPurpose.REGISTRATION,
      { firstName: dto.firstName!, lastName: dto.lastName!, passwordHash },
    );
  }

  //seller registration
  async initiateSellerRegistration(dto: RegisterSellerDto): Promise<void> {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, this.SALT_ROUNDS);
    await this.otpService.sendOtp(
      dto.email,
      OtpPurpose.REGISTRATION,
      undefined,
      {
        businessName: dto.businessName,
        contactPerson: dto.contactPerson,
        mobile: dto.mobile,
        passwordHash,
      },
    );
  }

  //  verify + create user (customer OR seller)

  async verifyAndRegister(
    email: string,
    purpose: OtpPurpose,
    plainOtp: string,
  ): Promise<RegisterResult | null> {
    const verified = await this.otpService.verifyOtp(email, purpose, plainOtp);
    if (purpose !== OtpPurpose.REGISTRATION) return null;

    // Decide customer vs seller by which data is present in the OTP doc.
    const isSellerRegistration = Boolean(verified.businessName);

    const user = await this.users.create({
      email: verified.email,
      passwordHash: verified.passwordHash!,
      role: isSellerRegistration ? Role.SELLER : Role.CUSTOMER,
    });

    let profileName: string;
    let extraClaims: { customerId?: string; sellerId?: string } = {};

    if (isSellerRegistration) {
      const seller = await this.sellers.create({
        userId: user._id,
        businessName: verified.businessName!,
        contactPerson: verified.contactPerson!,
        email: verified.email,
        mobile: verified.mobile!,
      });
      profileName = verified.businessName!;
      extraClaims = { sellerId: seller._id.toString() };

      // Notify admin that a new seller is pending
      this.logger.log(`New seller pending approval: ${verified.email}`);
    } else {
      const customer = await this.customers.create({
        userId: user._id,
        firstName: verified.firstName!,
        lastName: verified.lastName!,
      });
      await this.cartModel.create({ customerId: customer._id, items: [] });
      profileName = `${verified.firstName} ${verified.lastName}`;
      extraClaims = { customerId: customer._id.toString() };
    }

    await this.mail.sendEmail({
      to: verified.email,
      subject: 'Welcome to Book Marketplace!',
      html: buildWelcomeEmail(
        isSellerRegistration ? verified.businessName! : verified.firstName!,
        isSellerRegistration ? 'SELLER' : 'CUSTOMER',
      ),
    });

    const tokens = await this.issueTokens(
      user._id.toString(),
      user.email,
      user.role,
      extraClaims,
    );

    return {
      ...tokens,
      user: this.toPublicUser(user, {
        ...extraClaims,
        name: profileName,
        sellerStatus: isSellerRegistration ? SellerStatus.PENDING_APPROVAL : undefined,
      }),
    };
  }

  //  login / refresh / logout

  async login(dto: LoginDto): Promise<RegisterResult> {
    const user = await this.users.findByEmailWithSecret(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_DISABLED);
    }

    // ───── Seller approval ─────
    // SELLERS can only log in if their SellerProfile is APPROVED

    if (user.role === Role.SELLER) {
      const seller = await this.sellers.findByUserId(user._id);
      if (!seller) {
        throw new ForbiddenException(
          'Seller profile not found. Please contact support.',
        );
      }
      if (seller.status === SellerStatus.PENDING_APPROVAL) {
        throw new ForbiddenException(MESSAGES.SELLER.PENDING_LOGIN);
      }
      if (seller.status === SellerStatus.REJECTED) {
        throw new ForbiddenException(MESSAGES.SELLER.REJECTED_LOGIN);
      }
      // status === APPROVED falls through, login proceeds
    }

    const profile = await this.resolveProfile(user);
    const tokens = await this.issueTokens(
      user._id.toString(), user.email, user.role, profile.claims,
    );
    await this.users.markLoggedIn(user._id);
    return { ...tokens, user: this.toPublicUser(user, profile.public) };
  }

  async refresh(userId: string, presentedToken: string): Promise<TokenPair> {
    const user = await this.users.findByIdWithRefresh(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    const matches = await bcrypt.compare(
      this.sha256(presentedToken),
      user.refreshTokenHash,
    );
    if (!matches) {
      await this.users.setRefreshTokenHash(user._id, null);
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    const profile = await this.resolveProfile(user);
    return this.issueTokens(user._id.toString(), user.email, user.role, profile.claims);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    const profile = await this.resolveProfile(user);
    return this.toPublicUser(user, profile.public);
  }

  //  password recovery

  async forgotPassword(email: string): Promise<void> {
    if (await this.users.existsByEmail(email)) {
      await this.otpService.sendOtp(email, OtpPurpose.PASSWORD_RESET);
    } else {
      this.logger.warn(`forgot-password requested for non-existent email: ${email}`);
    }
  }

  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    await this.otpService.verifyOtp(dto.email, OtpPurpose.PASSWORD_RESET, dto.otp);
    const user = await this.users.findByEmailWithSecret(dto.email);
    if (!user) throw new BadRequestException('No account found for this email.');
    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);
    await this.users.updatePasswordAndRevokeSessions(user._id, newPasswordHash);
  }

  async changePassword(userId: string, dto: ChangePasswordDto): Promise<void> {
    const fullUser = await this.users.findByIdWithPassword(userId);
    if (!fullUser) throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    const currentMatches = await bcrypt.compare(
      dto.currentPassword, fullUser.passwordHash,
    );
    if (!currentMatches) {
      throw new UnauthorizedException('Current password is incorrect.');
    }
    const newPasswordHash = await bcrypt.hash(dto.newPassword, this.SALT_ROUNDS);
    await this.users.updatePasswordAndRevokeSessions(userId, newPasswordHash);
  }

  // helpers

  private async resolveProfile(user: UserDocument): Promise<{
    claims: { customerId?: string; sellerId?: string };
    public: { customerId?: string; sellerId?: string; sellerStatus?: string; name: string };
  }> {
    if (user.role === Role.CUSTOMER) {
      const c = await this.customers.findByUserId(user._id);
      return {
        claims: { customerId: c?._id.toString() },
        public: {
          customerId: c?._id.toString(),
          name: c ? `${c.firstName} ${c.lastName}` : user.email,
        },
      };
    }
    if (user.role === Role.SELLER) {
      const s = await this.sellers.findByUserId(user._id);
      return {
        claims: { sellerId: s?._id.toString() },
        public: {
          sellerId: s?._id.toString(),
          sellerStatus: s?.status,
          name: s?.businessName ?? user.email,
        },
      };
    }
    return { claims: {}, public: { name: 'Marketplace Admin' } };
  }

  private toPublicUser(
    user: UserDocument,
    extra: { customerId?: string; sellerId?: string; sellerStatus?: string; name: string },
  ): PublicUser {
    return {
      userId: user._id.toString(),
      email: user.email,
      role: user.role,
      name: extra.name,
      ...(extra.customerId ? { customerId: extra.customerId } : {}),
      ...(extra.sellerId ? { sellerId: extra.sellerId } : {}),
      ...(extra.sellerStatus ? { sellerStatus: extra.sellerStatus } : {}),
    };
  }

  private async issueTokens(
    userId: string,
    email: string,
    role: Role,
    extra: { customerId?: string; sellerId?: string },
  ): Promise<TokenPair> {
    const payload: JwtPayload = { sub: userId, email, role, ...extra };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: (this.config.get('jwt.accessExpiresIn') ?? '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: (this.config.get('jwt.refreshExpiresIn') ?? '7d') as any,
    });
    const refreshHash = await bcrypt.hash(this.sha256(refreshToken), this.SALT_ROUNDS);
    await this.users.setRefreshTokenHash(userId, refreshHash);
    return { accessToken, refreshToken };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
