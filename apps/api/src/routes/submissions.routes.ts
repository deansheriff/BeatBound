import Elysia from 'elysia';
import { db } from '../db';
import { submissions, challenges, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { authMiddleware, requireAuth, requireRole } from './auth.routes';
import { storage } from '../lib/storage';
import { leaderboard } from '../lib/redis';

export const submissionRoutes = new Elysia({ prefix: '/submissions' })
    .use(authMiddleware)
    // Get single submission
    .get('/:id', async ({ params, set }) => {
        const { id } = params;

        const submission = await db.query.submissions.findFirst({
            where: eq(submissions.id, id),
            with: {
                artist: {
                    columns: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                challenge: {
                    columns: {
                        id: true,
                        title: true,
                    },
                },
            },
        });

        if (!submission) {
            set.status = 404;
            return { error: 'Submission not found' };
        }

        // Get rank from leaderboard
        const rank = await leaderboard.getRank(submission.challengeId, submission.id);

        return { ...submission, rank };
    })
    // Delete submission
    .delete('/:id', async ({ params, user, set }) => {
        try {
            const authedUser = requireAuth(user);
            const { id } = params;

            const submission = await db.query.submissions.findFirst({
                where: eq(submissions.id, id),
                with: {
                    challenge: true,
                },
            });

            if (!submission) {
                set.status = 404;
                return { error: 'Submission not found' };
            }

            // Allow artist or challenge producer to delete
            if (
                submission.artistId !== authedUser.id &&
                submission.challenge.producerId !== authedUser.id
            ) {
                set.status = 403;
                return { error: 'Not authorized' };
            }

            // Remove from leaderboard
            await leaderboard.remove(submission.challengeId, submission.id);

            // Delete from database
            await db.delete(submissions).where(eq(submissions.id, id));

            return { success: true };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    });

// Nested under challenges
export const challengeSubmissionRoutes = new Elysia({ prefix: '/challenges/:challengeId/submissions' })
    .use(authMiddleware)
    // List submissions for a challenge
    .get('/', async ({ params, query }) => {
        const { challengeId } = params;
        const { sort = 'votes', limit = '20', offset = '0' } = query as {
            sort?: 'votes' | 'recent';
            limit?: string;
            offset?: string;
        };

        const orderBy = sort === 'votes' ? desc(submissions.voteCount) : desc(submissions.createdAt);

        const results = await db.query.submissions.findMany({
            where: eq(submissions.challengeId, challengeId),
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
            orderBy,
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        return results;
    })
    // Create submission (Artist only)
    .post('/', async ({ params, body, user, set }) => {
        try {
            const authedUser = requireRole(user, ['ARTIST']);
            const { challengeId } = params;

            // Check challenge exists and is active
            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, challengeId),
            });

            if (!challenge) {
                set.status = 404;
                return { error: 'Challenge not found' };
            }

            if (!challenge.isActive) {
                set.status = 400;
                return { error: 'Challenge is not active' };
            }

            if (new Date() > challenge.endDate) {
                set.status = 400;
                return { error: 'Challenge has ended' };
            }

            // For paid challenges, verify escrow is funded
            if (challenge.tier === 'PAID' && challenge.escrowStatus !== 'FUNDED') {
                set.status = 400;
                return { error: 'Challenge prize not yet funded' };
            }

            // Check if artist already submitted
            const existingSubmission = await db.query.submissions.findFirst({
                where: eq(submissions.artistId, authedUser.id),
            });

            if (existingSubmission) {
                set.status = 400;
                return { error: 'You already submitted to this challenge' };
            }

            const { videoFileName, videoContentType, title, description } = body as {
                videoFileName: string;
                videoContentType: string;
                title?: string;
                description?: string;
            };

            // Generate upload URL
            const videoKey = storage.generateKey('video', authedUser.id, videoFileName);
            const uploadData = await storage.getUploadUrl(videoKey, videoContentType);

            // Create submission (status = PROCESSING until video is confirmed)
            const [submission] = await db
                .insert(submissions)
                .values({
                    videoUrl: uploadData.publicUrl,
                    title,
                    description,
                    artistId: authedUser.id,
                    challengeId,
                    status: 'PROCESSING',
                })
                .returning();

            // Initialize in leaderboard with 0 votes
            await leaderboard.updateScore(challengeId, submission.id, 0);

            return {
                submission,
                uploadUrl: uploadData.uploadUrl,
                videoKey,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Confirm upload complete (marks as ACTIVE)
    .post('/:submissionId/confirm', async ({ params, user, set }) => {
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

            if (submission.artistId !== authedUser.id) {
                set.status = 403;
                return { error: 'Not your submission' };
            }

            const [updated] = await db
                .update(submissions)
                .set({
                    status: 'ACTIVE',
                    updatedAt: new Date(),
                })
                .where(eq(submissions.id, submissionId))
                .returning();

            return updated;
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    });
