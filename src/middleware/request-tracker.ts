import { Request, Response, NextFunction } from 'express';

interface TrackedRequest {
  method: string;
  path: string;
  statusCode: number;
  timestamp: string;
  contentType?: string;
  headers: Record<string, string>;
}

const requestHistory: TrackedRequest[] = [];
const MAX_HISTORY = 500;

export function requestTracker(req: Request, res: Response, next: NextFunction): void {
  // Skip tracking swagger-ui and internal requests
  const fullPath = req.baseUrl + req.path;
  if (fullPath.startsWith('/api-docs') || fullPath === '/openapi.json') {
    next();
    return;
  }

  const originalJson = res.json;
  let tracked = false;

  res.json = function (body: unknown) {
    if (!tracked) {
      tracked = true;
      recordRequest(req, res);
    }
    return originalJson.call(this, body);
  };

  // Also track non-json responses (like 204 No Content)
  const originalEnd = res.end;
  res.end = function (...args: unknown[]) {
    if (!tracked) {
      tracked = true;
      recordRequest(req, res);
    }
    return (originalEnd as Function).apply(this, args);
  };

  next();
}

function recordRequest(req: Request, res: Response): void {
  // Use baseUrl + path to get full route (req.path is relative to mount point)
  // Normalize trailing slash
  const raw = req.baseUrl + req.path;
  const fullPath = raw.length > 1 && raw.endsWith('/') ? raw.slice(0, -1) : raw;
  const entry: TrackedRequest = {
    method: req.method,
    path: fullPath,
    statusCode: res.statusCode,
    timestamp: new Date().toISOString(),
    contentType: req.headers['content-type'],
    headers: req.headers as Record<string, string>,
  };

  requestHistory.push(entry);
  if (requestHistory.length > MAX_HISTORY) {
    requestHistory.shift();
  }
}

export function getRequestHistory(): TrackedRequest[] {
  return [...requestHistory];
}

export function hasHitEndpoint(method: string, pathPattern: string): boolean {
  return requestHistory.some(
    (r) => r.method === method.toUpperCase() && new RegExp(pathPattern).test(r.path)
  );
}

export function hasReceivedStatus(statusCode: number): boolean {
  return requestHistory.some((r) => r.statusCode === statusCode);
}

export function hasUsedContentType(contentType: string): boolean {
  return requestHistory.some(
    (r) => r.contentType && r.contentType.includes(contentType)
  );
}

export function hasUsedHeader(headerName: string): boolean {
  return requestHistory.some(
    (r) => r.headers[headerName.toLowerCase()] !== undefined
  );
}

export function clearHistory(): void {
  requestHistory.length = 0;
}
