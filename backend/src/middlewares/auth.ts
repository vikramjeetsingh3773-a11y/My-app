import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger';

const logger = Logger.getInstance();

export interface AuthRequest extends Request {
  userId?: string;
  user?: any;
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
    req.userId = (decoded as any).userId;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      return res.status(401).json({
        success: false,
        message: 'Token expired'
      });
    }
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token'
      });
    }
    logger.error('Auth middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
};

export const adminMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'No authentication token provided'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret') as any;
    
    if (decoded.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.userId = decoded.userId;
    req.user = decoded;
    next();
  } catch (error) {
    logger.error('Admin middleware error:', error);
    res.status(401).json({
      success: false,
      message: 'Unauthorized'
    });
  }
};

export const optionalAuthMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const token = extractToken(req);

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
      req.userId = (decoded as any).userId;
      req.user = decoded;
    }

    next();
  } catch (error) {
    // Invalid token is okay, continue without auth
    next();
  }
};

function extractToken(req: AuthRequest): string | null {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

export function generateToken(userId: string, role: string = 'user'): string {
  return jwt.sign(
    {
      userId,
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET || 'your-secret',
    {
      expiresIn: process.env.JWT_EXPIRY || '24h'
    }
  );
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    {
      userId,
      type: 'refresh'
    },
    process.env.JWT_REFRESH_SECRET || 'your-refresh-secret',
    {
      expiresIn: process.env.JWT_REFRESH_EXPIRY || '7d'
    }
  );
}

export function verifyRefreshToken(token: string): any {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET || 'your-refresh-secret');
}
