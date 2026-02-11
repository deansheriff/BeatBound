import { Router } from 'express';
import { eq, sql, desc, and, ilike, or } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, follows, challenges, submissions, transactions } from '@beatbound/database';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validation.js';
import { updateProfileSchema, paginationSchema } from '../utils/validators.js';
import { asyncHandler, NotFoundError } from '../middleware/error-handler.js';

const router = Router();

// GET /api/users/me/dashboard
router.get(
    '/me/dashboard',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const userId = req.user!.id;

        const [activeChallengesCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(challenges)
            .where(eq(challenges.status, 'ACTIVE'));

        const [mySubmissionsCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(submissions)
            .where(eq(submissions.artistId, userId));

        const [totalVotesResult] = await db
            .select({ total: sql<number>`COALESCE(SUM(${submissions.voteCount}), 0)::int` })
            .from(submissions)
            .where(eq(submissions.artistId, userId));

        const [earningsResult] = await db
            .select({ total: sql<string>`COALESCE(SUM(amount), 0)` })
            .from(transactions)
            .where(
                and(
                    eq(transactions.userId, userId),
                    eq(transactions.type, 'PAYOUT'),
                    eq(transactions.status, 'COMPLETED')
                )
            );

        const trendingChallenges = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                submissionCount: challenges.submissionCount,
                submissionDeadline: challenges.submissionDeadline,
                prizeAmount: challenges.prizeAmount,
                createdAt: challenges.createdAt,
            })
            .from(challenges)
            .where(eq(challenges.status, 'ACTIVE'))
            .orderBy(desc(challenges.submissionCount), desc(challenges.createdAt))
            .limit(3);

        const recentSubmissions = await db
            .select({
                id: submissions.id,
                title: submissions.title,
                voteCount: submissions.voteCount,
                createdAt: submissions.createdAt,
            })
            .from(submissions)
            .where(eq(submissions.artistId, userId))
            .orderBy(desc(submissions.createdAt))
            .limit(3);

        const recentCreatedChallenges = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                createdAt: challenges.createdAt,
            })
            .from(challenges)
            .where(eq(challenges.producerId, userId))
            .orderBy(desc(challenges.createdAt))
            .limit(3);

        const recentActivity = [
            ...recentSubmissions.map((submission) => ({
                id: `submission-${submission.id}`,
                createdAt: submission.createdAt,
                text: submission.voteCount > 0
                    ? `${submission.title} has ${submission.voteCount} vote${submission.voteCount === 1 ? '' : 's'}`
                    : `${submission.title} was submitted`,
            })),
            ...recentCreatedChallenges.map((challenge) => ({
                id: `challenge-${challenge.id}`,
                createdAt: challenge.createdAt,
                text: `New challenge "${challenge.title}" created`,
            })),
        ]
            .sort((a, b) => {
                const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
                const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 5);

        res.json({
            stats: {
                activeChallenges: activeChallengesCount?.count || 0,
                mySubmissions: mySubmissionsCount?.count || 0,
                totalVotes: totalVotesResult?.total || 0,
                earnings: parseFloat(earningsResult?.total || '0'),
            },
            trendingChallenges,
            recentActivity,
        });
    })
);

// GET /api/users/:username
router.get(
    '/:username',
    asyncHandler(async (req, res) => {
        const { username } = req.params;

        const [user] = await db
            .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                bio: users.bio,
                avatarUrl: users.avatarUrl,
                role: users.role,
                socialLinks: users.socialLinks,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (!user) {
            throw new NotFoundError('User');
        }

        // Get follower/following counts
        const followerCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(follows)
            .where(eq(follows.followingId, user.id));

        const followingCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(follows)
            .where(eq(follows.followerId, user.id));

        // Get challenge count (for producers)
        const challengeCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(challenges)
            .where(eq(challenges.producerId, user.id));

        // Get submission count (for artists)
        const submissionCount = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(submissions)
            .where(eq(submissions.artistId, user.id));

        res.json({
            user: {
                ...user,
                followerCount: followerCount[0]?.count || 0,
                followingCount: followingCount[0]?.count || 0,
                challengeCount: challengeCount[0]?.count || 0,
                submissionCount: submissionCount[0]?.count || 0,
            },
        });
    })
);

// PATCH /api/users/me
router.patch(
    '/me',
    authenticate,
    validate(updateProfileSchema),
    asyncHandler(async (req: AuthRequest, res) => {
        const { displayName, bio, avatarUrl, socialLinks } = req.body;

        const updateData: Record<string, unknown> = { updatedAt: new Date() };
        if (displayName !== undefined) updateData.displayName = displayName;
        if (bio !== undefined) updateData.bio = bio;
        if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
        if (socialLinks !== undefined) updateData.socialLinks = socialLinks;

        const [updatedUser] = await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, req.user!.id))
            .returning({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.displayName,
                bio: users.bio,
                avatarUrl: users.avatarUrl,
                role: users.role,
                socialLinks: users.socialLinks,
            });

        res.json({ user: updatedUser });
    })
);

// POST /api/users/:username/follow
router.post(
    '/:username/follow',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { username } = req.params;

        const [targetUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (!targetUser) {
            throw new NotFoundError('User');
        }

        if (targetUser.id === req.user!.id) {
            return res.status(400).json({
                error: 'BadRequest',
                message: 'You cannot follow yourself',
            });
        }

        // Check if already following
        const existingFollow = await db
            .select({ id: follows.id })
            .from(follows)
            .where(
                and(
                    eq(follows.followerId, req.user!.id),
                    eq(follows.followingId, targetUser.id)
                )
            )
            .limit(1);

        if (existingFollow.length > 0) {
            return res.status(400).json({
                error: 'BadRequest',
                message: 'You are already following this user',
            });
        }

        await db.insert(follows).values({
            followerId: req.user!.id,
            followingId: targetUser.id,
        });

        res.json({ message: 'Successfully followed user' });
    })
);

// DELETE /api/users/:username/follow
router.delete(
    '/:username/follow',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { username } = req.params;

        const [targetUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (!targetUser) {
            throw new NotFoundError('User');
        }

        await db
            .delete(follows)
            .where(
                and(
                    eq(follows.followerId, req.user!.id),
                    eq(follows.followingId, targetUser.id)
                )
            );

        res.json({ message: 'Successfully unfollowed user' });
    })
);

// GET /api/users/:username/followers
router.get(
    '/:username/followers',
    asyncHandler(async (req, res) => {
        const { username } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const [targetUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (!targetUser) {
            throw new NotFoundError('User');
        }

        const offset = (Number(page) - 1) * Number(limit);

        const followersList = await db
            .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                followedAt: follows.createdAt,
            })
            .from(follows)
            .innerJoin(users, eq(follows.followerId, users.id))
            .where(eq(follows.followingId, targetUser.id))
            .orderBy(desc(follows.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ followers: followersList });
    })
);

// GET /api/users/:username/following
router.get(
    '/:username/following',
    asyncHandler(async (req, res) => {
        const { username } = req.params;
        const { page = 1, limit = 20 } = req.query;

        const [targetUser] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.username, username.toLowerCase()))
            .limit(1);

        if (!targetUser) {
            throw new NotFoundError('User');
        }

        const offset = (Number(page) - 1) * Number(limit);

        const followingList = await db
            .select({
                id: users.id,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                followedAt: follows.createdAt,
            })
            .from(follows)
            .innerJoin(users, eq(follows.followingId, users.id))
            .where(eq(follows.followerId, targetUser.id))
            .orderBy(desc(follows.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ following: followingList });
    })
);

export default router;
