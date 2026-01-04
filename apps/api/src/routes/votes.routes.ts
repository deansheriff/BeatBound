import Elysia from 'elysia';
import { db } from '../db';
import { votes, submissions } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, requireAuth } from './auth.routes';
import { leaderboard, cache } from '../lib/redis';

export const voteRoutes = new Elysia({ prefix: '/submissions/:submissionId' })
    .use(authMiddleware)
    // Add a "Hype" vote (authenticated users only)
    .post('/hype', async ({ params, user, set }) => {
        try {
            const authedUser = requireAuth(user);
            const { submissionId } = params;

            // Check submission exists
            const submission = await db.query.submissions.findFirst({
                where: eq(submissions.id, submissionId),
            });

            if (!submission) {
                set.status = 404;
                return { error: 'Submission not found' };
            }

            if (submission.status !== 'ACTIVE') {
                set.status = 400;
                return { error: 'Cannot vote on inactive submission' };
            }

            // Quick cache check first
            const hasVoted = await cache.hasVoted(authedUser.id, submissionId);
            if (hasVoted) {
                set.status = 400;
                return { error: 'Already hyped this submission' };
            }

            // Check in database (in case cache was cleared)
            const existingVote = await db.query.votes.findFirst({
                where: and(
                    eq(votes.userId, authedUser.id),
                    eq(votes.submissionId, submissionId)
                ),
            });

            if (existingVote) {
                // Update cache
                await cache.markVoted(authedUser.id, submissionId);
                set.status = 400;
                return { error: 'Already hyped this submission' };
            }

            // Create vote
            await db.insert(votes).values({
                userId: authedUser.id,
                submissionId,
            });

            // Update submission vote count
            const [updated] = await db
                .update(submissions)
                .set({
                    voteCount: submission.voteCount + 1,
                    updatedAt: new Date(),
                })
                .where(eq(submissions.id, submissionId))
                .returning();

            // Update leaderboard
            await leaderboard.incrementScore(submission.challengeId, submissionId);

            // Mark in cache
            await cache.markVoted(authedUser.id, submissionId);

            return {
                success: true,
                voteCount: updated.voteCount,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Remove "Hype" vote
    .delete('/hype', async ({ params, user, set }) => {
        try {
            const authedUser = requireAuth(user);
            const { submissionId } = params;

            const submission = await db.query.submissions.findFirst({
                where: eq(submissions.id, submissionId),
            });

            if (!submission) {
                set.status = 404;
                return { error: 'Submission not found' };
            }

            // Find the vote
            const existingVote = await db.query.votes.findFirst({
                where: and(
                    eq(votes.userId, authedUser.id),
                    eq(votes.submissionId, submissionId)
                ),
            });

            if (!existingVote) {
                set.status = 400;
                return { error: 'You have not hyped this submission' };
            }

            // Delete vote
            await db
                .delete(votes)
                .where(
                    and(
                        eq(votes.userId, authedUser.id),
                        eq(votes.submissionId, submissionId)
                    )
                );

            // Update submission vote count
            const [updated] = await db
                .update(submissions)
                .set({
                    voteCount: Math.max(0, submission.voteCount - 1),
                    updatedAt: new Date(),
                })
                .where(eq(submissions.id, submissionId))
                .returning();

            // Update leaderboard
            await leaderboard.decrementScore(submission.challengeId, submissionId);

            // Remove from cache
            await cache.unmarkVoted(authedUser.id, submissionId);

            return {
                success: true,
                voteCount: updated.voteCount,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Check if current user has voted
    .get('/hype', async ({ params, user }) => {
        if (!user) {
            return { hasVoted: false };
        }

        const { submissionId } = params;

        // Quick cache check
        const hasVoted = await cache.hasVoted(user.id, submissionId);
        if (hasVoted) {
            return { hasVoted: true };
        }

        // Check database
        const existingVote = await db.query.votes.findFirst({
            where: and(
                eq(votes.userId, user.id),
                eq(votes.submissionId, submissionId)
            ),
        });

        if (existingVote) {
            // Update cache
            await cache.markVoted(user.id, submissionId);
            return { hasVoted: true };
        }

        return { hasVoted: false };
    });

// Leaderboard route for challenges
export const leaderboardRoutes = new Elysia({ prefix: '/challenges/:challengeId/leaderboard' })
    .get('/', async ({ params, query }) => {
        const { challengeId } = params;
        const { limit = '10' } = query as { limit?: string };

        // Get top submissions from Redis leaderboard
        const topSubmissions = await leaderboard.getTop(challengeId, parseInt(limit));

        if (topSubmissions.length === 0) {
            return [];
        }

        // Fetch submission details
        const submissionIds = topSubmissions.map((s) => s.submissionId);
        const submissionDetails = await db.query.submissions.findMany({
            where: (submissions, { inArray }) => inArray(submissions.id, submissionIds),
            with: {
                artist: {
                    columns: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
        });

        // Map with rank and score
        const detailsMap = new Map(submissionDetails.map((s) => [s.id, s]));

        return topSubmissions.map((entry, index) => ({
            rank: index + 1,
            score: entry.score,
            submission: detailsMap.get(entry.submissionId),
        }));
    });
