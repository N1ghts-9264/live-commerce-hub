import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';

export interface JwtPayload {
  employee_id: string;
  roles: string[];
}

export function authenticate(req: Request, res: Response, next: NextFunction) {
  let token: string | undefined;

  // Support Bearer token from header or token query param (for SSE)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.query.token as string) {
    token = req.query.token as string;
  }

  if (!token) {
    return res.status(401).json({ message: '未提供认证令牌' });
  }

  try {
    const payload = jwt.verify(token, config.jwt.secret) as JwtPayload;
    (req as any).user = payload;
    next();
  } catch {
    return res.status(401).json({ message: '认证令牌无效或已过期' });
  }
}

export function authorize(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user as JwtPayload;
    if (!user) {
      return res.status(401).json({ message: '未认证' });
    }
    const hasRole = user.roles.some((r) => roles.includes(r));
    if (!hasRole) {
      return res.status(403).json({ message: '权限不足' });
    }
    next();
  };
}
