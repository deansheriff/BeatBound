import { pgTable, uuid, varchar, text, timestamp, pgEnum, integer, boolean, decimal, uniqueIndex } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const userRoleEnum = pgEnum('user_role', ['PRODUCER', 'ARTIST', 'FAN']);
export const challengeTierEnum = pgEnum('challenge_tier', ['FREE', 'PAID']);
export const escrowStatusEnum = pgEnum('escrow_status', ['PENDING', 'FUNDED', 'RELEASED', 'REFUNDED']);
export const submissionStatusEnum = pgEnum('submission_status', ['PROCESSING', 'ACTIVE', 'REJECTED']);
export const payoutStatusEnum = pgEnum('payout_status', ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED']);

// Users Table
export const users = pgTable('users', {
    id: uuid('id').primaryKey().defaultRandom(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    username: varchar('username', { length: 50 }).notNull().unique(),
    displayName: varchar('display_name', { length: 100 }),
    role: userRoleEnum('role').notNull().default('FAN'),
    avatarUrl: text('avatar_url'),
    bio: text('bio'),
    stripeAccountId: varchar('stripe_account_id', { length: 255 }),
    stripeOnboardingComplete: boolean('stripe_onboarding_complete').default(false),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Challenges Table
export const challenges = pgTable('challenges', {
    id: uuid('id').primaryKey().defaultRandom(),
    title: varchar('title', { length: 200 }).notNull(),
    description: text('description'),
    beatFileUrl: text('beat_file_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    prizeAmount: decimal('prize_amount', { precision: 10, scale: 2 }),
    tier: challengeTierEnum('tier').notNull().default('FREE'),
    rules: text('rules'),
    startDate: timestamp('start_date').defaultNow().notNull(),
    endDate: timestamp('end_date').notNull(),
    producerId: uuid('producer_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    escrowStatus: escrowStatusEnum('escrow_status').default('PENDING'),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    isActive: boolean('is_active').default(true),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Submissions Table
export const submissions = pgTable('submissions', {
    id: uuid('id').primaryKey().defaultRandom(),
    videoUrl: text('video_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    title: varchar('title', { length: 200 }),
    description: text('description'),
    artistId: uuid('artist_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    voteCount: integer('vote_count').default(0).notNull(),
    status: submissionStatusEnum('status').default('PROCESSING'),
    processingJobId: varchar('processing_job_id', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Votes (Hype) Table
export const votes = pgTable('votes', {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    submissionId: uuid('submission_id').notNull().references(() => submissions.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
    uniqueVote: uniqueIndex('unique_vote_idx').on(table.userId, table.submissionId),
}));

// Transactions Table
export const transactions = pgTable('transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    challengeId: uuid('challenge_id').notNull().references(() => challenges.id, { onDelete: 'cascade' }),
    stripePaymentIntentId: varchar('stripe_payment_intent_id', { length: 255 }),
    stripeTransferId: varchar('stripe_transfer_id', { length: 255 }),
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    escrowStatus: escrowStatusEnum('escrow_status').default('PENDING'),
    winnerId: uuid('winner_id').references(() => users.id),
    payoutStatus: payoutStatusEnum('payout_status').default('PENDING'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
    challenges: many(challenges),
    submissions: many(submissions),
    votes: many(votes),
}));

export const challengesRelations = relations(challenges, ({ one, many }) => ({
    producer: one(users, {
        fields: [challenges.producerId],
        references: [users.id],
    }),
    submissions: many(submissions),
    transactions: many(transactions),
}));

export const submissionsRelations = relations(submissions, ({ one, many }) => ({
    artist: one(users, {
        fields: [submissions.artistId],
        references: [users.id],
    }),
    challenge: one(challenges, {
        fields: [submissions.challengeId],
        references: [challenges.id],
    }),
    votes: many(votes),
}));

export const votesRelations = relations(votes, ({ one }) => ({
    user: one(users, {
        fields: [votes.userId],
        references: [users.id],
    }),
    submission: one(submissions, {
        fields: [votes.submissionId],
        references: [submissions.id],
    }),
}));

export const transactionsRelations = relations(transactions, ({ one }) => ({
    challenge: one(challenges, {
        fields: [transactions.challengeId],
        references: [challenges.id],
    }),
    winner: one(users, {
        fields: [transactions.winnerId],
        references: [users.id],
    }),
}));

// Type exports for use in application
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Challenge = typeof challenges.$inferSelect;
export type NewChallenge = typeof challenges.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Vote = typeof votes.$inferSelect;
export type NewVote = typeof votes.$inferInsert;
export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
