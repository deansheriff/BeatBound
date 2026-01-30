import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RedisStore from 'rate-limit-redis';
import { redisClient } from '../config/redis.js';

// Create rate limiter with Redis store
export const createRateLimiter = (options: {
    windowMs: number;
    max: number;
    message?: string;
    keyPrefix?: string;
}) => {
    const { windowMs, max, message, keyPrefix = 'rl' } = options;

    return rateLimit({
        windowMs,
        max,
        message: {
            error: 'TooManyRequests',
            message: message || 'Too many requests, please try again later',
            retryAfter: Math.ceil(windowMs / 1000)
        },
        standardHeaders: true,
        legacyHeaders: false,
        store: new RedisStore({
            // @ts-ignore - types mismatch but works
            sendCommand: (...args: string[]) => redisClient.call(...args),
            prefix: `${keyPrefix}:`,
        }),
        keyGenerator: (req: Request) => {
            // Use user ID if authenticated, otherwise IP
            const authReq = req as any;
            return authReq.user?.id || req.ip || 'anonymous';
        },
        skip: (req: Request) => {
            // Skip rate limiting for admins
            const authReq = req as any;
            return authReq.user?.role === 'ADMIN';
        },
    });
};

// Preset rate limiters for different endpoints
export const authLimiter = createRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
    message: 'Too many login attempts, please try again later',
    keyPrefix: 'rl:auth',
});

export const registerLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5,
    message: 'Too many registration attempts, please try again later',
    keyPrefix: 'rl:register',
});

export const uploadLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 10,
    message: 'Upload limit exceeded, please try again later',
    keyPrefix: 'rl:upload',
});

export const voteLimiter = createRateLimiter({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100,
    message: 'Vote limit exceeded, please try again later',
    keyPrefix: 'rl:vote',
});

export const apiLimiter = createRateLimiter({
    windowMs: 60 * 1000, // 1 minute
    max: 60,
    message: 'Too many requests, please slow down',
    keyPrefix: 'rl:api',
});
