import * as Joi from 'joi';

export const envValidationSchema = Joi.object({
  // ───── General ─────
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

  // ───── Database (REQUIRED) ─────
  MONGODB_URI: Joi.string().required(),

  // ───── JWT (REQUIRED, strong secrets) ─────
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // ───── Redis (OPTIONAL) ─────
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_ENABLED: Joi.boolean().default(false),

  // ───── Mail (OPTIONAL) ─────
  MAIL_HOST: Joi.string().default('smtp.gmail.com'),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().default('Book Marketplace <no-reply@bookmarketplace.com>'),

  // ───── Admin seed (OPTIONAL — set both to enable) ─────
  ADMIN_SEED_EMAIL: Joi.string().email().lowercase().trim().optional(),
  ADMIN_SEED_PASSWORD: Joi.string().min(8).optional(),

  // ───── Cloudinary (image upload) ─────
  CLOUDINARY_CLOUD_NAME: Joi.string().allow('').optional(),
  CLOUDINARY_API_KEY: Joi.string().allow('').optional(),
  CLOUDINARY_API_SECRET: Joi.string().allow('').optional(),

  // ───── bcrypt ─────
  BCRYPT_SALT_ROUNDS: Joi.number().default(10),
});
