import type { NextFunction, Request, Response, RequestHandler } from 'express';

type AsyncController = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export const asyncHandler = (fn: AsyncController): RequestHandler =>
  (req, res, next) => { void fn(req, res, next).catch(next); };
