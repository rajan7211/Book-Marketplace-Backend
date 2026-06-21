import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => ({
  host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
  port: parseInt(process.env.MAIL_PORT ?? '587', 10),
  user: process.env.MAIL_USER || undefined,
  password: process.env.MAIL_PASSWORD || undefined,
  from: process.env.MAIL_FROM ?? 'Book Marketplace <no-reply@bookmarketplace.com>',
  enabled: Boolean(process.env.MAIL_USER && process.env.MAIL_PASSWORD),
}));
