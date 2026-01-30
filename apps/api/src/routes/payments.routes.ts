import { Router } from 'express';
import { eq, and, sql } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users, challenges, transactions } from '@beatbound/database';
import { authenticate, AuthRequest } from '../middleware/auth.js';
import { requireCreator } from '../middleware/rbac.js';
import { asyncHandler, BadRequestError, NotFoundError } from '../middleware/error-handler.js';
import { stripe, calculatePlatformFee, calculateArtistPayout } from '../config/stripe.js';
import { logger } from '../utils/logger.js';
import express from 'express';

const router = Router();

// POST /api/payments/create-intent
router.post(
    '/create-intent',
    authenticate,
    requireCreator,
    asyncHandler(async (req: AuthRequest, res) => {
        const { challengeId } = req.body;

        if (!challengeId) {
            throw new BadRequestError('challengeId is required');
        }

        // Get challenge
        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        if (challenge.producerId !== req.user!.id) {
            throw new BadRequestError('You do not own this challenge');
        }

        if (challenge.status !== 'DRAFT') {
            throw new BadRequestError('Challenge is already published');
        }

        const prizeAmount = parseFloat(challenge.prizeAmount.toString());
        if (prizeAmount <= 0) {
            throw new BadRequestError('No payment required for free challenges');
        }

        const platformFee = calculatePlatformFee(prizeAmount * 100);
        const totalAmount = Math.round(prizeAmount * 100) + platformFee;

        // Create PaymentIntent with manual capture
        const paymentIntent = await stripe.paymentIntents.create({
            amount: totalAmount,
            currency: 'usd',
            capture_method: 'manual', // Escrow - capture later
            metadata: {
                challengeId,
                producerId: req.user!.id,
                prizeAmount: prizeAmount.toString(),
                platformFee: (platformFee / 100).toString(),
            },
        });

        // Save PaymentIntent ID to challenge
        await db
            .update(challenges)
            .set({ stripePaymentIntentId: paymentIntent.id })
            .where(eq(challenges.id, challengeId));

        logger.info(`PaymentIntent created: ${paymentIntent.id} for challenge ${challengeId}`);

        res.json({
            clientSecret: paymentIntent.client_secret,
            paymentIntentId: paymentIntent.id,
            amount: totalAmount / 100,
            prizeAmount,
            platformFee: platformFee / 100,
        });
    })
);

// POST /api/payments/capture
router.post(
    '/capture',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const { challengeId } = req.body;

        const [challenge] = await db
            .select()
            .from(challenges)
            .where(eq(challenges.id, challengeId))
            .limit(1);

        if (!challenge) {
            throw new NotFoundError('Challenge');
        }

        if (challenge.producerId !== req.user!.id && req.user!.role !== 'ADMIN') {
            throw new BadRequestError('You do not own this challenge');
        }

        if (!challenge.stripePaymentIntentId) {
            throw new BadRequestError('No payment to capture');
        }

        // Capture the payment
        const paymentIntent = await stripe.paymentIntents.capture(
            challenge.stripePaymentIntentId
        );

        // Create transaction record
        await db.insert(transactions).values({
            challengeId,
            userId: req.user!.id,
            type: 'ESCROW',
            status: 'COMPLETED',
            amount: (paymentIntent.amount / 100).toString(),
            stripePaymentIntentId: paymentIntent.id,
        });

        logger.info(`Payment captured: ${paymentIntent.id}`);

        res.json({
            message: 'Payment captured successfully',
            paymentIntent: {
                id: paymentIntent.id,
                status: paymentIntent.status,
                amount: paymentIntent.amount / 100,
            },
        });
    })
);

// POST /api/payments/onboard - Stripe Connect onboarding
router.post(
    '/onboard',
    authenticate,
    requireCreator,
    asyncHandler(async (req: AuthRequest, res) => {
        const [user] = await db
            .select()
            .from(users)
            .where(eq(users.id, req.user!.id))
            .limit(1);

        if (!user) {
            throw new NotFoundError('User');
        }

        let accountId = user.stripeAccountId;

        // Create Stripe Connect account if doesn't exist
        if (!accountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                email: user.email,
                metadata: {
                    userId: user.id,
                },
                capabilities: {
                    transfers: { requested: true },
                },
            });

            accountId = account.id;

            // Save account ID
            await db
                .update(users)
                .set({ stripeAccountId: accountId })
                .where(eq(users.id, user.id));
        }

        // Create onboarding link
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            refresh_url: `${process.env.FRONTEND_URL}/onboarding/refresh`,
            return_url: `${process.env.FRONTEND_URL}/onboarding/complete`,
            type: 'account_onboarding',
        });

        res.json({ url: accountLink.url });
    })
);

// GET /api/payments/onboard/status
router.get(
    '/onboard/status',
    authenticate,
    asyncHandler(async (req: AuthRequest, res) => {
        const [user] = await db
            .select({
                stripeAccountId: users.stripeAccountId,
                stripeOnboardingComplete: users.stripeOnboardingComplete,
            })
            .from(users)
            .where(eq(users.id, req.user!.id))
            .limit(1);

        if (!user?.stripeAccountId) {
            return res.json({ complete: false, hasAccount: false });
        }

        // Check account status with Stripe
        const account = await stripe.accounts.retrieve(user.stripeAccountId);
        const isComplete = account.charges_enabled && account.payouts_enabled;

        // Update database if status changed
        if (isComplete !== user.stripeOnboardingComplete) {
            await db
                .update(users)
                .set({ stripeOnboardingComplete: isComplete })
                .where(eq(users.id, req.user!.id));
        }

        res.json({
            complete: isComplete,
            hasAccount: true,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
        });
    })
);

// POST /api/payments/webhook - Stripe webhook handler
router.post(
    '/webhook',
    express.raw({ type: 'application/json' }),
    async (req, res) => {
        const sig = req.headers['stripe-signature'];

        if (!sig) {
            return res.status(400).send('Missing stripe-signature header');
        }

        let event;

        try {
            event = stripe.webhooks.constructEvent(
                req.body,
                sig,
                process.env.STRIPE_WEBHOOK_SECRET!
            );
        } catch (err: any) {
            logger.error('Webhook signature verification failed:', err.message);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle events
        switch (event.type) {
            case 'payment_intent.succeeded':
                const paymentIntent = event.data.object;
                logger.info(`PaymentIntent succeeded: ${paymentIntent.id}`);
                break;

            case 'payment_intent.payment_failed':
                const failedIntent = event.data.object;
                logger.warn(`PaymentIntent failed: ${failedIntent.id}`);
                break;

            case 'account.updated':
                const account = event.data.object;
                const userId = account.metadata?.userId;
                if (userId) {
                    const isComplete = account.charges_enabled && account.payouts_enabled;
                    await db
                        .update(users)
                        .set({ stripeOnboardingComplete: isComplete })
                        .where(eq(users.id, userId));
                    logger.info(`Account updated for user ${userId}: complete=${isComplete}`);
                }
                break;

            default:
                logger.debug(`Unhandled event type: ${event.type}`);
        }

        res.json({ received: true });
    }
);

export default router;
