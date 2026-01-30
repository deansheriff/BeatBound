import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { db } from '../config/database.js';
import { users } from '@beatbound/database';
import { eq } from 'drizzle-orm';

export interface AuthUser {
    id: string;
    email: string;
    username: string;
    role: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN';
}

export interface AuthRequest extends Request {
    user?: AuthUser;
}

export const authenticate = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'No token provided'
            });
        }

        const token = authHeader.substring(7);

        let decoded;
        try {
            decoded = verifyAccessToken(token);
        } catch (error: any) {
            if (error.name === 'TokenExpiredError') {
                return res.status(401).json({
                    error: 'TokenExpired',
                    message: 'Access token has expired'
                });
            }
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid token'
            });
        }

        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                role: users.role,
                suspended: users.suspended,
                suspensionReason: users.suspensionReason,
            })
            .from(users)
            .where(eq(users.id, decoded.userId))
            .limit(1);

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'User not found'
            });
        }

        if (user.suspended) {
            return res.status(403).json({
                error: 'AccountSuspended',
                message: 'Your account has been suspended',
                reason: user.suspensionReason
            });
        }

        req.user = {
            id: user.id,
            email: user.email,
            username: user.username,
            role: user.role as AuthUser['role'],
        };

        next();
    } catch (error) {
        next(error);
    }
};

// Optional authentication - doesn't fail if no token
export const optionalAuth = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }

        const token = authHeader.substring(7);

        try {
            const decoded = verifyAccessToken(token);

            const [user] = await db
                .select({
                    id: users.id,
                    email: users.email,
                    username: users.username,
                    role: users.role,
                    suspended: users.suspended,
                })
                .from(users)
                .where(eq(users.id, decoded.userId))
                .limit(1);

            if (user && !user.suspended) {
                req.user = {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role as AuthUser['role'],
                };
            }
        } catch {
            // Token invalid, but that's okay for optional auth
        }

        next();
    } catch (error) {
        next(error);
    }
};
