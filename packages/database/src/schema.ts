import {
    pgTable,
    uuid,
    varchar,
    text,
    timestamp,
    boolean,
    integer,
    decimal,
    pgEnum,
    index,
    uniqueIndex,
    jsonb,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ============================================
// ENUMS
// ============================================

export const userRoleEnum = pgEnum('user_role', [
    'FAN',
    'ARTIST',
    'PRODUCER',
    'ADMIN',
]);

export const challengeStatusEnum = pgEnum('challenge_status', [
    'DRAFT',
    'ACTIVE',
    'VOTING',
    'ENDED',
    'CANCELLED',
]);

export const submissionStatusEnum = pgEnum('submission_status', [
    'PROCESSING',
    'READY',
    'FAILED',
    'DISQUALIFIED',
]);

export const winnerSelectionEnum = pgEnum('winner_selection', [
    'VOTES',
    'PRODUCER_PICK',
    'HYBRID',
]);

export const transactionTypeEnum = pgEnum('transaction_type', [
    'ESCROW',
    'PAYOUT',
    'REFUND',
    'PLATFORM_FEE',
]);

export const transactionStatusEnum = pgEnum('transaction_status', [
    'PENDING',
    'COMPLETED',
    'FAILED',
    'REFUNDED',
]);

export const reportReasonEnum = pgEnum('report_reason', [
    'SPAM',
    'INAPPROPRIATE',
    'COPYRIGHT',
    'HARASSMENT',
    'OTHER',
]);

export const reportStatusEnum = pgEnum('report_status', [
    'PENDING',
    'RESOLVED',
    'DISMISSED',
]);

export const contentTypeEnum = pgEnum('content_type', [
    'CHALLENGE',
    'SUBMISSION',
    'USER',
]);

export const notificationTypeEnum = pgEnum('notification_type', [
    'CHALLENGE_UPDATE',
    'SUBMISSION_UPDATE',
    'VOTE_RECEIVED',
    'WINNER_ANNOUNCED',
    'PAYOUT_PROCESSED',
    'SYSTEM',
]);

// ============================================
// TABLES
// ============================================

// Users table
export const users = pgTable(
    'users',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        email: varchar('email', { length: 255 }).notNull().unique(),
        passwordHash: varchar('password_hash', { length: 255 }).notNull(),
        username: varchar('username', { length: 50 }).notNull().unique(),
        displayName: varchar('display_name', { length: 100 }),
        bio: text('bio'),
        avatarUrl: varchar('avatar_url', { length: 500 }),
        role: userRoleEnum('role').notNull().default('FAN'),
        emailVerified: boolean('email_verified').notNull().default(false),
        stripeAccountId: varchar('stripe_account_id', { length: 255 }),
        stripeOnboardingComplete: boolean('stripe_onboarding_complete')
            .notNull()
            .default(false),
        socialLinks: jsonb('social_links').$type<Record<string, string>>(),
        suspended: boolean('suspended').notNull().default(false),
        suspensionReason: text('suspension_reason'),
        lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        emailIdx: uniqueIndex('users_email_idx').on(table.email),
        usernameIdx: uniqueIndex('users_username_idx').on(table.username),
        roleIdx: index('users_role_idx').on(table.role),
    })
);

// Challenges table
export const challenges = pgTable(
    'challenges',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        producerId: uuid('producer_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        title: varchar('title', { length: 200 }).notNull(),
        description: text('description').notNull(),
        genre: varchar('genre', { length: 50 }).notNull(),
        bpm: integer('bpm'),
        beatUrl: varchar('beat_url', { length: 500 }).notNull(),
        coverImageUrl: varchar('cover_image_url', { length: 500 }),
        rules: text('rules'),
        status: challengeStatusEnum('status').notNull().default('DRAFT'),
        prizeAmount: decimal('prize_amount', { precision: 10, scale: 2 })
            .notNull()
            .default('0'),
        platformFee: decimal('platform_fee', { precision: 10, scale: 2 })
            .notNull()
            .default('0'),
        maxSubmissions: integer('max_submissions').notNull().default(100),
        submissionCount: integer('submission_count').notNull().default(0),
        viewCount: integer('view_count').notNull().default(0),
        submissionDeadline: timestamp('submission_deadline', { withTimezone: true }),
        votingDeadline: timestamp('voting_deadline', { withTimezone: true }),
        winnerSelection: winnerSelectionEnum('winner_selection')
            .notNull()
            .default('VOTES'),
        winnerId: uuid('winner_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        winnerSubmissionId: uuid('winner_submission_id'),
        stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        producerIdx: index('challenges_producer_idx').on(table.producerId),
        statusIdx: index('challenges_status_idx').on(table.status),
        genreIdx: index('challenges_genre_idx').on(table.genre),
        deadlineIdx: index('challenges_deadline_idx').on(table.submissionDeadline),
    })
);

