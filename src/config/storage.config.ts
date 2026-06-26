import { registerAs } from '@nestjs/config';

export default registerAs('storage', () => ({
  maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '5', 10),
  allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'],
}));
