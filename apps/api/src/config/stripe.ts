import Stripe from 'stripe';

if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('Warning: STRIPE_SECRET_KEY is not set');
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
    apiVersion: '2023-10-16',
    typescript: true,
});

// Platform fee percentage (e.g., 10.00 for 10%)
export const PLATFORM_FEE_PERCENT = parseFloat(
    process.env.PLATFORM_FEE_PERCENT || '10.00'
);

// Calculate platform fee
export function calculatePlatformFee(amount: number): number {
    return Math.round(amount * (PLATFORM_FEE_PERCENT / 100));
}

// Calculate artist payout (after platform fee)
export function calculateArtistPayout(amount: number): number {
    return amount - calculatePlatformFee(amount);
}
