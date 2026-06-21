export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Uniform success envelope produced by ResponseInterceptor. */
export interface ApiResponse<T> {
  success: true;
  statusCode: number;
  message: string;
  data: T;
  meta?: PaginationMeta;
  timestamp: string;
}

/** Uniform error envelope produced by the exception filters. */
export interface ApiErrorResponse {
  success: false;
  statusCode: number;
  message: string;
  details?: unknown;
  path: string;
  timestamp: string;
}

/** Returned by services for paginated lists; the interceptor lifts `meta` into the envelope. */
export interface PaginatedResult<T> {
  data: T[];
  meta: PaginationMeta;
}
