import { Router } from 'express';
import { eq, sql, desc, and, gte, lte, ne, or, ilike } from 'drizzle-orm';
import { db } from '../config/database.js';
import { challenges, users, submissions, challengeStatusEnum } from '@beatbound/database';
import { authenticate, optionalAuth, AuthRequest } from '../middleware/auth.js';
import { requireProducer } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { createChallengeSchema, updateChallengeSchema } from '../utils/validators.js';
import { asyncHandler, NotFoundError, ForbiddenError, BadRequestError } from '../middleware/error-handler.js';
import { stripe, calculatePlatformFee } from '../config/stripe.js';
import { logger } from '../utils/logger.js';

const router = Router();
type ChallengeStatus = (typeof challengeStatusEnum.enumValues)[number];

function isChallengeStatus(value: unknown): value is ChallengeStatus {
    return typeof value === 'string' && challengeStatusEnum.enumValues.includes(value as ChallengeStatus);
}

// GET /api/challenges
router.get(
    '/',
    optionalAuth,
    asyncHandler(async (req: AuthRequest, res) => {
        const {
            page = 1,
            limit = 20,
            status = 'ACTIVE',
            genre,
            search,
            sortBy = 'newest'
        } = req.query;

        const offset = (Number(page) - 1) * Number(limit);

        // Build conditions
        const conditions = [];

        if (status !== 'all' && isChallengeStatus(status)) {
            conditions.push(eq(challenges.status, status));
        } else {
            // Show all except DRAFT (unless owner)
            conditions.push(ne(challenges.status, 'DRAFT'));
        }

        if (genre) {
            conditions.push(eq(challenges.genre, genre as string));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(challenges.title, `%${search}%`),
                    ilike(challenges.description, `%${search}%`)
                )
            );
        }

        // Build order
        let orderBy;
        switch (sortBy) {
            case 'ending':
                orderBy = challenges.submissionDeadline;
                break;
            case 'popular':
                orderBy = desc(challenges.submissionCount);
                break;
            case 'prize':
                orderBy = desc(challenges.prizeAmount);
                break;
            default:
                orderBy = desc(challenges.createdAt);
        }

        const challengeList = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                description: challenges.description,
                genre: challenges.genre,
                bpm: challenges.bpm,
                coverImageUrl: challenges.coverImageUrl,
                status: challenges.status,
                prizeAmount: challenges.prizeAmount,
                maxSubmissions: challenges.maxSubmissions,
                submissionCount: challenges.submissionCount,
                viewCount: challenges.viewCount,
                submissionDeadline: challenges.submissionDeadline,
                votingDeadline: challenges.votingDeadline,
                createdAt: challenges.createdAt,
                producer: {
                    id: users.id,
                    username: users.username,
                    displayName: users.displayName,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.producerId, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(orderBy)
            .limit(Number(limit))
            .offset(offset);

        // Get total count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(challenges)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        res.json({
            challenges: challengeList,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: countResult?.count || 0,
                totalPages: Math.ceil((countResult?.count || 0) / Number(limit)),
            },
        });
    })
);

// GET /api/challenges/:id
router.get(
    '/:id',
    optionalAuth,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [challenge] = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                description: challenges.description,
                genre: challenges.genre,
                bpm: challenges.bpm,
                beatUrl: challenges.beatUrl,
                coverImageUrl: challenges.coverImageUrl,
                rules: challenges.rules,
                status: challenges.status,
                prizeAmount: challenges.prizeAmount,
                maxSubmissions: challenges.maxSubmissions,
                submissionCount: challenges.submissionCount,
                viewCount: challenges.viewCount,
                submissionDeadline: challenges.submissionDeadline,
                votingDeadline: challenges.votingDeadline,
                winnerSelection: challenges.winnerSelection,
                winnerId: challenges.winnerId,
                winnerSubmissionId: challenges.winnerSubmissionId,
                createdAt: challenges.createdAt,
                producerId: challenges.producerId,
                producer: {
                    id: users.id,
                    username: users.username,
                    displayName: users.displayName,
                    avatarUrl: users.avatarUrl,
                    bio: users.bio,
                },
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.producerId, users.id))
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        // Check if DRAFT and not owner
        if (challenge.status === 'DRAFT' && req.user?.id !== challenge.producerId) {
            throw new NotFoundError('Challenge');
        }

        // Increment view count
        await db
            .update(challenges)
            .set({ viewCount: sql`${challenges.viewCount} + 1` })
            .where(eq(challenges.id, id));

        res.json({ challenge });
    })
);

