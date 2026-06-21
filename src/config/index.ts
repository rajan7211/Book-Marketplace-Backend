/**
 * Config barrel. app.module.ts loads these namespaced configs.
 * Access at runtime via configService.get('app.port'), etc.
 */
export { default as appConfig } from './app.config';
export { default as databaseConfig } from './database.config';
export { default as jwtConfig } from './jwt.config';
export { default as redisConfig } from './redis.config';
export { default as mailConfig } from './mail.config';
export { envValidationSchema } from './env.validation';
