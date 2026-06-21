import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, JwtSignOptions } from '@nestjs/jwt';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { createHash, randomUUID } from 'crypto';
import { UsersService } from '../users/users.service';
import { CustomersService } from '../customers/customers.service';
import { SellersService } from '../sellers/sellers.service';
import { Cart, CartDocument } from '../cart/schemas/cart.schema';
import { UserDocument } from '../users/schemas/user.schema';
import { Role, SellerStatus } from '../../common/enums';
import { MESSAGES } from '../../common/constants';
import { JwtPayload } from '../../common/interfaces';
import { RegisterCustomerDto, RegisterSellerDto, LoginDto } from './dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  private readonly saltRounds: number;

  constructor(
    private readonly users: UsersService,
    private readonly customers: CustomersService,
    private readonly sellers: SellersService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Cart.name) private readonly cartModel: Model<CartDocument>,
  ) {
    this.saltRounds = this.config.get<number>('app.bcryptSaltRounds') ?? 10;
  }

  // ───────────────────────── register ─────────────────────────

  async registerCustomer(dto: RegisterCustomerDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const { user, customerId } = await this.withTransaction(async (session) => {
      const created = await this.users.create(
        { email: dto.email, passwordHash, role: Role.CUSTOMER },
        session,
      );
      const profile = await this.customers.create(
        { userId: created._id, firstName: dto.firstName, lastName: dto.lastName },
        session,
      );
      // mirror frontend: every customer gets an empty cart
      await this.cartModel.create([{ customerId: profile._id, items: [] }], { session });
      return { user: created, customerId: profile._id };
    });

    const tokens = await this.issueTokens(user, { customerId: customerId.toString() });
    return {
      ...tokens,
      user: this.publicUser(user, { customerId: customerId.toString(), name: `${dto.firstName} ${dto.lastName}` }),
    };
  }

  async registerSeller(dto: RegisterSellerDto) {
    if (await this.users.existsByEmail(dto.email)) {
      throw new ConflictException(MESSAGES.AUTH.EMAIL_TAKEN);
    }
    const passwordHash = await bcrypt.hash(dto.password, this.saltRounds);

    const { user, sellerId } = await this.withTransaction(async (session) => {
      const created = await this.users.create(
        { email: dto.email, passwordHash, role: Role.SELLER },
        session,
      );
      const profile = await this.sellers.create(
        {
          userId: created._id,
          businessName: dto.businessName,
          contactPerson: dto.contactPerson,
          email: dto.email,
          mobile: dto.mobile,
        },
        session,
      );
      return { user: created, sellerId: profile._id };
    });

    const tokens = await this.issueTokens(user, { sellerId: sellerId.toString() });
    return {
      ...tokens,
      user: this.publicUser(user, {
        sellerId: sellerId.toString(),
        sellerStatus: SellerStatus.PENDING_APPROVAL,
        name: dto.businessName,
      }),
    };
  }

  // ───────────────────────── login ────────────────────────────

  async login(dto: LoginDto) {
    const user = await this.users.findByEmailWithSecret(dto.email);
    // Generic message — never reveal whether the email exists.
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_CREDENTIALS);
    }
    if (!user.isActive) {
      throw new UnauthorizedException(MESSAGES.AUTH.ACCOUNT_DISABLED);
    }

    const extra = await this.resolveProfile(user);
    const tokens = await this.issueTokens(user, extra.claims);
    await this.users.markLoggedIn(user._id);
    return { ...tokens, user: this.publicUser(user, extra.public) };
  }

  // ─────────────────────── refresh / logout ───────────────────

  async refresh(userId: string, presentedToken: string) {
    const user = await this.users.findByIdWithRefresh(userId);
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    const matches = await bcrypt.compare(this.sha256(presentedToken), user.refreshTokenHash);
    if (!matches) {
      // token reuse / theft — revoke everything
      await this.users.setRefreshTokenHash(user._id, null);
      throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    }
    const extra = await this.resolveProfile(user);
    return this.issueTokens(user, extra.claims);
  }

  async logout(userId: string): Promise<void> {
    await this.users.setRefreshTokenHash(userId, null);
  }

  async checkEmail(email: string): Promise<{ exists: boolean }> {
    return { exists: await this.users.existsByEmail(email) };
  }

  async getMe(userId: string) {
    const user = await this.users.findById(userId);
    if (!user) throw new UnauthorizedException(MESSAGES.AUTH.INVALID_TOKEN);
    const extra = await this.resolveProfile(user);
    return this.publicUser(user, extra.public);
  }

  // ───────────────────────── helpers ──────────────────────────

  private async resolveProfile(user: UserDocument): Promise<{
    claims: { customerId?: string; sellerId?: string };
    public: { customerId?: string; sellerId?: string; sellerStatus?: string; name: string };
  }> {
    if (user.role === Role.CUSTOMER) {
      const c = await this.customers.findByUserId(user._id);
      return {
        claims: { customerId: c?._id.toString() },
        public: { customerId: c?._id.toString(), name: c ? `${c.firstName} ${c.lastName}` : user.email },
      };
    }
    if (user.role === Role.SELLER) {
      const s = await this.sellers.findByUserId(user._id);
      return {
        claims: { sellerId: s?._id.toString() },
        public: { sellerId: s?._id.toString(), sellerStatus: s?.status, name: s?.businessName ?? user.email },
      };
    }
    return { claims: {}, public: { name: 'Marketplace Admin' } };
  }

  private async issueTokens(
    user: UserDocument,
    extra: { customerId?: string; sellerId?: string },
  ): Promise<TokenPair> {
    const payload: JwtPayload & { jti: string } = {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      jti: randomUUID(), // unique per issuance so rotated tokens always differ
      ...extra,
    };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.accessSecret'),
      expiresIn: this.config.get<string>('jwt.accessExpiresIn') ?? '15m',
    } as JwtSignOptions);
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn') ?? '7d',
    } as JwtSignOptions);
    // bcrypt only reads the first 72 bytes; JWTs are far longer and share a
    // common prefix, so we SHA-256 the token first to get a fixed-length,
    // fully-distinct input before hashing.
    const refreshHash = await bcrypt.hash(this.sha256(refreshToken), this.saltRounds);
    await this.users.setRefreshTokenHash(user._id, refreshHash);
    return { accessToken, refreshToken };
  }

  private sha256(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  private publicUser(
    user: UserDocument,
    extra: { customerId?: string; sellerId?: string; sellerStatus?: string; name: string },
  ) {
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

  /**
   * Runs `fn` in a transaction when the deployment supports it (replica set),
   * otherwise falls back to a plain (non-atomic) run so dev on a standalone
   * mongod still works.
   */
  private async withTransaction<T>(
    fn: (session?: import('mongoose').ClientSession) => Promise<T>,
  ): Promise<T> {
    const session = await this.connection.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } catch (err) {
      const msg = (err as Error).message ?? '';
      const noRs =
        msg.includes('Transaction numbers') ||
        msg.includes('replica set') ||
        msg.includes('not supported');
      if (noRs) {
        return fn(undefined); // standalone fallback
      }
      throw err;
    } finally {
      await session.endSession();
    }
  }
}


