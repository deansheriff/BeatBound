import { Elysia } from 'elysia';
import { cors } from '@elysiajs/cors';
import { swagger } from '@elysiajs/swagger';

// Routes
import { authRoutes } from './routes/auth.routes';
import { challengeRoutes } from './routes/challenges.routes';
import { submissionRoutes, challengeSubmissionRoutes } from './routes/submissions.routes';
import { voteRoutes, leaderboardRoutes } from './routes/votes.routes';
import { paymentRoutes, webhookRoutes } from './routes/payments.routes';

const app = new Elysia()
    .use(
        cors({
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        })
    )
    .use(
        swagger({
            documentation: {
                info: {
                    title: 'BeatBound API',
                    version: '1.0.0',
                    description: 'Video competition platform for music producers and artists',
                },
                tags: [
                    { name: 'Auth', description: 'Authentication endpoints' },
                    { name: 'Challenges', description: 'Beat challenge management' },
                    { name: 'Submissions', description: 'Video submission management' },
                    { name: 'Votes', description: 'Voting (Hype) system' },
                    { name: 'Payments', description: 'Stripe Connect & escrow' },
                ],
            },
        })
    )
    // Health check
    .get('/health', () => ({
        status: 'healthy',
        timestamp: new Date().toISOString(),
    }))
    // Mount routes
    .use(authRoutes)
    .use(challengeRoutes)
    .use(submissionRoutes)
    .use(challengeSubmissionRoutes)
    .use(voteRoutes)
    .use(leaderboardRoutes)
    .use(paymentRoutes)
    .use(webhookRoutes)
    // Global error handler
    .onError(({ code, error, set }) => {
        console.error(`Error [${code}]:`, error);

        if (code === 'VALIDATION') {
            set.status = 400;
            return { error: 'Validation failed', details: error.message };
        }

        if (error.message === 'Unauthorized') {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        if (error.message === 'Forbidden') {
            set.status = 403;
            return { error: 'Forbidden' };
        }

        set.status = 500;
        return { error: 'Internal server error' };
    })
    .listen(process.env.PORT || 3001);

console.log(
    `🎵 BeatBound API is running at ${app.server?.hostname}:${app.server?.port}`
);
console.log(
    `📚 Swagger docs available at http://${app.server?.hostname}:${app.server?.port}/swagger`
);

export type App = typeof app;
