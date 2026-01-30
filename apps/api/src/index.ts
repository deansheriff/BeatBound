import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

// Load environment variables first
dotenv.config();

import { errorHandler } from './middleware/error-handler.js';
import { apiLimiter } from './middleware/rate-limit.js';
import { logger } from './utils/logger.js';
import { checkDatabaseConnection } from './config/database.js';
import { checkRedisConnection } from './config/redis.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/users.routes.js';
import challengeRoutes from './routes/challenges.routes.js';
import submissionRoutes from './routes/submissions.routes.js';
import voteRoutes from './routes/votes.routes.js';
import paymentRoutes from './routes/payments.routes.js';
import adminRoutes from './routes/admin.routes.js';
import uploadRoutes from './routes/uploads.routes.js';

const app = express();
const PORT = process.env.PORT || 4000;

// Security middleware
app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

const allowedOrigins = process.env.FRONTEND_URL
    ? process.env.FRONTEND_URL.split(',')
    : ['http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked for origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting (excluded for webhooks)
app.use('/api', (req, res, next) => {
    if (req.path === '/payments/webhook') {
        return next();
    }
    return apiLimiter(req, res, next);
});

// Body parsing - raw for Stripe webhooks
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        logger.info(`${req.method} ${req.path} ${res.statusCode} - ${duration}ms`);
    });
    next();
});

// Health check
app.get('/health', async (req, res) => {
    const dbHealthy = await checkDatabaseConnection();
    const redisHealthy = await checkRedisConnection();

    const status = dbHealthy && redisHealthy ? 'ok' : 'degraded';
    const httpStatus = status === 'ok' ? 200 : 503;

    res.status(httpStatus).json({
        status,
        timestamp: new Date().toISOString(),
        services: {
            database: dbHealthy ? 'connected' : 'disconnected',
            redis: redisHealthy ? 'connected' : 'disconnected',
        },
        version: process.env.npm_package_version || '1.0.0',
    });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/challenges', challengeRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/votes', voteRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);

// Error handling
app.use(errorHandler);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'NotFound',
        message: `Cannot ${req.method} ${req.path}`
    });
});

// Graceful shutdown
const shutdown = () => {
    logger.info('Shutting down gracefully...');
    process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
app.listen(PORT, () => {
    logger.info(`🚀 BeatBound API running on port ${PORT}`);
    logger.info(`📝 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`🌐 Frontend URL: ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
});

export default app;
