import { PAGINATION } from '../constants';
import { PaginatedResult, PaginationMeta } from '../interfaces';

export interface PaginationInput {
  page?: number;
  limit?: number;
}

/** Normalize page/limit and compute skip. */
export function resolvePagination(input: PaginationInput): {
  page: number;
  limit: number;
  skip: number;
} {
  const page = Math.max(1, Math.trunc(input.page ?? PAGINATION.DEFAULT_PAGE));
  const limit = Math.min(
    PAGINATION.MAX_LIMIT,
    Math.max(1, Math.trunc(input.limit ?? PAGINATION.DEFAULT_LIMIT)),
  );
  return { page, limit, skip: (page - 1) * limit };
}

export function buildMeta(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}

export function paginate<T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResult<T> {
  return { data, meta: buildMeta(page, limit, total) };
}
