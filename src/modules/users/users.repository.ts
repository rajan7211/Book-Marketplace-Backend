import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../../common/enums';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly model: Model<UserDocument>,
  ) {}

  async existsByEmail(email: string): Promise<boolean> {
    const found = await this.model.exists({ email: email.toLowerCase() });
    return found !== null;
  }

  async create(input: {
    email: string;
    passwordHash: string;
    role: Role;
  }): Promise<UserDocument> {
    const [doc] = await this.model.create([
      {
        email: input.email.toLowerCase(),
        passwordHash: input.passwordHash,
        role: input.role,
      },
    ]);
    return doc;
  }



  // async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {

  // /** Find user by email (no passwordHash). */
  // async findByEmail(email: string): Promise<UserDocument | null> {
  //   return this.model.findOne({ email: email.toLowerCase() }).exec();
  // }
  //   return this.model.findById(id).exec();
  // }

  
async findById(id: string | Types.ObjectId): Promise<UserDocument | null> {
  return this.model.findById(id).exec();
}


  /** Find user by email. Does NOT return passwordHash (select: false). */
  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.model.findOne({ email: email.toLowerCase() }).exec();
  }

  /** Opt-in to passwordHash — used for credential verification. */
  async findByEmailWithSecret(email: string): Promise<UserDocument | null> {
    return this.model
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash')
      .exec();
  }

  /** Opt-in to passwordHash by user id — used for change-password. */
  async findByIdWithPassword(
    id: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.model.findById(id).select('+passwordHash').exec();
  }

  async findByIdWithRefresh(
    id: string | Types.ObjectId,
  ): Promise<UserDocument | null> {
    return this.model.findById(id).select('+refreshTokenHash').exec();
  }

  async setRefreshTokenHash(
    userId: string | Types.ObjectId,
    hash: string | null,
  ): Promise<void> {
    await this.model
      .updateOne({ _id: userId }, { $set: { refreshTokenHash: hash } })
      .exec();
  }

  async markLoggedIn(userId: string | Types.ObjectId): Promise<void> {
    await this.model
      .updateOne({ _id: userId }, { $set: { lastLoginAt: new Date() } })
      .exec();
  }

  /**
   * Update the password hash AND clear the refresh token in one go.
   * Used by reset-password and change-password — invalidating the refresh
   * forces all existing sessions to re-login.
   */
  async updatePasswordAndRevokeSessions(
    userId: string | Types.ObjectId,
    newPasswordHash: string,
  ): Promise<void> {
    await this.model
      .updateOne(
        { _id: userId },
        {
          $set: { passwordHash: newPasswordHash },
          $unset: { refreshTokenHash: '' },
        },
      )
      .exec();
  }
}
