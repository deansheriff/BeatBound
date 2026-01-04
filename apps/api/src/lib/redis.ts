import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

export const redis = new Redis(redisUrl);

// Leaderboard helpers
export const leaderboard = {
    // Get challenge leaderboard key
    key: (challengeId: string) => `leaderboard:${challengeId}`,

    // Add or update a submission's vote count
    async updateScore(challengeId: string, submissionId: string, score: number) {
        return redis.zadd(this.key(challengeId), score, submissionId);
    },

    // Increment vote count by 1
    async incrementScore(challengeId: string, submissionId: string) {
        return redis.zincrby(this.key(challengeId), 1, submissionId);
    },

    // Decrement vote count by 1
    async decrementScore(challengeId: string, submissionId: string) {
        return redis.zincrby(this.key(challengeId), -1, submissionId);
    },

    // Get top N submissions for a challenge
    async getTop(challengeId: string, count: number = 10) {
        const results = await redis.zrevrange(this.key(challengeId), 0, count - 1, 'WITHSCORES');
        const formatted: { submissionId: string; score: number }[] = [];
        for (let i = 0; i < results.length; i += 2) {
            formatted.push({
                submissionId: results[i],
                score: parseInt(results[i + 1], 10),
            });
        }
        return formatted;
    },

    // Get a specific submission's rank
    async getRank(challengeId: string, submissionId: string) {
        const rank = await redis.zrevrank(this.key(challengeId), submissionId);
        return rank !== null ? rank + 1 : null;
    },

    // Remove a submission from leaderboard
    async remove(challengeId: string, submissionId: string) {
        return redis.zrem(this.key(challengeId), submissionId);
    },

    // Clear entire leaderboard
    async clear(challengeId: string) {
        return redis.del(this.key(challengeId));
    },
};

// Session/cache helpers
export const cache = {
    async get<T>(key: string): Promise<T | null> {
        const data = await redis.get(key);
        return data ? JSON.parse(data) : null;
    },

    async set(key: string, value: unknown, ttlSeconds?: number) {
        const serialized = JSON.stringify(value);
        if (ttlSeconds) {
            return redis.setex(key, ttlSeconds, serialized);
        }
        return redis.set(key, serialized);
    },

    async del(key: string) {
        return redis.del(key);
    },

    // Check if user has voted on a submission (quick check before DB)
    async hasVoted(userId: string, submissionId: string): Promise<boolean> {
        const key = `vote:${userId}:${submissionId}`;
        return (await redis.exists(key)) === 1;
    },

    async markVoted(userId: string, submissionId: string) {
        const key = `vote:${userId}:${submissionId}`;
        return redis.set(key, '1');
    },

    async unmarkVoted(userId: string, submissionId: string) {
        const key = `vote:${userId}:${submissionId}`;
        return redis.del(key);
    },
};
