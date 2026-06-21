import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // Route Nest logs through Winston
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));
  const logger = new Logger('Bootstrap');

  const config = app.get(ConfigService);
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

  app.use(helmet());
  app.use(compression());

  // Validation is owned by per-route Joi pipes (JoiValidationPipe).
  // We keep a global pipe ONLY for light transformation, with whitelist
  // disabled so it never conflicts with Joi-validated payloads.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: false,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  app.useGlobalInterceptors(
    new LoggingInterceptor(),
    new ResponseInterceptor(app.get(Reflector)),
  );
  app.useGlobalFilters(new AllExceptionsFilter(), new HttpExceptionFilter());

  app.setGlobalPrefix(apiPrefix);

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
  logger.log(`Application: http://localhost:${port}/${apiPrefix}`);
  logger.log(`Swagger:     http://localhost:${port}/${apiPrefix}/docs`);
  logger.log(`Environment: ${nodeEnv}`);
}

void bootstrap();



