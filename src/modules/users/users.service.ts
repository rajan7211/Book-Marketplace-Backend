import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './repository/users.repository';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from './schemas/user.schema';
import { UserMessages } from '../../common/constants/user-messages.constant';
import { AuthMessages } from '../../common/constants/auth-messages.constant';
import { BcryptUtil } from '../../common/utils/bcrypt.util';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async create(createUserDto: CreateUserDto): Promise<User> {
    try {
      const existingUser = await this.usersRepository.findByEmail(createUserDto.email);
      if (existingUser) {
        throw new ConflictException(UserMessages.EMAIL_ALREADY_EXISTS);
      }

      const hashedPassword = await BcryptUtil.hashPassword(createUserDto.password);
      const user = await this.usersRepository.create({
        ...createUserDto,
        password: hashedPassword,
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  async findAll(): Promise<User[]> {
    try {
      return await this.usersRepository.findAll();
    } catch (error) {
      throw error;
    }
  }

  async findById(id: string): Promise<User> {
    try {
      return await this.usersRepository.findById(id);
    } catch (error) {
      throw error;
    }
  }

  async findByEmail(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findByEmail(email);
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findByEmailWithPassword(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findByEmailWithPassword(email);
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async findByEmailWithToken(email: string): Promise<User> {
    try {
      const user = await this.usersRepository.findByEmailWithToken(email);
      if (!user) {
        throw new NotFoundException(UserMessages.USER_NOT_FOUND);
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto): Promise<User> {
    try {
      if (updateUserDto.password) {
        updateUserDto.password = await BcryptUtil.hashPassword(updateUserDto.password);
      }
      return await this.usersRepository.update(id, updateUserDto);
    } catch (error) {
      throw error;
    }
  }

  async updateRefreshToken(id: string, refreshToken: string | null): Promise<void> {
    try {
      await this.usersRepository.updateRefreshToken(id, refreshToken);
    } catch (error) {
      throw error;
    }
  }

  async delete(id: string): Promise<void> {
    try {
      await this.usersRepository.delete(id);
    } catch (error) {
      throw error;
    }
  }
}
