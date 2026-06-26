import { registerAs } from '@nestjs/config';

export default registerAs('mail', () => {
  const user = process.env.MAIL_USER || undefined;
  const password = process.env.MAIL_PASSWORD || undefined;
  return {
    host: process.env.MAIL_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.MAIL_PORT ?? '587', 10),
    user,
    password,
    from: process.env.MAIL_FROM ?? 'Book Marketplace <no-reply@bookmarketplace.com>',
    enabled: Boolean(user && password),
  };
});
