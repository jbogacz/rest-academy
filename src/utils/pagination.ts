import { Request } from 'express';
import { PaginationParams } from '../models/types';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export function parsePagination(req: Request): PaginationParams {
  let limit = parseInt(req.query.limit as string, 10);
  let offset = parseInt(req.query.offset as string, 10);

  if (isNaN(limit) || limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  if (isNaN(offset) || offset < 0) offset = 0;

  return { limit, offset };
}

export function paginate<T>(items: T[], params: PaginationParams): { items: T[]; total: number } {
  const total = items.length;
  const sliced = items.slice(params.offset, params.offset + params.limit);
  return { items: sliced, total };
}
