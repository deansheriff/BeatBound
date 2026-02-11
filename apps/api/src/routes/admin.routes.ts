import { Router } from 'express';
import { eq, sql, desc, and, ilike, or } from 'drizzle-orm';
import { db } from '../config/database.js';
import {
    users,
    challenges,
    submissions,
    reports,
    transactions,
    auditLogs,
    userRoleEnum,
    challengeStatusEnum,
    reportStatusEnum,
    transactionTypeEnum,
} from '@beatbound/database';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/rbac.js';
import { asyncHandler, NotFoundError, BadRequestError } from '../middleware/error-handler.js';
import { logger } from '../utils/logger.js';

const router = Router();

type UserRole = (typeof userRoleEnum.enumValues)[number];
type ChallengeStatus = (typeof challengeStatusEnum.enumValues)[number];
type ReportStatus = (typeof reportStatusEnum.enumValues)[number];
type TransactionType = (typeof transactionTypeEnum.enumValues)[number];

function isUserRole(value: unknown): value is UserRole {
    return typeof value === 'string' && userRoleEnum.enumValues.includes(value as UserRole);
}

function isChallengeStatus(value: unknown): value is ChallengeStatus {
    return typeof value === 'string' && challengeStatusEnum.enumValues.includes(value as ChallengeStatus);
}

function isReportStatus(value: unknown): value is ReportStatus {
    return typeof value === 'string' && reportStatusEnum.enumValues.includes(value as ReportStatus);
}

function isTransactionType(value: unknown): value is TransactionType {
    return typeof value === 'string' && transactionTypeEnum.enumValues.includes(value as TransactionType);
}

// Apply admin middleware to all routes
router.use(authenticate, requireAdmin);

// ============================================
// USER MANAGEMENT
// ============================================

// GET /api/admin/users
router.get(
    '/users',
    asyncHandler(async (req: AuthRequest, res) => {
        const { page = 1, limit = 20, role, search, suspended } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const conditions = [];

        if (isUserRole(role)) {
            conditions.push(eq(users.role, role));
        }

        if (suspended !== undefined) {
            conditions.push(eq(users.suspended, suspended === 'true'));
        }

        if (search) {
            conditions.push(
                or(
                    ilike(users.email, `%${search}%`),
                    ilike(users.username, `%${search}%`),
                    ilike(users.displayName, `%${search}%`)
                )
            );
        }

        const userList = await db
            .select({
                id: users.id,
                email: users.email,
                username: users.username,
                displayName: users.displayName,
                avatarUrl: users.avatarUrl,
                role: users.role,
                suspended: users.suspended,
                emailVerified: users.emailVerified,
                stripeOnboardingComplete: users.stripeOnboardingComplete,
                lastLoginAt: users.lastLoginAt,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(users.createdAt))
            .limit(Number(limit))
            .offset(offset);

        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(conditions.length > 0 ? and(...conditions) : undefined);

        res.json({
            users: userList,
            pagination: {
                page: Number(page),
                limit: Number(limit),
                total: countResult?.count || 0,
                totalPages: Math.ceil((countResult?.count || 0) / Number(limit)),
            },
        });
    })
);

// GET /api/admin/users/:id
router.get(
    '/users/:id',
    asyncHandler(async (req, res) => {
        const { id } = req.params;

        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!user) {
            throw new NotFoundError('User');
        }

        // Get stats
        const [challengeCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(challenges)
            .where(eq(challenges.producerId, id));

        const [submissionCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(submissions)
            .where(eq(submissions.artistId, id));

        res.json({
            user: {
                ...user,
                passwordHash: undefined, // Don't expose
                challengeCount: challengeCount?.count || 0,
                submissionCount: submissionCount?.count || 0,
            },
        });
    })
);

// PATCH /api/admin/users/:id/suspend
router.patch(
    '/users/:id/suspend',
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;
        const { suspended, reason } = req.body;

        const [user] = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!user) {
            throw new NotFoundError('User');
        }

        // Can't suspend admins
        if (user.role === 'ADMIN') {
            throw new BadRequestError('Cannot suspend admin users');
        }

        await db
            .update(users)
            .set({
                suspended,
                suspensionReason: suspended ? reason : null,
                updatedAt: new Date(),
            })
            .where(eq(users.id, id));

        // Audit log
        await db.insert(auditLogs).values({
            adminId: req.user!.id,
            action: suspended ? 'USER_SUSPENDED' : 'USER_UNSUSPENDED',
            targetType: 'USER',
            targetId: id,
            details: { reason },
            ipAddress: req.ip,
        });

        logger.info(`User ${id} ${suspended ? 'suspended' : 'unsuspended'} by ${req.user!.id}`);

        res.json({ message: `User ${suspended ? 'suspended' : 'unsuspended'}` });
    })
);

// PATCH /api/admin/users/:id/role
router.patch(
    '/users/:id/role',
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;
        const { role } = req.body;

        if (!['FAN', 'ARTIST', 'PRODUCER', 'ADMIN'].includes(role)) {
            throw new BadRequestError('Invalid role');
        }

        const [user] = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.id, id))
            .limit(1);

        if (!user) {
            throw new NotFoundError('User');
        }

        const oldRole = user.role;

        await db
            .update(users)
            .set({ role, updatedAt: new Date() })
            .where(eq(users.id, id));

        // Audit log
        await db.insert(auditLogs).values({
            adminId: req.user!.id,
            action: 'USER_ROLE_CHANGED',
            targetType: 'USER',
            targetId: id,
            details: { oldRole, newRole: role },
            ipAddress: req.ip,
        });

        logger.info(`User ${id} role changed from ${oldRole} to ${role} by ${req.user!.id}`);

        res.json({ message: 'Role updated', oldRole, newRole: role });
    })
);

