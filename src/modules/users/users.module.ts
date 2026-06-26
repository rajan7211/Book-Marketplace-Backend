import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './schemas/user.schema';
import { UsersRepository } from './users.repository';

/**
 * UsersModule.
 *
 * Owns the User collection. Exposes UsersRepository so other modules
 * (AuthModule) can create users without touching Mongoose directly.
 */
@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
  ],
  providers: [UsersRepository],
  exports: [UsersRepository, MongooseModule],
})
export class UsersModule {}
