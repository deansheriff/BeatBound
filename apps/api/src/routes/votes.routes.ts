import { Router, Request, Response } from 'express';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { votes, submissions, challenges } from '@beatbound/database';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { createVoteSchema } from '../utils/validators.js';
import { voteLimiter } from '../middleware/rate-limit.js';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler.js';
import { redisClient, createSubscriber } from '../config/redis.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/votes
router.post(
    '/',
    authenticate,
    voteLimiter,
    validate(createVoteSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { submissionId } = req.body;

        // Get submission and challenge info
        const [submission] = await db
            .select({
                id: submissions.id,
                challengeId: submissions.challengeId,
                status: submissions.status,
                disqualified: submissions.disqualified,
            })
            .from(submissions)
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submission) {
            throw new NotFoundError('Submission');
        }

        if (submission.status !== 'READY') {
            throw new BadRequestError('This submission is not ready for voting');
        }

        if (submission.disqualified) {
            throw new BadRequestError('This submission has been disqualified');
        }

        // Check challenge is in voting phase
        const [challenge] = await db
            .select({ status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, submission.challengeId))
            .limit(1);

        if (!challenge || challenge.status !== 'VOTING') {
            throw new BadRequestError('Voting is not currently open for this challenge');
        }

        // Check if already voted
        const existingVote = await db
            .select({ id: votes.id })
            .from(votes)
            .where(
                and(
                    eq(votes.submissionId, submissionId),
                    eq(votes.userId, req.user!.id)
                )
            )
            .limit(1);

        if (existingVote.length > 0) {
            throw new BadRequestError('You have already voted for this submission');
        }

        // Cast vote
        const ipAddress = req.ip || req.socket.remoteAddress;
        const [newVote] = await db
            .insert(votes)
            .values({
                submissionId,
                userId: req.user!.id,
                ipAddress,
            })
            .returning();

        // Increment vote count atomically
        const [updatedSubmission] = await db
            .update(submissions)
            .set({ voteCount: sql`${submissions.voteCount} + 1` })
            .where(eq(submissions.id, submissionId))
            .returning({ voteCount: submissions.voteCount });

        // Publish to Redis for real-time updates
        await redisClient.publish(
            `votes:${submission.challengeId}`,
            JSON.stringify({
                submissionId,
                voteCount: updatedSubmission.voteCount,
                action: 'add',
            })
        );

        logger.info(`Vote cast: ${req.user!.id} voted for ${submissionId}`);

        res.status(201).json({
            vote: newVote,
            voteCount: updatedSubmission.voteCount,
        });
    })
);

// DELETE /api/votes/:submissionId
router.delete(
    '/:submissionId',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { submissionId } = req.params;

        // Get submission info
        const [submission] = await db
            .select({
                id: submissions.id,
                challengeId: submissions.challengeId,
            })
            .from(submissions)
            .where(eq(submissions.id, submissionId))
            .limit(1);

        if (!submission) {
            throw new NotFoundError('Submission');
        }

        // Check challenge is still in voting phase
        const [challenge] = await db
            .select({ status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, submission.challengeId))
            .limit(1);

        if (!challenge || challenge.status !== 'VOTING') {
            throw new BadRequestError('Voting is no longer open for this challenge');
        }

        // Find and delete vote
        const deletedVotes = await db
            .delete(votes)
            .where(
                and(
                    eq(votes.submissionId, submissionId),
                    eq(votes.userId, req.user!.id)
                )
            )
            .returning();

        if (deletedVotes.length === 0) {
            throw new BadRequestError('You have not voted for this submission');
        }

        // Decrement vote count
        const [updatedSubmission] = await db
            .update(submissions)
            .set({ voteCount: sql`${submissions.voteCount} - 1` })
            .where(eq(submissions.id, submissionId))
            .returning({ voteCount: submissions.voteCount });

        // Publish to Redis
        await redisClient.publish(
            `votes:${submission.challengeId}`,
            JSON.stringify({
                submissionId,
                voteCount: updatedSubmission.voteCount,
                action: 'remove',
            })
        );

        res.json({
            message: 'Vote removed',
            voteCount: updatedSubmission.voteCount,
        });
    })
);

// GET /api/votes/stream - Server-Sent Events for real-time vote updates
router.get('/stream', async (req: Request, res: Response) => {
    const { challengeId } = req.query;

    if (!challengeId) {
        return res.status(400).json({ error: 'challengeId is required' });
    }

    // Set up SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection message
    res.write(`data: ${JSON.stringify({ type: 'connected', challengeId })}\n\n`);

    // Create Redis subscriber
    const subscriber = createSubscriber();

    try {
        await subscriber.connect();
        await subscriber.subscribe(`votes:${challengeId}`, (message) => {
            res.write(`data: ${message}\n\n`);
        });
    } catch (error) {
        logger.error('SSE subscriber error:', error);
        res.end();
        return;
    }

    // Keep connection alive with heartbeat
    const heartbeat = setInterval(() => {
        res.write(`: heartbeat\n\n`);
    }, 30000);

    // Clean up on disconnect
    req.on('close', async () => {
        clearInterval(heartbeat);
        try {
            await subscriber.quit();
        } catch {
            // Ignore cleanup errors
        }
    });
});

// GET /api/challenges/:id/leaderboard
router.get(
    '/leaderboard/:challengeId',
    asyncHandler(async (req, res) => {
        const { challengeId } = req.params;

        // Verify challenge exists
        const [challenge] = await db
            .select({ id: challenges.id })
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        // Get leaderboard
        const leaderboard = await db
            .select({
                id: submissions.id,
                title: submissions.title,
                thumbnailUrl: submissions.thumbnailUrl,
                voteCount: submissions.voteCount,
                artistId: submissions.artistId,
                artistUsername: sql<string>`(SELECT username FROM users WHERE id = ${submissions.artistId})`,
                artistDisplayName: sql<string>`(SELECT display_name FROM users WHERE id = ${submissions.artistId})`,
                artistAvatarUrl: sql<string>`(SELECT avatar_url FROM users WHERE id = ${submissions.artistId})`,
            })
            .from(submissions)
            .where(
                and(
                    eq(submissions.challengeId, challengeId),
                    eq(submissions.status, 'READY'),
                    eq(submissions.disqualified, false)
                )
            )
            .orderBy(desc(submissions.voteCount))
            .limit(50);

        // Calculate vote percentages
        const totalVotes = leaderboard.reduce((sum, s) => sum + s.voteCount, 0);
        const leaderboardWithPercentages = leaderboard.map((sub, index) => ({
            ...sub,
            rank: index + 1,
            votePercentage: totalVotes > 0
                ? Math.round((sub.voteCount / totalVotes) * 1000) / 10
                : 0,
        }));

        res.json({
            leaderboard: leaderboardWithPercentages,
            totalVotes,
        });
    })
);

export default router;
