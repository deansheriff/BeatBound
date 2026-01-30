import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { challenges, submissions } from '@beatbound/database';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireArtist } from '../middleware/rbac.js';
import { validate } from '../middleware/validation.js';
import { presignedUrlSchema } from '../utils/validators.js';
import { uploadLimiter } from '../middleware/rate-limit.js';
import { asyncHandler, NotFoundError, BadRequestError, ForbiddenError } from '../middleware/error-handler.js';
import { generatePresignedUploadUrl, generateSubmissionKey } from '../config/aws.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/uploads/presigned-url
router.post(
    '/presigned-url',
    authenticate,
    requireArtist,
    uploadLimiter,
    validate(presignedUrlSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { challengeId, fileName, fileType } = req.body;

        // Verify challenge exists and is active
        const [challenge] = await db
            .select({
                id: challenges.id,
                status: challenges.status,
                submissionDeadline: challenges.submissionDeadline,
                maxSubmissions: challenges.maxSubmissions,
                submissionCount: challenges.submissionCount,
            })
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
            .where(eq(submissions.artistId, req.user!.id))
            .limit(1);

        // Allow re-upload if previous submission failed
        const validSubmission = existingSubmission.find(async (sub) => {
            const [s] = await db
                .select({ status: submissions.status, challengeId: submissions.challengeId })
                .from(submissions)
                .where(eq(submissions.id, sub.id));
            return s?.status !== 'FAILED' && s?.challengeId === challengeId;
        });

        if (validSubmission) {
            throw new BadRequestError('You have already submitted to this challenge');
        }

        // Generate S3 key
        const key = generateSubmissionKey(challengeId, req.user!.id, fileName);

        // Generate presigned URL
        const presignedData = await generatePresignedUploadUrl(key, fileType);

        logger.info(`Presigned URL generated for ${req.user!.id}, challenge ${challengeId}`);

        res.json({
            ...presignedData,
            key,
            expiresIn: 900, // 15 minutes
        });
    })
);

// POST /api/uploads/confirm
router.post(
    '/confirm',
    authenticate,
    requireArtist,
    asyncHandler(async (req: AuthRequest, res) => {
        const { key, challengeId, title, description } = req.body;

        if (!key || !challengeId) {
            throw new BadRequestError('Key and challengeId are required');
        }

        // Verify the key matches user's expected pattern
        if (!key.includes(req.user!.id)) {
            throw new ForbiddenError('Invalid upload key');
        }

        // Verify challenge exists and is active
        const [challenge] = await db
            .select({ id: challenges.id, status: challenges.status })
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge || challenge.status !== 'ACTIVE') {
            throw new BadRequestError('Challenge is not accepting submissions');
        }

        // Create submission entry
        const videoUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;

        const [submission] = await db
            .insert(submissions)
            .values({
                challengeId,
                artistId: req.user!.id,
                title: title || 'Untitled',
                description,
                videoUrl,
                s3Key: key,
                status: 'PROCESSING',
            })
            .returning();

        // TODO: Add to video processing queue

        logger.info(`Upload confirmed: ${submission.id}`);

        res.status(201).json({ submission });
    })
);

export default router;