// POST /api/challenges
router.post(
    '/',
    authenticate,
    requireProducer,
    validate(createChallengeSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const {
            title,
            description,
            genre,
            bpm,
            beatUrl,
            coverImageUrl,
            rules,
            prizeAmount,
            maxSubmissions,
            submissionDeadline,
            votingDeadline,
            winnerSelection,
        } = req.body;

        // Validate deadlines
        const submissionDate = new Date(submissionDeadline);
        const votingDate = new Date(votingDeadline);
        const now = new Date();

        if (submissionDate <= now) {
            throw new BadRequestError('Submission deadline must be in the future');
        }

        if (votingDate <= submissionDate) {
            throw new BadRequestError('Voting deadline must be after submission deadline');
        }

        // Calculate platform fee
        const platformFee = calculatePlatformFee(prizeAmount * 100) / 100;

        // Create challenge
        const [newChallenge] = await db
            .insert(challenges)
            .values({
                producerId: req.user!.id,
                title,
                description,
                genre,
                bpm,
                beatUrl,
                coverImageUrl,
                rules,
                prizeAmount: prizeAmount.toString(),
                platformFee: platformFee.toString(),
                maxSubmissions,
                submissionDeadline: submissionDate,
                votingDeadline: votingDate,
                winnerSelection,
                status: 'DRAFT',
            })
            .returning();

        logger.info(`Challenge created: ${newChallenge.id} by ${req.user!.id}`);

        res.status(201).json({ challenge: newChallenge });
    })
);

// PATCH /api/challenges/:id
router.patch(
    '/:id',
    authenticate,
    validate(updateChallengeSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        // Get challenge
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        // Check ownership
        if (challenge.producerId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new ForbiddenError('You do not own this challenge');
        }

        // Only allow updates in DRAFT status
        if (challenge.status !== 'DRAFT') {
            throw new BadRequestError('Cannot update a published challenge');
        }

        const updateData = { ...req.body, updatedAt: new Date() };

        // Recalculate platform fee if prize amount changed
        if (req.body.prizeAmount !== undefined) {
            updateData.platformFee = (calculatePlatformFee(req.body.prizeAmount * 100) / 100).toString();
            updateData.prizeAmount = req.body.prizeAmount.toString();
        }

        const [updatedChallenge] = await db
            .update(challenges)
            .set(updateData)
            .where(eq(challenges.id, id))
            .returning();

        res.json({ challenge: updatedChallenge });
    })
);

// POST /api/challenges/:id/publish
router.post(
    '/:id/publish',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        if (challenge.producerId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new ForbiddenError('You do not own this challenge');
        }

        if (challenge.status !== 'DRAFT') {
            throw new BadRequestError('Challenge is already published');
        }

        // Validate required fields
        if (!challenge.submissionDeadline || !challenge.votingDeadline) {
            throw new BadRequestError('Deadlines are required');
        }

        // Validate deadlines are still in future
        if (new Date(challenge.submissionDeadline) <= new Date()) {
            throw new BadRequestError('Submission deadline must be in the future');
        }

        // Update to ACTIVE
        const [updatedChallenge] = await db
            .update(challenges)
            .set({
                status: 'ACTIVE',
                updatedAt: new Date(),
            })
            .where(eq(challenges.id, id))
            .returning();

        logger.info(`Challenge published: ${id}`);

        res.json({ challenge: updatedChallenge });
    })
);

// DELETE /api/challenges/:id
router.delete(
    '/:id',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;

        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        if (challenge.producerId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new ForbiddenError('You do not own this challenge');
        }

        // Only allow deletion in DRAFT or ACTIVE with 0 submissions
        if (challenge.status === 'DRAFT') {
            await db.delete(challenges).where(eq(challenges.id, id));
        } else if (challenge.status === 'ACTIVE' && challenge.submissionCount === 0) {
            await db.delete(challenges).where(eq(challenges.id, id));
        } else {
            throw new BadRequestError('Cannot delete a challenge with submissions');
        }

        logger.info(`Challenge deleted: ${id}`);

        res.json({ message: 'Challenge deleted' });
    })
);

// GET /api/challenges/:id/submissions
router.get(
    '/:id/submissions',
    optionalAuth,
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;
        const { page = 1, limit = 20, sortBy = 'votes' } = req.query;

        // Verify challenge exists
        const [challenge] = await db
            .select({ id: challenges.id, status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        const offset = (Number(page) - 1) * Number(limit);

        let orderBy;
        switch (sortBy) {
            case 'votes':
                orderBy = desc(submissions.voteCount);
                break;
            case 'newest':
                orderBy = desc(submissions.createdAt);
                break;
            case 'views':
                orderBy = desc(submissions.viewCount);
                break;
            default:
                orderBy = desc(submissions.voteCount);
        }

        const submissionList = await db
            .select({
                id: submissions.id,
                title: submissions.title,
                description: submissions.description,
                videoUrl: submissions.videoUrl,
                thumbnailUrl: submissions.thumbnailUrl,
                status: submissions.status,
                voteCount: submissions.voteCount,
                viewCount: submissions.viewCount,
                duration: submissions.duration,
                isWinner: submissions.isWinner,
                createdAt: submissions.createdAt,
                artist: {
                    id: users.id,
                    username: users.username,
                    displayName: users.displayName,
                    avatarUrl: users.avatarUrl,
                },
            })
            .from(submissions)
            .innerJoin(users, eq(submissions.artistId, users.id))
            .where(
                and(
                    eq(submissions.challengeId, id),
                    eq(submissions.status, 'READY'),
                    eq(submissions.disqualified, false)
                )
            )
            .orderBy(orderBy)
            .limit(Number(limit))
            .offset(offset);

        res.json({ submissions: submissionList });
    })
);

export default router;
