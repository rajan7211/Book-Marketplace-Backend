import { Logger, Module } from '@nestjs/common';
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
          connectionFactory: (connection) => {
            connection.on('connected', () => logger.log('MongoDB connected'));
            connection.on('disconnected', () => logger.warn('MongoDB disconnected'));
            connection.on('error', (err: Error) => logger.error('MongoDB connection error', err.stack));
            return connection;
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
