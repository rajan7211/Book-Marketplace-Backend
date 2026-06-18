import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import databaseConfig from './config/database.config';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig],
      envFilePath: '.env',
    }),

    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],

      useFactory: async (configService: ConfigService) => {
        const uri = await Promise.resolve(
          configService.get<string>('database.uri'),
        );
        console.log('Connecting to MongoDB...');
        return {
          uri,
          retryWrites: true,
          w: 'majority',
        };
      },
    }),
  ],

  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
