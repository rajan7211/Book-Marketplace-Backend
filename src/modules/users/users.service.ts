import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClientSession, Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../../common/enums';

interface CreateUserInput {
  email: string;
  passwordHash: string;
  role: Role;
}

/**
 * Owns the User collection (auth identity).
 * No HTTP controller — consumed by AuthService and admin queries.
 */
@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private readonly userModel: Model<UserDocument>) {}

  /** Email lookup WITHOUT the password (default projection). */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Email lookup WITH passwordHash for credential verification. */
  async findByEmailWithSecret(email: string): Promise<UserDocument | null> {
    return this.userModel
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findByIdWithRefresh(id: string | Types.ObjectId): Promise<UserDocument | null> {
    return this.userModel.findById(id).select('+refreshTokenHash').exec();
  }

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.userModel.exists({ email: email.toLowerCase() });
    return found !== null;
  }

  async create(input: CreateUserInput, session?: ClientSession): Promise<UserDocument> {
    const docs = await this.userModel.create(
      [{ email: input.email.toLowerCase(), passwordHash: input.passwordHash, role: input.role }],
      session ? { session } : {},
    );
    return docs[0];
  }

  async setRefreshTokenHash(
    userId: string | Types.ObjectId,
    hash: string | null,
  ): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { refreshTokenHash: hash } }).exec();
  }

  async markLoggedIn(userId: string | Types.ObjectId): Promise<void> {
    await this.userModel.updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } }).exec();
  }

  async countAll(): Promise<number> {
    return this.userModel.countDocuments().exec();
  }
}
