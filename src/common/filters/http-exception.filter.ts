import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { MESSAGES } from '../constants';
import { ApiErrorResponse } from '../interfaces';

function buildBody(
  status: number,
  message: string,
  path: string,
  details?: unknown,
): ApiErrorResponse {
  return {
    success: false,
    statusCode: status,
    message,
    ...(details ? { details } : {}),
    path,
    timestamp: new Date().toISOString(),
  };
}

/** Handles all thrown HttpExceptions and normalizes them to the error envelope. */
@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('HttpException');

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();
    const status = exception.getStatus();
    const payload = exception.getResponse();

    let message: string = exception.message;
    let details: unknown;

    if (typeof payload === 'object' && payload !== null) {
      const p = payload as Record<string, unknown>;
      message = (p.message as string) ?? message;
      // class-validator returns message as string[]; surface it as details
      if (Array.isArray(p.message)) {
        details = p.message;
        message = MESSAGES.VALIDATION.FAILED;
      }
      if (p.details) details = p.details;
    }

    if (status >= 500) {
      this.logger.error(`${req.method} ${req.url} -> ${status}: ${message}`);
    } else {
      this.logger.warn(`${req.method} ${req.url} -> ${status}: ${message}`);
    }

    res.status(status).json(buildBody(status, message, req.url, details));
  }
}

/** Catch-all for non-HttpException errors (unexpected 500s). */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('UnhandledException');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    // Let HttpExceptionFilter own HttpExceptions
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      res.status(status).json(buildBody(status, exception.message, req.url));
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const err = exception as Error;
    this.logger.error(`${req.method} ${req.url} -> ${status}: ${err?.message}`, err?.stack);

    res.status(status).json(buildBody(status, MESSAGES.COMMON.INTERNAL_ERROR, req.url));
  }
}
