import { Router } from 'express';
import { eq, sql, desc, and } from 'drizzle-orm';
import { db } from '../config/database.js';
import { submissions, challenges, users, votes } from '@beatbound/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { requireArtist } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { createSubmissionSchema, updateSubmissionSchema } from '../utils/validators.js';
import { asyncHandler, NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error-handler.js';
import { deleteObject } from '../config/aws.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/submissions/:id
router.get(
    '/:id',
    optionalAuth,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [submission] = await db
            .select({
                id: submissions.id,
                title: submissions.title,
                description: submissions.description,
                videoUrl: submissions.videoUrl,
                thumbnailUrl: submissions.thumbnailUrl,
                status: submissions.status,
                duration: submissions.duration,
                videoWidth: submissions.videoWidth,
                videoHeight: submissions.videoHeight,
                voteCount: submissions.voteCount,
                viewCount: submissions.viewCount,
                isWinner: submissions.isWinner,
                createdAt: submissions.createdAt,
                challengeId: submissions.challengeId,
                artistId: submissions.artistId,
                artist: {
                    id: users.id,
                    username: users.username,
                    displayName: users.displayName,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(submissions)
            .innerJoin(users, eq(submissions.artistId, users.id))
            .where(eq(submissions.id, id))
            .limit(1);

        if (!submission) {
            throw new NotFoundError('Submission');
        }

        // Get challenge info
        const [challenge] = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                status: challenges.status,
            })
            .from(challenges)
            .where(eq(challenges.id, submission.challengeId))
            .limit(1);

        // Check if user has voted
        let hasVoted = false;
        if (req.user) {
            const existingVote = await db
                .select({ id: votes.id })
                .from(votes)
                .where(
                    and(
                        eq(votes.submissionId, id),
                        eq(votes.userId, req.user.id)
                    )
                )
                .limit(1);
            hasVoted = existingVote.length > 0;
        }

        // Increment view count
        await db
            .update(submissions)
            .set({ viewCount: sql`${submissions.viewCount} + 1` })
            .where(eq(submissions.id, id));

        res.json({
            submission: {
                ...submission,
                challenge,
                hasVoted,
            },
        });
    })
);

// POST /api/submissions
router.post(
    '/',
    authenticate,
    requireArtist,
    validate(createSubmissionSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { challengeId, title, description, videoUrl } = req.body;

        // Verify challenge exists and is active
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        if (challenge.status !== 'ACTIVE') {
            throw new BadRequestError('Challenge is not accepting submissions');
        }

        if (challenge.submissionDeadline && new Date() > new Date(challenge.submissionDeadline)) {
            throw new BadRequestError('Submission deadline has passed');
        }

        if (challenge.submissionCount >= challenge.maxSubmissions) {
            throw new BadRequestError('Challenge has reached maximum submissions');
        }

        // Check if user already submitted
        const existingSubmission = await db
            .select({ id: submissions.id })
            .from(submissions)
            .where(
                and(
                    eq(submissions.challengeId, challengeId),
                    eq(submissions.artistId, req.user!.id)
                )
            )
            .limit(1);

        if (existingSubmission.length > 0) {
            throw new BadRequestError('You have already submitted to this challenge');
        }

        // Create submission
        const [newSubmission] = await db
            .insert(submissions)
            .values({
                challengeId,
                artistId: req.user!.id,
                title,
                description,
                videoUrl,
                status: 'PROCESSING',
            })
            .returning();

        // Increment challenge submission count
        await db
            .update(challenges)
            .set({ submissionCount: sql`${challenges.submissionCount} + 1` })
            .where(eq(challenges.id, challengeId));

        logger.info(`Submission created: ${newSubmission.id} for challenge ${challengeId}`);

        // TODO: Add to video processing queue

        res.status(201).json({ submission: newSubmission });
    })
);

// PATCH /api/submissions/:id
router.patch(
    '/:id',
    authenticate,
    validate(updateSubmissionSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [submission] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, id))
            .limit(1);

        if (!submission) {
            throw new NotFoundError('Submission');
        }

        if (submission.artistId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new ForbiddenError('You do not own this submission');
        }

        // Check if challenge is still in submission phase
        const [challenge] = await db
            .select({ status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, submission.challengeId))
            .limit(1);

        if (challenge?.status !== 'ACTIVE') {
            throw new BadRequestError('Cannot update submission after challenge submission phase');
        }

        const { title, description } = req.body;
        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description;

        const [updatedSubmission] = await db
            .update(submissions)
            .set(updateData)
            .where(eq(submissions.id, id))
            .returning();

        res.json({ submission: updatedSubmission });
    })
);

// DELETE /api/submissions/:id
router.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [submission] = await db
            .select()
            .from(submissions)
            .where(eq(submissions.id, id))
            .limit(1);

        if (!submission) {
            throw new NotFoundError('Submission');
        }

        if (submission.artistId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new ForbiddenError('You do not own this submission');
        }

        // Check if challenge is still in submission phase
        const [challenge] = await db
            .select({ status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, submission.challengeId))
            .limit(1);

        if (challenge?.status !== 'ACTIVE') {
            throw new BadRequestError('Cannot delete submission after voting has started');
        }

        // Delete from S3 if exists
        if (submission.s3Key) {
            try {
                await deleteObject(submission.s3Key);
            } catch (error) {
                logger.error('Failed to delete S3 object:', error);
            }
        }

        // Delete submission
        await db.delete(submissions).where(eq(submissions.id, id));

        // Decrement challenge submission count
        await db
            .update(challenges)
            .set({ submissionCount: sql`${challenges.submissionCount} - 1` })
            .where(eq(challenges.id, submission.challengeId));

        logger.info(`Submission deleted: ${id}`);

        res.json({ message: 'Submission deleted' });
    })
);

// GET /api/submissions/mine
router.get(
    '/mine',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { page = 1, limit = 20 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const mySubmissions = await db
            .select({
                id: submissions.id,
                title: submissions.title,
                description: submissions.description,
                videoUrl: submissions.videoUrl,
                thumbnailUrl: submissions.thumbnailUrl,
                status: submissions.status,
                voteCount: submissions.voteCount,
                viewCount: submissions.viewCount,
                isWinner: submissions.isWinner,
                createdAt: submissions.createdAt,
                challenge: {
                    id: challenges.id,
                    title: challenges.title,
                    status: challenges.status,
                    genre: challenges.genre,
                },
            })
            .from(submissions)
            .innerJoin(challenges, eq(submissions.challengeId, challenges.id))
            .where(eq(submissions.artistId, req.user!.id))
            .orderBy(desc(submissions.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ submissions: mySubmissions });
    })
);

export default router;
