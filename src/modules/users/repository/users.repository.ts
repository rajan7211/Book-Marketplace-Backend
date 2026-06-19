import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../schemas/user.schema';
import { CreateUserDto } from '../dto/create-user.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { UserMessages } from '../../../common/constants/user-messages.constant';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectModel(User.name) private readonly userModel: Model<UserDocument>,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const user = new this.userModel(createUserDto);
      return await user.save();
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.userModel.find().exec();
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException(UserMessages.INVALID_USER_ID);
      }
      const user = await this.userModel.findById(id).exec();
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    } catch (error) {
      throw error;
    }
  }

  async findByEmailWithPassword(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email: email.toLowerCase() }).select('+password').exec();
    } catch (error) {
      throw error;
    }
  }

  async findByEmailWithToken(email: string): Promise<UserDocument | null> {
    try {
      return await this.userModel.findOne({ email: email.toLowerCase() }).select('+password +refreshToken').exec();
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException(UserMessages.INVALID_USER_ID);
      }
      const user = await this.userModel.findByIdAndUpdate(id, updateUserDto, { new: true }).exec();
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    try {
      await this.userModel.findByIdAndUpdate(id, { refreshToken }).exec();
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      if (!Types.ObjectId.isValid(id)) {
        throw new NotFoundException(UserMessages.INVALID_USER_ID);
      }
      const result = await this.userModel.findByIdAndDelete(id).exec();
      if (!result) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
    } catch (error) {
      throw error;
    }
  }
}
