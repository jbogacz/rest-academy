import { Request } from 'express';

export type SortOrder = 'asc' | 'desc';

export interface SortParams {
  field: string;
  order: SortOrder;
}

export function parseSort(req: Request, allowedFields: string[]): SortParams | null {
  const sortBy = req.query.sortBy as string;
  const order = (req.query.order as string)?.toLowerCase();

  if (!sortBy || !allowedFields.includes(sortBy)) return null;

  return {
    field: sortBy,
    order: order === 'desc' ? 'desc' : 'asc',
  };
}

export function sortItems<T>(items: T[], sort: SortParams | null): T[] {
  if (!sort) return items;

  return [...items].sort((a, b) => {
    const aVal = (a as Record<string, unknown>)[sort.field];
    const bVal = (b as Record<string, unknown>)[sort.field];

    if (aVal === bVal) return 0;
    if (aVal === null || aVal === undefined) return 1;
    if (bVal === null || bVal === undefined) return -1;

    let comparison: number;
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      comparison = aVal.localeCompare(bVal);
    } else {
      comparison = (aVal as number) < (bVal as number) ? -1 : 1;
    }

    return sort.order === 'desc' ? -comparison : comparison;
  });
}

export function parseDateRange(req: Request): { from?: Date; to?: Date } {
  const from = req.query.from ? new Date(req.query.from as string) : undefined;
  const to = req.query.to ? new Date(req.query.to as string) : undefined;

  return {
    from: from && !isNaN(from.getTime()) ? from : undefined,
    to: to && !isNaN(to.getTime()) ? to : undefined,
  };
}
