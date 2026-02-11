import Redis from 'ioredis';
import { logger } from '../utils/logger.js';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy: (attempt: number) => Math.min(attempt * 100, 2000),
    lazyConnect: true,
});

redisClient.on('connect', () => {
    logger.info('Redis connected');
});

redisClient.on('error', (error) => {
    logger.error('Redis error:', error);
});

// Create a separate client for pub/sub
export function createSubscriber(): Redis {
    return new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        lazyConnect: true,
    });
}

// Health check function
export async function checkRedisConnection(): Promise<boolean> {
    try {
        await redisClient.ping();
        return true;
    } catch (error) {
        return false;
    }
}

// Cache utilities
export async function getCache<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);
    if (data) {
        return JSON.parse(data) as T;
    }
    return null;
}

export async function setCache(
    key: string,
    value: unknown,
    expiresInSeconds: number = 300
): Promise<void> {
    await redisClient.set(key, JSON.stringify(value), 'EX', expiresInSeconds);
}

export async function deleteCache(key: string): Promise<void> {
    await redisClient.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
        await redisClient.del(...keys);
    }
}
