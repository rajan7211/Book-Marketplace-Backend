import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { MESSAGES } from '../constants';
import { ApiErrorResponse } from '../interfaces';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      let message = exception.message;
      let details: unknown;

      if (typeof payload === 'object' && payload !== null) {
        const p = payload as Record<string, unknown>;
        if (Array.isArray(p.message)) {
          details = p.message;
          message = MESSAGES.VALIDATION.FAILED;
        } else if (typeof p.message === 'string') {
          message = p.message;
        }
        if (p.details) details = p.details;
      }

      if (status >= 500) {
        this.logger.error(`${request.method} ${request.url} -> ${status}: ${message}`);
      } else {
        this.logger.warn(`${request.method} ${request.url} -> ${status}: ${message}`);
      }
      response.status(status).json(this.buildBody(status, message, request.url, details));
      return;
    }

    const status = HttpStatus.INTERNAL_SERVER_ERROR;
    const err = exception as Error;
    this.logger.error(`${request.method} ${request.url} -> ${status}: ${err?.message ?? 'Unknown'}`, err?.stack);
    response.status(status).json(this.buildBody(status, MESSAGES.COMMON.INTERNAL_ERROR, request.url));
  }

  private buildBody(status: number, message: string, path: string, details?: unknown): ApiErrorResponse {
    return { success: false, statusCode: status, message, ...(details ? { details } : {}), path, timestamp: new Date().toISOString() };
  }
}
