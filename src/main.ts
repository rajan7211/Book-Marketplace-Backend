import { NestFactory, Reflector } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor, LoggingInterceptor } from './common/interceptors';
import { AllExceptionsFilter } from './common/filters';
import { JwtAuthGuard } from './common/guards';
import { UsersRepository } from './modules/users/users.repository';
import { seedAdmin } from './database/seeds/admin.seed';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  const logger = new Logger('Bootstrap');
  const config = app.get(ConfigService);

  // ───── Seed admin user (idempotent, opt-in via env) ─────
  await seedAdmin(config, app.get(UsersRepository));

  const port = config.get<number>('app.port') ?? 4000;
  const nodeEnv = config.get<string>('app.nodeEnv') ?? 'development';
  const apiPrefix = config.get<string>('app.apiPrefix') ?? 'api';
  const corsOrigins = config.get<string[]>('app.corsOrigins') ?? ['http://localhost:5173'];

  app.enableCors({
    origin: corsOrigins,
    credentials: true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    allowedHeaders: 'Content-Type, Authorization',
  });

  app.setGlobalPrefix(apiPrefix);

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseEnvelopeInterceptor(app.get(Reflector)),
  );

  app.useGlobalFilters(new AllExceptionsFilter());

  app.useGlobalGuards(new JwtAuthGuard(app.get(Reflector)));

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Book Marketplace API')
    .setDescription('Multi-vendor Book Marketplace backend API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup(`${apiPrefix}/docs`, app, document, {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(port);

  logger.log(`Application:  http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger:      http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`Environment:  ${nodeEnv}`);
}

void bootstrap();
