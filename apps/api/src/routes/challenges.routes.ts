import Elysia from 'elysia';
import { db } from '../db';
import { challenges, submissions, users } from '../db/schema';
import { eq, desc, and, gte, lte, sql } from 'drizzle-orm';
import { authMiddleware, requireAuth, requireRole } from './auth.routes';
import { storage } from '../lib/storage';
import { payments } from '../lib/stripe';

export const challengeRoutes = new Elysia({ prefix: '/challenges' })
    .use(authMiddleware)
    // List all challenges
    .get('/', async ({ query }) => {
        const { tier, active, limit = '20', offset = '0' } = query as {
            tier?: 'FREE' | 'PAID';
            active?: 'true' | 'false';
            limit?: string;
            offset?: string;
        };

        const now = new Date();
        const conditions = [];

        if (tier) {
            conditions.push(eq(challenges.tier, tier));
        }

        if (active === 'true') {
            conditions.push(eq(challenges.isActive, true));
            conditions.push(gte(challenges.endDate, now));
        } else if (active === 'false') {
            conditions.push(lte(challenges.endDate, now));
        }

        const results = await db.query.challenges.findMany({
            where: conditions.length > 0 ? and(...conditions) : undefined,
            with: {
                producer: {
                    columns: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
            },
            orderBy: desc(challenges.createdAt),
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        // Get submission counts
        const challengeIds = results.map((c) => c.id);
        const submissionCounts = await db
            .select({
                challengeId: submissions.challengeId,
                count: sql<number>`count(*)::int`,
            })
            .from(submissions)
            .where(sql`${submissions.challengeId} = ANY(${challengeIds})`)
            .groupBy(submissions.challengeId);

        const countMap = new Map(submissionCounts.map((s) => [s.challengeId, s.count]));

        return results.map((challenge) => ({
            ...challenge,
            submissionCount: countMap.get(challenge.id) || 0,
        }));
    })
    // Get single challenge with submissions
    .get('/:id', async ({ params, set }) => {
        const { id } = params;

        const challenge = await db.query.challenges.findFirst({
            where: eq(challenges.id, id),
            with: {
                producer: {
                    columns: {
                        id: true,
                        username: true,
                        displayName: true,
                        avatarUrl: true,
                    },
                },
                submissions: {
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
                    orderBy: desc(submissions.voteCount),
                },
            },
        });

        if (!challenge) {
            set.status = 404;
            return { error: 'Challenge not found' };
        }

        return challenge;
    })
    // Create a challenge (Producer only)
    .post('/', async ({ body, user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);

            const {
                title,
                description,
                beatFileName,
                beatContentType,
                prizeAmount,
                tier,
                rules,
                endDate,
            } = body as {
                title: string;
                description?: string;
                beatFileName: string;
                beatContentType: string;
                prizeAmount?: number;
                tier: 'FREE' | 'PAID';
                rules?: string;
                endDate: string;
            };

            // Validate paid challenge has prize amount
            if (tier === 'PAID' && (!prizeAmount || prizeAmount <= 0)) {
                set.status = 400;
                return { error: 'Paid challenges must have a prize amount' };
            }

            // Generate upload URL for beat file
            const beatKey = storage.generateKey('beat', authedUser.id, beatFileName);
            const uploadData = await storage.getUploadUrl(beatKey, beatContentType);

            // Create challenge (will be activated after payment for paid challenges)
            const [challenge] = await db
                .insert(challenges)
                .values({
                    title,
                    description,
                    beatFileUrl: uploadData.publicUrl,
                    prizeAmount: prizeAmount?.toString(),
                    tier,
                    rules,
                    endDate: new Date(endDate),
                    producerId: authedUser.id,
                    escrowStatus: tier === 'FREE' ? 'RELEASED' : 'PENDING',
                    isActive: tier === 'FREE', // Paid challenges need escrow first
                })
                .returning();

            return {
                challenge,
                uploadUrl: uploadData.uploadUrl,
                beatKey,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Fund a paid challenge (create escrow)
    .post('/:id/fund', async ({ params, user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);
            const { id } = params;

            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, id),
            });

            if (!challenge) {
                set.status = 404;
                return { error: 'Challenge not found' };
            }

            if (challenge.producerId !== authedUser.id) {
                set.status = 403;
                return { error: 'Not your challenge' };
            }

            if (challenge.tier !== 'PAID') {
                set.status = 400;
                return { error: 'Only paid challenges need funding' };
            }

            if (challenge.escrowStatus !== 'PENDING') {
                set.status = 400;
                return { error: 'Challenge already funded' };
            }

            const prizeAmount = parseFloat(challenge.prizeAmount || '0');
            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

            const session = await payments.createCheckoutSession(
                prizeAmount,
                challenge.id,
                authedUser.id,
                `${frontendUrl}/challenges/${challenge.id}?funded=true`,
                `${frontendUrl}/challenges/${challenge.id}?funded=false`
            );

            return { checkoutUrl: session.url };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Update challenge
    .put('/:id', async ({ params, body, user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);
            const { id } = params;

            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, id),
            });

            if (!challenge) {
                set.status = 404;
                return { error: 'Challenge not found' };
            }

            if (challenge.producerId !== authedUser.id) {
                set.status = 403;
                return { error: 'Not your challenge' };
            }

            const { title, description, rules, endDate } = body as {
                title?: string;
                description?: string;
                rules?: string;
                endDate?: string;
            };

            const [updated] = await db
                .update(challenges)
                .set({
                    title: title || challenge.title,
                    description: description ?? challenge.description,
                    rules: rules ?? challenge.rules,
                    endDate: endDate ? new Date(endDate) : challenge.endDate,
                    updatedAt: new Date(),
                })
                .where(eq(challenges.id, id))
                .returning();

            return updated;
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Delete challenge
    .delete('/:id', async ({ params, user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);
            const { id } = params;

            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, id),
            });

            if (!challenge) {
                set.status = 404;
                return { error: 'Challenge not found' };
            }

            if (challenge.producerId !== authedUser.id) {
                set.status = 403;
                return { error: 'Not your challenge' };
            }

            // Don't allow deleting funded challenges
            if (challenge.escrowStatus === 'FUNDED') {
                set.status = 400;
                return { error: 'Cannot delete a funded challenge' };
            }

            await db.delete(challenges).where(eq(challenges.id, id));

            return { success: true };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    });
