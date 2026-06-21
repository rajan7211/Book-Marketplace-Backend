import { WinstonModuleOptions } from 'nest-winston';
import * as winston from 'winston';

export function buildWinstonOptions(nodeEnv: string): WinstonModuleOptions {
  const isProd = nodeEnv === 'production';

  const consoleFormat = isProd
    ? winston.format.combine(winston.format.timestamp(), winston.format.json())
    : winston.format.combine(
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context }) => {
          return `${timestamp as string} [${(context as string) ?? 'App'}] ${level}: ${message as string}`;
        }),
      );

  const transports: winston.transport[] = [
    new winston.transports.Console({ format: consoleFormat }),
  ];

  if (isProd) {
    transports.push(
      new winston.transports.File({
        filename: 'logs/error.log',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
      new winston.transports.File({
        filename: 'logs/combined.log',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
      }),
    );
  }

  return { level: isProd ? 'info' : 'debug', transports };
}
