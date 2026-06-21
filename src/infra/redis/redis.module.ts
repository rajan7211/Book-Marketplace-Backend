import { Global, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { REDIS_CLIENT, RedisService } from './redis.service';

/**
 * Global Redis module. Lazily creates an ioredis client only when
 * REDIS_ENABLED=true; otherwise provides null and RedisService no-ops.
 * ioredis is imported dynamically so the dep is optional at dev time.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: async (config: ConfigService) => {
        const logger = new Logger('Redis');
        const enabled = config.get<boolean>('redis.enabled');
        if (!enabled) {
          logger.warn('Redis disabled (REDIS_ENABLED=false) — caching is a no-op');
          return null;
        }
        try {
          const { default: IORedis } = await import('ioredis');
          const client = new IORedis({
            host: config.get<string>('redis.host'),
            port: config.get<number>('redis.port'),
            password: config.get<string>('redis.password'),
            maxRetriesPerRequest: 2,
            lazyConnect: false,
          });
          client.on('connect', () => logger.log('Redis connected'));
          client.on('error', (e: Error) => logger.error(`Redis error: ${e.message}`));
          return client;
        } catch (e) {
          logger.error(`Failed to init Redis, falling back to no-op: ${(e as Error).message}`);
          return null;
        }
      },
    },
    RedisService,
  ],
  exports: [RedisService],
})
export class RedisModule {}
