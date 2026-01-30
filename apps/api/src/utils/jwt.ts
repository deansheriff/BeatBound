import jwt from 'jsonwebtoken';

interface TokenPayload {
    userId: string;
}

export function generateTokens(userId: string) {
    const accessToken = jwt.sign(
        { userId } as TokenPayload,
        process.env.JWT_ACCESS_SECRET!,
        { expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' }
    );

    const refreshToken = jwt.sign(
        { userId } as TokenPayload,
        process.env.JWT_REFRESH_SECRET!,
        { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
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
