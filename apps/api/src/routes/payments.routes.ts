import Elysia from 'elysia';
import { db } from '../db';
import { challenges, transactions, submissions, users } from '../db/schema';
import { eq, desc } from 'drizzle-orm';
import { payments } from '../lib/stripe';
import { authMiddleware, requireRole } from './auth.routes';

export const paymentRoutes = new Elysia({ prefix: '/payments' })
    .use(authMiddleware)
    // Stripe Connect onboarding for producers
    .post('/connect/onboard', async ({ user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);

            let stripeAccountId = authedUser.stripeAccountId;

            // Create Connect account if doesn't exist
            if (!stripeAccountId) {
                const account = await payments.createConnectAccount(authedUser.email, authedUser.id);
                stripeAccountId = account.id;

                // Save to user
                await db
                    .update(users)
                    .set({ stripeAccountId })
                    .where(eq(users.id, authedUser.id));
            }

            const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            const accountLink = await payments.createOnboardingLink(
                stripeAccountId,
                `${frontendUrl}/dashboard?stripe=success`,
                `${frontendUrl}/dashboard?stripe=refresh`
            );

            return { url: accountLink.url };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Check Connect account status
    .get('/connect/status', async ({ user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);

            if (!authedUser.stripeAccountId) {
                return { onboarded: false, accountId: null };
            }

            const isOnboarded = await payments.isAccountOnboarded(authedUser.stripeAccountId);

            // Update user record if newly onboarded
            if (isOnboarded && !authedUser.stripeOnboardingComplete) {
                await db
                    .update(users)
                    .set({ stripeOnboardingComplete: true })
                    .where(eq(users.id, authedUser.id));
            }

            return {
                onboarded: isOnboarded,
                accountId: authedUser.stripeAccountId,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    })
    // Payout prize to winner (Producer only, after challenge ends)
    .post('/challenges/:challengeId/payout', async ({ params, user, set }) => {
        try {
            const authedUser = requireRole(user, ['PRODUCER']);
            const { challengeId } = params;

            const challenge = await db.query.challenges.findFirst({
                where: eq(challenges.id, challengeId),
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
                return { error: 'Only paid challenges have payouts' };
            }

            if (challenge.escrowStatus !== 'FUNDED') {
                set.status = 400;
                return { error: 'Escrow not funded' };
            }

            if (new Date() < challenge.endDate) {
                set.status = 400;
                return { error: 'Challenge has not ended yet' };
            }

            // Get winning submission (highest votes)
            const winningSubmission = await db.query.submissions.findFirst({
                where: eq(submissions.challengeId, challengeId),
                orderBy: desc(submissions.voteCount),
                with: {
                    artist: true,
                },
            });

            if (!winningSubmission) {
                set.status = 400;
                return { error: 'No submissions to this challenge' };
            }

            // Check winner has Connect account
            if (!winningSubmission.artist.stripeAccountId) {
                set.status = 400;
                return { error: 'Winner has not connected their Stripe account' };
            }

            const isWinnerOnboarded = await payments.isAccountOnboarded(
                winningSubmission.artist.stripeAccountId
            );

            if (!isWinnerOnboarded) {
                set.status = 400;
                return { error: 'Winner has not completed Stripe onboarding' };
            }

            // Create payout
            const prizeAmount = parseFloat(challenge.prizeAmount || '0');
            const transfer = await payments.transferToWinner(
                prizeAmount,
                winningSubmission.artist.stripeAccountId,
                challengeId,
                challenge.stripePaymentIntentId || ''
            );

            // Create transaction record
            await db.insert(transactions).values({
                challengeId,
                stripeTransferId: transfer.id,
                amount: prizeAmount.toString(),
                escrowStatus: 'RELEASED',
                winnerId: winningSubmission.artistId,
                payoutStatus: 'COMPLETED',
            });

            // Update challenge
            await db
                .update(challenges)
                .set({
                    escrowStatus: 'RELEASED',
                    updatedAt: new Date(),
                })
                .where(eq(challenges.id, challengeId));

            return {
                success: true,
                winnerId: winningSubmission.artistId,
                winnerUsername: winningSubmission.artist.username,
                transferId: transfer.id,
            };
        } catch (e) {
            set.status = 401;
            return { error: (e as Error).message };
        }
    });

// Stripe webhook handler
export const webhookRoutes = new Elysia({ prefix: '/webhooks' })
    .post('/stripe', async ({ request, set }) => {
        const signature = request.headers.get('stripe-signature');
        if (!signature) {
            set.status = 400;
            return { error: 'Missing signature' };
        }

        try {
            const body = await request.text();
            const event = payments.constructWebhookEvent(body, signature);

            switch (event.type) {
                case 'checkout.session.completed': {
                    const session = event.data.object;
                    const challengeId = session.metadata?.challengeId;

                    if (challengeId && session.payment_status === 'paid') {
                        // Update challenge escrow status
                        await db
                            .update(challenges)
                            .set({
                                escrowStatus: 'FUNDED',
                                isActive: true,
                                stripePaymentIntentId: session.payment_intent as string,
                                updatedAt: new Date(),
                            })
                            .where(eq(challenges.id, challengeId));
                    }
                    break;
                }

                case 'payment_intent.payment_failed': {
                    const paymentIntent = event.data.object;
                    const challengeId = paymentIntent.metadata?.challengeId;

                    if (challengeId) {
                        await db
                            .update(challenges)
                            .set({
                                escrowStatus: 'PENDING',
                                updatedAt: new Date(),
                            })
                            .where(eq(challenges.id, challengeId));
                    }
                    break;
                }

                // Handle other events as needed
            }

            return { received: true };
        } catch (e) {
            set.status = 400;
            return { error: (e as Error).message };
        }
    });
