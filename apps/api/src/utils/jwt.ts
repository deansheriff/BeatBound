import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';

interface TokenPayload {
    userId: string;
}

export function generateTokens(userId: string) {
    const accessExpiresIn = (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as SignOptions['expiresIn'];
    const refreshExpiresIn = (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'];

    const accessToken = jwt.sign(
        { userId } as TokenPayload,
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: accessExpiresIn }
    );

    const refreshToken = jwt.sign(
        { userId } as TokenPayload,
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: refreshExpiresIn }
    );

    return { accessToken, refreshToken };
}

export function verifyAccessToken(token: string): TokenPayload {
    return jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as TokenPayload;
}

export function verifyRefreshToken(token: string): string {
    const decoded = jwt.verify(
        token,
        process.env.JWT_REFRESH_SECRET!
    ) as TokenPayload;
    return decoded.userId;
}
