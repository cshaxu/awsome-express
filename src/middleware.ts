import { NextFunction, Request, Response } from 'express';
import createHttpError, { HttpError } from 'http-errors';

export function setTimeout(timeout: number) {
  return (_req: Request, res: Response, next: NextFunction) => {
    res.setTimeout(timeout * 1000, () =>
      res.status(504).send('Request timed out.'),
    );
    next();
  };
}

export function endRoute(req: Request, _res: Response, next: NextFunction) {
  next(createHttpError.NotFound(`NotFoundError: invalid path ${req.path}`));
}

export function catchError(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = getErrorCode(err, res);
  res.status(statusCode);
  console.error(err);
  res.json(err);
  res.end();
}

function getErrorCode(err: Error, res: Response): number {
  if (err instanceof HttpError) {
    return (err as HttpError).statusCode;
  }
  return res.statusCode === 200 ? 500 : res.statusCode;
}
