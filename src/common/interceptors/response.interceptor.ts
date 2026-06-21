import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Response } from 'express';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SetMetadata } from '@nestjs/common';
import { ApiResponse, PaginatedResult } from '../interfaces';
import { MESSAGES } from '../constants';

export const RESPONSE_MESSAGE_KEY = 'responseMessage';
/** Override the default envelope message: @ResponseMessage('Login successful') */
export const ResponseMessage = (message: string) =>
  SetMetadata(RESPONSE_MESSAGE_KEY, message);

function isPaginated<T>(v: unknown): v is PaginatedResult<T> {
  return (
    typeof v === 'object' &&
    v !== null &&
    'data' in v &&
    'meta' in v &&
    Array.isArray((v as PaginatedResult<T>).data)
  );
}

/** Wraps every successful response in the uniform ApiResponse envelope. */
@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  constructor(private readonly reflector?: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<ApiResponse<T>> {
    const res = context.switchToHttp().getResponse<Response>();
    const statusCode = res.statusCode;
    const customMessage = this.reflector?.getAllAndOverride<string>(RESPONSE_MESSAGE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    return next.handle().pipe(
      map((payload): ApiResponse<T> => {
        if (isPaginated<T>(payload)) {
          return {
            success: true,
            statusCode,
            message: customMessage ?? MESSAGES.COMMON.OK,
            data: payload.data as unknown as T,
            meta: payload.meta,
            timestamp: new Date().toISOString(),
          };
        }
        return {
          success: true,
          statusCode,
          message: customMessage ?? MESSAGES.COMMON.OK,
          data: payload,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }
}
