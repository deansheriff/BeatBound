import { z } from 'zod';

// Auth schemas
export const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    displayName: z.string().min(1).max(100).optional(),
    role: z.enum(['FAN', 'ARTIST', 'PRODUCER']).default('FAN'),
});

export const loginSchema = z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
});

// Challenge schemas
export const createChallengeSchema = z.object({
    title: z.string().min(3).max(200),
    description: z.string().min(10).max(5000),
    genre: z.string().min(1).max(50),
    bpm: z.number().int().min(60).max(300).optional(),
    beatUrl: z.string().url(),
    coverImageUrl: z.string().url().optional(),
    rules: z.string().max(10000).optional(),
    prizeAmount: z.number().min(0).default(0),
    maxSubmissions: z.number().int().min(1).max(1000).default(100),
    submissionDeadline: z.string().datetime(),
    votingDeadline: z.string().datetime(),
    winnerSelection: z.enum(['VOTES', 'PRODUCER_PICK', 'HYBRID']).default('VOTES'),
});

export const updateChallengeSchema = createChallengeSchema.partial();

// Submission schemas
export const createSubmissionSchema = z.object({
    challengeId: z.string().uuid(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional(),
    videoUrl: z.string().url(),
});

export const updateSubmissionSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(2000).optional(),
});

// Vote schema
export const createVoteSchema = z.object({
    submissionId: z.string().uuid(),
});

// Report schema
export const createReportSchema = z.object({
    contentType: z.enum(['CHALLENGE', 'SUBMISSION', 'USER']),
    contentId: z.string().uuid(),
    reason: z.enum(['SPAM', 'INAPPROPRIATE', 'COPYRIGHT', 'HARASSMENT', 'OTHER']),
    description: z.string().max(1000).optional(),
});

// User profile schema
export const updateProfileSchema = z.object({
    displayName: z.string().min(1).max(100).optional(),
    bio: z.string().max(500).optional(),
    avatarUrl: z.string().url().optional(),
    socialLinks: z.record(z.string().url()).optional(),
});

// Pagination schema
export const paginationSchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
});

// Upload schema
export const presignedUrlSchema = z.object({
    challengeId: z.string().uuid(),
    fileName: z.string().min(1).max(255),
    fileType: z.enum(['video/mp4', 'video/quicktime', 'video/webm']),
});
