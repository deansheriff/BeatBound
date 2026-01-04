import Elysia from 'elysia';
import { jwt } from '@elysiajs/jwt';
import { db } from '../db';
import { users, type User } from '../db/schema';
import { eq } from 'drizzle-orm';

// Password hashing using Bun's built-in
async function hashPassword(password: string): Promise<string> {
    return Bun.password.hash(password, {
        algorithm: 'bcrypt',
        cost: 10,
    });
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
    return Bun.password.verify(password, hash);
}

export const authRoutes = new Elysia({ prefix: '/auth' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET!,
            exp: '7d',
        })
    )
    .post('/register', async ({ body, jwt, set }) => {
        const { email, password, username, role, displayName } = body as {
            email: string;
            password: string;
            username: string;
            role?: 'PRODUCER' | 'ARTIST' | 'FAN';
            displayName?: string;
        };

        // Check if user exists
        const existingUser = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (existingUser) {
            set.status = 400;
            return { error: 'User with this email already exists' };
        }

        // Check username
        const existingUsername = await db.query.users.findFirst({
            where: eq(users.username, username),
        });

        if (existingUsername) {
            set.status = 400;
            return { error: 'Username already taken' };
        }

        // Create user
        const passwordHash = await hashPassword(password);
        const [newUser] = await db
            .insert(users)
            .values({
                email,
                passwordHash,
                username,
                displayName: displayName || username,
                role: role || 'FAN',
            })
            .returning();

        // Generate token
        const token = await jwt.sign({
            sub: newUser.id,
            email: newUser.email,
            role: newUser.role,
        });

        return {
            user: {
                id: newUser.id,
                email: newUser.email,
                username: newUser.username,
                displayName: newUser.displayName,
                role: newUser.role,
            },
            token,
        };
    })
    .post('/login', async ({ body, jwt, set }) => {
        const { email, password } = body as {
            email: string;
            password: string;
        };

        const user = await db.query.users.findFirst({
            where: eq(users.email, email),
        });

        if (!user) {
            set.status = 401;
            return { error: 'Invalid credentials' };
        }

        const validPassword = await verifyPassword(password, user.passwordHash);
        if (!validPassword) {
            set.status = 401;
            return { error: 'Invalid credentials' };
        }

        const token = await jwt.sign({
            sub: user.id,
            email: user.email,
            role: user.role,
        });

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
            },
            token,
        };
    })
    .get('/me', async ({ headers, jwt, set }) => {
        const authHeader = headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            set.status = 401;
            return { error: 'Unauthorized' };
        }

        const token = authHeader.slice(7);
        const payload = await jwt.verify(token);

        if (!payload) {
            set.status = 401;
            return { error: 'Invalid token' };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, payload.sub as string),
        });

        if (!user) {
            set.status = 404;
            return { error: 'User not found' };
        }

        return {
            user: {
                id: user.id,
                email: user.email,
                username: user.username,
                displayName: user.displayName,
                role: user.role,
                avatarUrl: user.avatarUrl,
                bio: user.bio,
                stripeOnboardingComplete: user.stripeOnboardingComplete,
            },
        };
    });

// Auth middleware helper
export const authMiddleware = new Elysia({ name: 'auth-middleware' })
    .use(
        jwt({
            name: 'jwt',
            secret: process.env.JWT_SECRET!,
        })
    )
    .derive({ as: 'scoped' }, async ({ headers, jwt }) => {
        const authHeader = headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return { user: null };
        }

        const token = authHeader.slice(7);
        const payload = await jwt.verify(token);

        if (!payload) {
            return { user: null };
        }

        const user = await db.query.users.findFirst({
            where: eq(users.id, payload.sub as string),
        });

        return { user: user || null };
    });

// Guard for requiring authentication
export function requireAuth(user: User | null) {
    if (!user) {
        throw new Error('Unauthorized');
    }
    return user;
}

// Guard for requiring specific role
export function requireRole(user: User | null, roles: Array<'PRODUCER' | 'ARTIST' | 'FAN'>) {
    const authedUser = requireAuth(user);
    if (!roles.includes(authedUser.role)) {
        throw new Error('Forbidden');
    }
    return authedUser;
}
