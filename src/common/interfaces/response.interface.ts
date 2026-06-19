export interface ApiResponse<T = unknown> {
  statusCode: number;
  message: string;
  data?: T;
  error?: string;
}

export interface ApiErrorResponse {
  statusCode: number;
  message: string | string[];
  error: string;
  timestamp: string;
  path: string;
}