// Submissions table
export const submissions = pgTable(
    'submissions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        challengeId: uuid('challenge_id')
            .notNull()
            .references(() => challenges.id, { onDelete: 'cascade' }),
        artistId: uuid('artist_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        title: varchar('title', { length: 200 }).notNull(),
        description: text('description'),
        videoUrl: varchar('video_url', { length: 500 }).notNull(),
        thumbnailUrl: varchar('thumbnail_url', { length: 500 }),
        s3Key: varchar('s3_key', { length: 500 }),
        status: submissionStatusEnum('status').notNull().default('PROCESSING'),
        duration: integer('duration'), // in seconds
        videoWidth: integer('video_width'),
        videoHeight: integer('video_height'),
        fileSize: integer('file_size'), // in bytes
        voteCount: integer('vote_count').notNull().default(0),
        viewCount: integer('view_count').notNull().default(0),
        rank: integer('rank'),
        isWinner: boolean('is_winner').notNull().default(false),
        disqualified: boolean('disqualified').notNull().default(false),
        disqualifiedReason: text('disqualified_reason'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        challengeIdx: index('submissions_challenge_idx').on(table.challengeId),
        artistIdx: index('submissions_artist_idx').on(table.artistId),
        statusIdx: index('submissions_status_idx').on(table.status),
        voteCountIdx: index('submissions_vote_count_idx').on(table.voteCount),
        challengeArtistIdx: uniqueIndex('submissions_challenge_artist_idx').on(
            table.challengeId,
            table.artistId
        ),
    })
);

// Votes table
export const votes = pgTable(
    'votes',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        submissionId: uuid('submission_id')
            .notNull()
            .references(() => submissions.id, { onDelete: 'cascade' }),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        ipAddress: varchar('ip_address', { length: 45 }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        submissionIdx: index('votes_submission_idx').on(table.submissionId),
        userIdx: index('votes_user_idx').on(table.userId),
        uniqueVoteIdx: uniqueIndex('votes_unique_idx').on(
            table.submissionId,
            table.userId
        ),
    })
);

// Transactions table
export const transactions = pgTable(
    'transactions',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        challengeId: uuid('challenge_id')
            .notNull()
            .references(() => challenges.id, { onDelete: 'cascade' }),
        userId: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
        type: transactionTypeEnum('type').notNull(),
        status: transactionStatusEnum('status').notNull().default('PENDING'),
        amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
        currency: varchar('currency', { length: 3 }).notNull().default('USD'),
        stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
        stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
        stripeRefundId: varchar('stripe_refund_id', { length: 255 }),
        metadata: jsonb('metadata').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        challengeIdx: index('transactions_challenge_idx').on(table.challengeId),
        userIdx: index('transactions_user_idx').on(table.userId),
        typeIdx: index('transactions_type_idx').on(table.type),
        statusIdx: index('transactions_status_idx').on(table.status),
    })
);

// Follows table
export const follows = pgTable(
    'follows',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        followerId: uuid('follower_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        followingId: uuid('following_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        followerIdx: index('follows_follower_idx').on(table.followerId),
        followingIdx: index('follows_following_idx').on(table.followingId),
        uniqueFollowIdx: uniqueIndex('follows_unique_idx').on(
            table.followerId,
            table.followingId
        ),
    })
);

