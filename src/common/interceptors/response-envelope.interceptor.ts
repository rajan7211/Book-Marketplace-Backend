import { CallHandler, ExecutionContext, Injectable, NestInterceptor, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponse, PaginatedResult } from '../interfaces';
import { MESSAGES } from '../constants';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';
export const ResponseMessage = (message: string) => SetMetadata(RESPONSE_MESSAGE_KEY, message);

function isPaginated<T>(value: unknown): value is PaginatedResult<T> {
  return typeof value === 'object' && value !== null && Array.isArray((value as PaginatedResult<T>).data) && 'meta' in (value as PaginatedResult<T>);
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const response = context.switchToHttp().getResponse<Response>();
    const statusCode = response.statusCode;
    const customMessage = this.reflector?.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [context.getHandler(), context.getClass()]);

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        if (isPaginated<T>(payload)) {
          return { success: true, statusCode, message: customMessage ?? MESSAGES.COMMON.OK, data: payload.data as unknown as T, meta: payload.meta, timestamp: new Date().toISOString() };
        }
        return { success: true, statusCode, message: customMessage ?? MESSAGES.COMMON.OK, data: payload, timestamp: new Date().toISOString() };
      }),
    );
  }
}
