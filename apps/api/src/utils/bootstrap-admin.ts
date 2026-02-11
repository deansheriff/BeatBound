import { eq } from 'drizzle-orm';
import { db } from '../config/database.js';
import { users } from '@beatbound/database';
import { hashPassword } from './password.js';
import { logger } from './logger.js';

const DEFAULT_ADMIN_EMAIL = 'admin@beatbound.sherpackage.com';
const DEFAULT_ADMIN_PASSWORD = 'BeatboundAdmin@2026';
const DEFAULT_ADMIN_USERNAME = 'beatbound_admin';
const DEFAULT_ADMIN_DISPLAY_NAME = 'BeatBound Admin';

export async function ensureAdminUser(): Promise<void> {
    if (process.env.SEED_ADMIN === 'false') {
        logger.info('Admin bootstrap skipped (SEED_ADMIN=false)');
        return;
    }

    const email = (process.env.ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL).toLowerCase();
    const username = (process.env.ADMIN_USERNAME || DEFAULT_ADMIN_USERNAME).toLowerCase();
    const displayName = process.env.ADMIN_DISPLAY_NAME || DEFAULT_ADMIN_DISPLAY_NAME;
    const password = process.env.ADMIN_PASSWORD || DEFAULT_ADMIN_PASSWORD;

    const [existingUser] = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

    if (existingUser) {
        if (existingUser.role !== 'ADMIN') {
            await db
                .update(users)
                .set({ role: 'ADMIN', updatedAt: new Date() })
                .where(eq(users.id, existingUser.id));
            logger.info(`Promoted existing user to admin: ${email}`);
        } else {
            logger.info(`Admin user already exists: ${email}`);
        }
        return;
    }

    const passwordHash = await hashPassword(password);

    await db.insert(users).values({
        email,
        passwordHash,
        username,
        displayName,
        role: 'ADMIN',
        emailVerified: true,
    });

    logger.info(`Seeded admin user: ${email}`);
}
