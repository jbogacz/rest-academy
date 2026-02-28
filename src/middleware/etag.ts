import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';

export function etagHandler(req: Request, res: Response, next: NextFunction): void {
  const originalJson = res.json.bind(res);

  res.json = function (body: unknown) {
    const content = JSON.stringify(body);
    const hash = crypto.createHash('md5').update(content).digest('hex');
    const etag = `"${hash}"`;

    res.setHeader('ETag', etag);

    const ifNoneMatch = req.headers['if-none-match'];
    if (ifNoneMatch === etag) {
      res.status(304).end();
      return res;
    }

    return originalJson(body);
  };

  next();
}
