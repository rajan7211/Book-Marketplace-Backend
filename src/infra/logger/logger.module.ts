import { Global, Module } from '@nestjs/common';
import { WinstonModule } from 'nest-winston';
import { winstonConfig } from './winston.config';

@Global()
@Module({ imports: [WinstonModule.forRoot(winstonConfig)] })
export class LoggerModule {}
