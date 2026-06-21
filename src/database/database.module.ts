import { Module, Logger } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('MongoDB');
        return {
          uri: config.get<string>('database.uri'),
          // Recommended Mongoose 8 defaults
          autoIndex: config.get<string>('app.nodeEnv') !== 'production',
          connectionFactory: (connection: { on: (e: string, cb: (...a: unknown[]) => void) => void }) => {
            connection.on('connected', () => logger.log('MongoDB connected'));
            connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
            connection.on('error', (err: unknown) =>
              logger.error('MongoDB connection error', err as string),
            );
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
