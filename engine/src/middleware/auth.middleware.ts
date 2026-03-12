import { Request, Response, NextFunction } from 'express';
import { authService } from '../services/auth.service.js';

/**
 * Middleware to authenticate requests using JWT token
 */
export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        error: 'Missing or invalid Authorization header',
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token
    const userId = authService.verifyToken(token);

    // Attach user ID to request
    (req as any).userId = userId;

    return next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
    });
  }
}
