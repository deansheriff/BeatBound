import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2023-10-16',
});

export const payments = {
    stripe,

    // Create a Stripe Connect account for a producer
    async createConnectAccount(email: string, userId: string) {
        const account = await stripe.accounts.create({
            type: 'express',
            email,
            metadata: { userId },
            capabilities: {
                transfers: { requested: true },
            },
        });
        return account;
    },

    // Generate onboarding link for Connect account
    async createOnboardingLink(accountId: string, returnUrl: string, refreshUrl: string) {
        const accountLink = await stripe.accountLinks.create({
            account: accountId,
            return_url: returnUrl,
            refresh_url: refreshUrl,
            type: 'account_onboarding',
        });
        return accountLink;
    },

    // Check if Connect account is fully onboarded
    async isAccountOnboarded(accountId: string) {
        const account = await stripe.accounts.retrieve(accountId);
        return account.charges_enabled && account.payouts_enabled;
    },

    // Create escrow payment intent for a paid challenge
    async createEscrowPayment(amount: number, challengeId: string, producerId: string) {
        // Amount is in dollars, convert to cents
        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,
            currency: 'usd',
            metadata: {
                challengeId,
                producerId,
                type: 'challenge_escrow',
            },
            // Capture later to hold funds
            capture_method: 'manual',
        });

        return paymentIntent;
    },

    // Capture the escrowed payment (when challenge ends)
    async captureEscrow(paymentIntentId: string) {
        return stripe.paymentIntents.capture(paymentIntentId);
    },

    // Cancel/refund the escrow (if challenge cancelled)
    async cancelEscrow(paymentIntentId: string) {
        return stripe.paymentIntents.cancel(paymentIntentId);
    },

    // Transfer prize to winner's Connect account
    async transferToWinner(
        amount: number,
        winnerAccountId: string,
        challengeId: string,
        paymentIntentId: string
    ) {
        const amountInCents = Math.round(amount * 100);

        // Platform fee (e.g., 10%)
        const platformFee = Math.round(amountInCents * 0.1);
        const transferAmount = amountInCents - platformFee;

        const transfer = await stripe.transfers.create({
            amount: transferAmount,
            currency: 'usd',
            destination: winnerAccountId,
            metadata: {
                challengeId,
                paymentIntentId,
                type: 'prize_payout',
            },
        });

        return transfer;
    },

    // Create checkout session for funding a challenge
    async createCheckoutSession(
        amount: number,
        challengeId: string,
        producerId: string,
        successUrl: string,
        cancelUrl: string
    ) {
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: 'usd',
                        product_data: {
                            name: 'Challenge Prize Escrow',
                            description: `Prize fund for challenge ${challengeId}`,
                        },
                        unit_amount: Math.round(amount * 100),
                    },
                    quantity: 1,
                },
            ],
            metadata: {
                challengeId,
                producerId,
                type: 'challenge_escrow',
            },
            success_url: successUrl,
            cancel_url: cancelUrl,
        });

        return session;
    },

    // Verify webhook signature
    constructWebhookEvent(payload: string, signature: string) {
        return stripe.webhooks.constructEvent(
            payload,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET!
        );
    },
};
