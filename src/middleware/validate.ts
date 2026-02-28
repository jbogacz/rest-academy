import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../models/errors';

type ValidatorFn = (body: Record<string, unknown>) => string | null;

export function validate(...validators: ValidatorFn[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    for (const validator of validators) {
      const error = validator(req.body);
      if (error) {
        next(new ValidationError(error));
        return;
      }
    }
    next();
  };
}

export function required(...fields: string[]): ValidatorFn {
  return (body: Record<string, unknown>) => {
    const missing = fields.filter((f) => body[f] === undefined || body[f] === null || body[f] === '');
    if (missing.length > 0) {
      return `Missing required fields: ${missing.join(', ')}`;
    }
    return null;
  };
}

export function isOneOf(field: string, values: string[]): ValidatorFn {
  return (body: Record<string, unknown>) => {
    if (body[field] !== undefined && !values.includes(body[field] as string)) {
      return `Field '${field}' must be one of: ${values.join(', ')}`;
    }
    return null;
  };
}

export function isPositiveNumber(field: string): ValidatorFn {
  return (body: Record<string, unknown>) => {
    if (body[field] !== undefined) {
      const val = body[field];
      if (typeof val !== 'number' || val <= 0 || isNaN(val)) {
        return `Field '${field}' must be a positive number`;
      }
    }
    return null;
  };
}

export function isString(field: string): ValidatorFn {
  return (body: Record<string, unknown>) => {
    if (body[field] !== undefined && typeof body[field] !== 'string') {
      return `Field '${field}' must be a string`;
    }
    return null;
  };
}