// Notifications table
export const notifications = pgTable(
    'notifications',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        userId: uuid('user_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        type: notificationTypeEnum('type').notNull(),
        title: varchar('title', { length: 200 }).notNull(),
        message: text('message').notNull(),
        link: varchar('link', { length: 500 }),
        read: boolean('read').notNull().default(false),
        metadata: jsonb('metadata').$type<Record<string, unknown>>(),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        userIdx: index('notifications_user_idx').on(table.userId),
        readIdx: index('notifications_read_idx').on(table.read),
        createdAtIdx: index('notifications_created_at_idx').on(table.createdAt),
    })
);

// Reports table
export const reports = pgTable(
    'reports',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        reporterId: uuid('reporter_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        contentType: contentTypeEnum('content_type').notNull(),
        contentId: uuid('content_id').notNull(),
        reason: reportReasonEnum('reason').notNull(),
        description: text('description'),
        status: reportStatusEnum('status').notNull().default('PENDING'),
        resolvedById: uuid('resolved_by_id').references(() => users.id, {
            onDelete: 'set null',
        }),
        resolutionNotes: text('resolution_notes'),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
        resolvedAt: timestamp('resolved_at', { withTimezone: true }),
    },
    (table) => ({
        reporterIdx: index('reports_reporter_idx').on(table.reporterId),
        contentTypeIdx: index('reports_content_type_idx').on(table.contentType),
        statusIdx: index('reports_status_idx').on(table.status),
    })
);

// Audit Logs table
export const auditLogs = pgTable(
    'audit_logs',
    {
        id: uuid('id').defaultRandom().primaryKey(),
        adminId: uuid('admin_id')
            .notNull()
            .references(() => users.id, { onDelete: 'cascade' }),
        action: varchar('action', { length: 100 }).notNull(),
        targetType: varchar('target_type', { length: 50 }).notNull(),
        targetId: uuid('target_id').notNull(),
        details: jsonb('details').$type<Record<string, unknown>>(),
        ipAddress: varchar('ip_address', { length: 45 }),
        createdAt: timestamp('created_at', { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (table) => ({
        adminIdx: index('audit_logs_admin_idx').on(table.adminId),
        actionIdx: index('audit_logs_action_idx').on(table.action),
        targetIdx: index('audit_logs_target_idx').on(table.targetType, table.targetId),
        createdAtIdx: index('audit_logs_created_at_idx').on(table.createdAt),
    })
);

// ============================================
// RELATIONS
// ============================================

export const usersRelations = relations(users, ({ many }) => ({
    challenges: many(challenges),
    submissions: many(submissions),
    votes: many(votes),
    transactions: many(transactions),
    notifications: many(notifications),
    following: many(follows, { relationName: 'following' }),
    followers: many(follows, { relationName: 'followers' }),
    reports: many(reports, { relationName: 'reported' }),
    auditLogs: many(auditLogs),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
    producer: one(users, {
        fields: [challenges.producerId],
        references: [users.id],
    }),
    winner: one(users, {
        fields: [challenges.winnerId],
        references: [users.id],
        relationName: 'challengeWinner',
    }),
    submissions: many(submissions),
    transactions: many(transactions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
    challenge: one(challenges, {
        fields: [submissions.challengeId],
        references: [challenges.id],
    }),
    artist: one(users, {
        fields: [submissions.artistId],
        references: [users.id],
    }),
    votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
    submission: one(submissions, {
        fields: [votes.submissionId],
        references: [submissions.id],
    }),
    user: one(users, {
        fields: [votes.userId],
        references: [users.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    challenge: one(challenges, {
        fields: [transactions.challengeId],
        references: [challenges.id],
    }),
    user: one(users, {
        fields: [transactions.userId],
        references: [users.id],
    }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
    follower: one(users, {
        fields: [follows.followerId],
        references: [users.id],
        relationName: 'following',
    }),
    following: one(users, {
        fields: [follows.followingId],
        references: [users.id],
        relationName: 'followers',
    }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
    user: one(users, {
        fields: [notifications.userId],
        references: [users.id],
    }),
}));

export const reportsRelations = relations(reports, ({ one }) => ({
    reporter: one(users, {
        fields: [reports.reporterId],
        references: [users.id],
        relationName: 'reported',
    }),
    resolvedBy: one(users, {
        fields: [reports.resolvedById],
        references: [users.id],
        relationName: 'resolvedReports',
    }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
    admin: one(users, {
        fields: [auditLogs.adminId],
        references: [users.id],
    }),
}));
