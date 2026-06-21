import * as Joi from 'joi';

/**
 * Joi schema for process.env. Validated at boot by ConfigModule (forRoot).
 * Fail-fast: the app refuses to start if a required secret is missing.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  PORT: Joi.number().default(4000),
  API_PREFIX: Joi.string().default('api'),
  CORS_ORIGINS: Joi.string().default('http://localhost:5173'),

  // Database
  MONGODB_URI: Joi.string().required(),

  // JWT
  JWT_ACCESS_SECRET: Joi.string().min(16).required(),
  JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),
  JWT_REFRESH_SECRET: Joi.string().min(16).required(),
  JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

  // Redis (optional in dev — app degrades gracefully when absent)
  REDIS_HOST: Joi.string().default('127.0.0.1'),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().allow('').optional(),
  REDIS_ENABLED: Joi.boolean().default(false),

  // Mail (Gmail SMTP) — required only when notifications are enabled
  MAIL_HOST: Joi.string().default('smtp.gmail.com'),
  MAIL_PORT: Joi.number().default(587),
  MAIL_USER: Joi.string().allow('').optional(),
  MAIL_PASSWORD: Joi.string().allow('').optional(),
  MAIL_FROM: Joi.string().default('Book Marketplace <no-reply@bookmarketplace.com>'),

  // bcrypt
  BCRYPT_SALT_ROUNDS: Joi.number().default(10),
});
