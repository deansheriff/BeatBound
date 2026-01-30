import { Router } from 'express';
import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users } from '@beatbound/database';
import { generateTokens, verifyRefreshToken } from '../utils/jwt.js';
import { hashPassword, comparePassword } from '../utils/password.js';
import { validate } from '../middleware/validation.js';
import { registerSchema, loginSchema } from '../utils/validators.js';
import { authLimiter, registerLimiter } from '../middleware/rate-limit.js';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/auth/register
router.post(
    '/register',
    registerLimiter,
    validate(registerSchema),
    asyncHandler(async (req, res) => {
        const { email, password, username, displayName, role } = req.body;

        // Check if email exists
        const existingEmail = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (existingEmail.length > 0) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Email already registered',
            });
        }

        // Check if username exists
        const existingUsername = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (existingUsername.length > 0) {
            return res.status(400).json({
                error: 'ValidationError',
                message: 'Username already taken',
            });
        }

        // Hash password
        const passwordHash = await hashPassword(password);

        // Create user
        const [newUser] = await db
            .insert(users)
            .values({
                email: email.toLowerCase(),
                passwordHash,
                username: username.toLowerCase(),
                displayName: displayName || username,
                role,
            })
            .returning({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.displayName,
                role: users.role,
                createdAt: users.createdAt,
            });

        logger.info(`New user registered: ${newUser.email}`);

        // Generate tokens
        const tokens = generateTokens(newUser.id);

        res.status(201).json({
            user: newUser,
            ...tokens,
        });
    })
);

// POST /api/auth/login
router.post(
    '/login',
    authLimiter,
    validate(loginSchema),
    asyncHandler(async (req, res) => {
        const { email, password } = req.body;

        // Find user
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email.toLowerCase()))
            .limit(1);

        if (!user) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials',
            });
        }

        // Check if suspended
        if (user.suspended) {
            return res.status(403).json({
                error: 'AccountSuspended',
                message: 'Your account has been suspended',
                reason: user.suspensionReason,
            });
        }

        // Verify password
        const validPassword = await comparePassword(password, user.passwordHash);

        if (!validPassword) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid credentials',
            });
        }

        // Update last login
        await db
            .update(users)
            .set({ lastLoginAt: new Date() })
            .where(eq(users.id, user.id));

        logger.info(`User logged in: ${user.email}`);

        // Generate tokens
        const tokens = generateTokens(user.id);

        res.json({
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                bio: user.bio,
                avatarUrl: user.avatarUrl,
                role: user.role,
                stripeOnboardingComplete: user.stripeOnboardingComplete,
            },
            ...tokens,
        });
    })
);

// POST /api/auth/refresh
router.post(
    '/refresh',
    asyncHandler(async (req, res) => {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'Unauthorized',
                message: 'Refresh token required',
            });
        }

        try {
            const userId = verifyRefreshToken(refreshToken);

            // Verify user still exists and is not suspended
            const [user] = await db
                .select({ id: users.id, suspended: users.suspended })
                .from(users)
                .where(eq(users.id, userId))
                .limit(1);

            if (!user || user.suspended) {
                return res.status(401).json({
                    error: 'Unauthorized',
                    message: 'Invalid refresh token',
                });
            }

            const tokens = generateTokens(userId);
            res.json(tokens);
        } catch {
            res.status(401).json({
                error: 'Unauthorized',
                message: 'Invalid refresh token',
            });
        }
    })
);

// GET /api/auth/me
router.get(
    '/me',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const [user] = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.displayName,
                bio: users.bio,
                avatarUrl: users.avatarUrl,
                role: users.role,
                socialLinks: users.socialLinks,
                stripeOnboardingComplete: users.stripeOnboardingComplete,
                emailVerified: users.emailVerified,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.id, req.user!.id))
            .limit(1);

        res.json({ user });
    })
);

// POST /api/auth/logout
router.post('/logout', authenticate, (req, res) => {
    // In a real app, you would invalidate the refresh token in Redis
    res.json({ message: 'Logged out successfully' });
});

export default router;
