import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger.js';

// Custom error class for API errors
export class ApiError extends Error {
    public statusCode: number;
    public isOperational: boolean;

    constructor(message: string, statusCode: number = 500) {
        super(message);
        this.statusCode = statusCode;
        this.isOperational = true;
        Error.captureStackTrace(this, this.constructor);
    }
}

// Specific error types
export class NotFoundError extends ApiError {
    constructor(resource: string = 'Resource') {
        super(`${resource} not found`, 404);
    }
}

export class BadRequestError extends ApiError {
    constructor(message: string = 'Bad request') {
        super(message, 400);
    }
}

export class UnauthorizedError extends ApiError {
    constructor(message: string = 'Unauthorized') {
        super(message, 401);
    }
}

export class ForbiddenError extends ApiError {
    constructor(message: string = 'Forbidden') {
        super(message, 403);
    }
}

export class ConflictError extends ApiError {
    constructor(message: string = 'Conflict') {
        super(message, 409);
    }
}

// Global error handler middleware
export const errorHandler = (
    err: Error,
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Log the error
    logger.error('Error occurred:', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        method: req.method,
    });

    // Handle known API errors
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            error: err.constructor.name.replace('Error', ''),
            message: err.message,
        });
    }

    // Handle Postgres errors
    if ((err as any).code) {
        const pgError = err as any;

        // Unique constraint violation
        if (pgError.code === '23505') {
            return res.status(409).json({
                error: 'Conflict',
                message: 'A record with this value already exists',
            });
        }

        // Foreign key violation
        if (pgError.code === '23503') {
            return res.status(400).json({
                error: 'BadRequest',
                message: 'Referenced record does not exist',
            });
        }
    }

    // Handle unknown errors
    const isProduction = process.env.NODE_ENV === 'production';

    return res.status(500).json({
        error: 'InternalServerError',
        message: isProduction
            ? 'An unexpected error occurred'
            : err.message,
        ...(isProduction ? {} : { stack: err.stack }),
    });
};

// Async handler wrapper to catch errors in async route handlers
export const asyncHandler = (
    fn: (req: Request, res: Response, next: NextFunction) => Promise<any>
) => {
    return (req: Request, res: Response, next: NextFunction) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
