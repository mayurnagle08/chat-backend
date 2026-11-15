import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { HttpError } from '../utils/errors';

interface JwtPayload {
  sub: string;
  email: string;
}

export const requireAuth: RequestHandler = (req, _res, next) => {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Bearer token is required'));
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    if (!payload.sub || !payload.email) throw new Error('Invalid token payload');
    req.authUser = { userId: payload.sub, email: payload.email };
    return next();
  } catch {
    return next(new HttpError(401, 'Invalid or expired token'));
  }
};