// ============================================
// CHALLENGE MANAGEMENT
// ============================================

// GET /api/admin/challenges
router.get(
    '/challenges',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const conditions = [];
        if (status !== 'all' && isChallengeStatus(status)) {
            conditions.push(eq(challenges.status, status));
        }

        const challengeList = await db
            .select({
                id: challenges.id,
                title: challenges.title,
                genre: challenges.genre,
                status: challenges.status,
                prizeAmount: challenges.prizeAmount,
                submissionCount: challenges.submissionCount,
                createdAt: challenges.createdAt,
                producer: {
                    id: users.id,
                    username: users.username,
                    email: users.email,
                },
            })
            .from(challenges)
            .innerJoin(users, eq(challenges.producerId, users.id))
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(challenges.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ challenges: challengeList });
    })
);

// PATCH /api/admin/challenges/:id/cancel
router.patch(
    '/challenges/:id/cancel',
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;
        const { reason } = req.body;

        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, id))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        await db
            .update(challenges)
            .set({ status: 'CANCELLED', updatedAt: new Date() })
            .where(eq(challenges.id, id));

        // Audit log
        await db.insert(auditLogs).values({
            adminId: req.user!.id,
            action: 'CHALLENGE_CANCELLED',
            targetType: 'CHALLENGE',
            targetId: id,
            details: { reason },
            ipAddress: req.ip,
        });

        logger.info(`Challenge ${id} cancelled by ${req.user!.id}`);

        res.json({ message: 'Challenge cancelled' });
    })
);

// ============================================
// REPORTS
// ============================================

// GET /api/admin/reports
router.get(
    '/reports',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 20, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        const reportStatus = isReportStatus(status) ? status : 'PENDING';

        const reportList = await db
            .select({
                id: reports.id,
                contentType: reports.contentType,
                contentId: reports.contentId,
                reason: reports.reason,
                description: reports.description,
                status: reports.status,
                createdAt: reports.createdAt,
                reporter: {
                    id: users.id,
                    username: users.username,
                    email: users.email,
                },
            })
            .from(reports)
            .innerJoin(users, eq(reports.reporterId, users.id))
            .where(eq(reports.status, reportStatus))
            .orderBy(desc(reports.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ reports: reportList });
    })
);

// PATCH /api/admin/reports/:id/resolve
router.patch(
    '/reports/:id/resolve',
    asyncHandler(async (req: AuthRequest, res) => {
        const { id } = req.params;
        const { status, notes } = req.body;

        if (!['RESOLVED', 'DISMISSED'].includes(status)) {
            throw new BadRequestError('Invalid status');
        }

        await db
            .update(reports)
            .set({
                status,
                resolvedById: req.user!.id,
                resolutionNotes: notes,
                resolvedAt: new Date(),
            })
            .where(eq(reports.id, id));

        res.json({ message: 'Report resolved' });
    })
);

// ============================================
// FINANCIALS
// ============================================

// GET /api/admin/financials/overview
router.get(
    '/financials/overview',
    asyncHandler(async (req, res) => {
        // Total escrow (active challenges)
        const [escrowResult] = await db
            .select({
                total: sql<string>`COALESCE(SUM(prize_amount), 0)`,
            })
            .from(challenges)
            .where(eq(challenges.status, 'ACTIVE'));

        // Total payouts
        const [payoutResult] = await db
            .select({
                total: sql<string>`COALESCE(SUM(amount), 0)`,
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.type, 'PAYOUT'),
                    eq(transactions.status, 'COMPLETED')
                )
            );

        // Platform fees collected
        const [feesResult] = await db
            .select({
                total: sql<string>`COALESCE(SUM(amount), 0)`,
            })
            .from(transactions)
            .where(
                and(
                    eq(transactions.type, 'PLATFORM_FEE'),
                    eq(transactions.status, 'COMPLETED')
                )
            );

        res.json({
            totalEscrow: parseFloat(escrowResult?.total || '0'),
            totalPayouts: parseFloat(payoutResult?.total || '0'),
            platformFees: parseFloat(feesResult?.total || '0'),
        });
    })
);

// GET /api/admin/financials/transactions
router.get(
    '/financials/transactions',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 50, type } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const conditions = [];
        if (isTransactionType(type)) {
            conditions.push(eq(transactions.type, type));
        }

        const txList = await db
            .select()
            .from(transactions)
            .where(conditions.length > 0 ? and(...conditions) : undefined)
            .orderBy(desc(transactions.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ transactions: txList });
    })
);

// ============================================
// AUDIT LOGS
// ============================================

// GET /api/admin/audit-logs
router.get(
    '/audit-logs',
    asyncHandler(async (req, res) => {
        const { page = 1, limit = 50 } = req.query;
        const offset = (Number(page) - 1) * Number(limit);

        const logs = await db
            .select({
                id: auditLogs.id,
                action: auditLogs.action,
                targetType: auditLogs.targetType,
                targetId: auditLogs.targetId,
                details: auditLogs.details,
                ipAddress: auditLogs.ipAddress,
                createdAt: auditLogs.createdAt,
                admin: {
                    id: users.id,
                    username: users.username,
                    email: users.email,
                },
            })
            .from(auditLogs)
            .innerJoin(users, eq(auditLogs.adminId, users.id))
            .orderBy(desc(auditLogs.createdAt))
            .limit(Number(limit))
            .offset(offset);

        res.json({ logs });
    })
);

export default router;
