import { Response, NextFunction } from 'express';
import { AuthRequest, AuthUser } from './auth.js';

type UserRole = AuthUser['role'];

// Require specific roles
export const requireRole = (...allowedRoles: UserRole[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Authentication required'
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Forbidden',
                message: `Access denied. Required role: ${allowedRoles.join(' or ')}`,
                requiredRoles: allowedRoles,
                currentRole: req.user.role
            });
        }

        next();
    };
};

// Require admin role
export const requireAdmin = requireRole('ADMIN');

// Require producer role (or admin)
export const requireProducer = requireRole('PRODUCER', 'ADMIN');

// Require artist role (or admin)
export const requireArtist = requireRole('ARTIST', 'ADMIN');

// Require producer or artist (or admin)
export const requireCreator = requireRole('PRODUCER', 'ARTIST', 'ADMIN');

// Check if user owns a resource
export const requireOwnership = (
    getOwnerId: (req: AuthRequest) => Promise<string | null>
) => {
    return async (req: AuthRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Authentication required'
                });
            }

            // Admins can access any resource
            if (req.user.role === 'ADMIN') {
                return next();
            }

            const ownerId = await getOwnerId(req);

            if (!ownerId) {
                return res.status(404).json({
                    error: 'NotFound',
                    message: 'Resource not found'
                });
            }

            if (ownerId !== req.user.id) {
                return res.status(403).json({
                    error: 'Forbidden',
                    message: 'You do not have permission to access this resource'
                });
            }

            next();
        } catch (error) {
            next(error);
        }
    };
};
