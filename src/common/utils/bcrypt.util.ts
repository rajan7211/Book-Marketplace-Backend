import * as bcrypt from 'bcrypt';
import { AuthMessages } from '../constants/auth-messages.constant';

const SALT_ROUNDS = 10;

export class BcryptUtil {
  static async hashPassword(password: string): Promise<string> {
    try {
      return await bcrypt.hash(password, SALT_ROUNDS);
    } catch (error) {
      throw new Error(AuthMessages.PASSWORD_HASH_ERROR);
    }
  }

  static async comparePassword(
    password: string,
    hashedPassword: string,
  ): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hashedPassword);
    } catch (error) {
      return false;
    }
  }
}
