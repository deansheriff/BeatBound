// API client for BeatBound backend

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

interface FetchOptions extends RequestInit {
    token?: string;
}

class ApiClient {
    private baseUrl: string;
    private token: string | null = null;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl;
    }

    setToken(token: string | null) {
        this.token = token;
    }

    getToken() {
        return this.token;
    }

    private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
        const { token, ...fetchOptions } = options;

        const headers: HeadersInit = {
            'Content-Type': 'application/json',
            ...options.headers,
        };

        const authToken = token || this.token;
        if (authToken) {
            (headers as Record<string, string>)['Authorization'] = `Bearer ${authToken}`;
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, {
            ...fetchOptions,
            headers,
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || 'An error occurred');
        }

        return data;
    }

    // Auth
    async register(data: {
        email: string;
        password: string;
        username: string;
        role?: 'PRODUCER' | 'ARTIST' | 'FAN';
        displayName?: string;
    }) {
        return this.request<{ user: User; token: string }>('/auth/register', {
            method: 'POST',
            body: JSON.stringify(data),
        });
    }

    async login(email: string, password: string) {
        return this.request<{ user: User; token: string }>('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
        });
    }

    async getMe() {
        return this.request<{ user: User }>('/auth/me');
    }

    // Challenges
    async getChallenges(params?: {
        tier?: 'FREE' | 'PAID';
        active?: boolean;
        limit?: number;
        offset?: number;
    }) {
        const searchParams = new URLSearchParams();
        if (params?.tier) searchParams.set('tier', params.tier);
        if (params?.active !== undefined) searchParams.set('active', String(params.active));
        if (params?.limit) searchParams.set('limit', String(params.limit));
        if (params?.offset) searchParams.set('offset', String(params.offset));

        const query = searchParams.toString();
        return this.request<ChallengeWithProducer[]>(`/challenges${query ? `?${query}` : ''}`);
    }

    async getChallenge(id: string) {
        return this.request<ChallengeDetail>(`/challenges/${id}`);
    }

    async createChallenge(data: {
        title: string;
        description?: string;
        beatFileName: string;
        beatContentType: string;
        prizeAmount?: number;
        tier: 'FREE' | 'PAID';
        rules?: string;
        endDate: string;
    }) {
        return this.request<{ challenge: Challenge; uploadUrl: string; beatKey: string }>(
            '/challenges',
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
    }

    async fundChallenge(id: string) {
        return this.request<{ checkoutUrl: string }>(`/challenges/${id}/fund`, {
            method: 'POST',
        });
    }

    // Submissions
    async getSubmissions(challengeId: string, params?: { sort?: 'votes' | 'recent'; limit?: number }) {
        const searchParams = new URLSearchParams();
        if (params?.sort) searchParams.set('sort', params.sort);
        if (params?.limit) searchParams.set('limit', String(params.limit));

        const query = searchParams.toString();
        return this.request<SubmissionWithArtist[]>(
            `/challenges/${challengeId}/submissions${query ? `?${query}` : ''}`
        );
    }

    async createSubmission(
        challengeId: string,
        data: {
            videoFileName: string;
            videoContentType: string;
            title?: string;
            description?: string;
        }
    ) {
        return this.request<{ submission: Submission; uploadUrl: string; videoKey: string }>(
            `/challenges/${challengeId}/submissions`,
            {
                method: 'POST',
                body: JSON.stringify(data),
            }
        );
    }

    async confirmSubmission(submissionId: string) {
        return this.request<Submission>(`/challenges/_/submissions/${submissionId}/confirm`, {
            method: 'POST',
        });
    }

    // Voting
    async hype(submissionId: string) {
        return this.request<{ success: boolean; voteCount: number }>(`/submissions/${submissionId}/hype`, {
            method: 'POST',
        });
    }

    async unhype(submissionId: string) {
        return this.request<{ success: boolean; voteCount: number }>(`/submissions/${submissionId}/hype`, {
            method: 'DELETE',
        });
    }

    async hasHyped(submissionId: string) {
        return this.request<{ hasVoted: boolean }>(`/submissions/${submissionId}/hype`);
    }

    // Leaderboard
    async getLeaderboard(challengeId: string, limit?: number) {
        const query = limit ? `?limit=${limit}` : '';
        return this.request<LeaderboardEntry[]>(`/challenges/${challengeId}/leaderboard${query}`);
    }

    // Payments
    async startStripeOnboarding() {
        return this.request<{ url: string }>('/payments/connect/onboard', {
            method: 'POST',
        });
    }

    async getStripeStatus() {
        return this.request<{ onboarded: boolean; accountId: string | null }>('/payments/connect/status');
    }

    async payoutWinner(challengeId: string) {
        return this.request<{
            success: boolean;
            winnerId: string;
            winnerUsername: string;
            transferId: string;
        }>(`/payments/challenges/${challengeId}/payout`, {
            method: 'POST',
        });
    }

    // Direct upload to S3
    async uploadFile(uploadUrl: string, file: File, onProgress?: (percent: number) => void) {
        return new Promise<void>((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable && onProgress) {
                    const percent = Math.round((event.loaded / event.total) * 100);
                    onProgress(percent);
                }
            });

            xhr.addEventListener('load', () => {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve();
                } else {
                    reject(new Error(`Upload failed: ${xhr.status}`));
                }
            });

            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed'));
            });

            xhr.open('PUT', uploadUrl);
            xhr.setRequestHeader('Content-Type', file.type);
            xhr.send(file);
        });
    }
}

export const api = new ApiClient(API_URL);

// Types
export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    role: 'PRODUCER' | 'ARTIST' | 'FAN';
    avatarUrl: string | null;
    bio?: string | null;
    stripeOnboardingComplete?: boolean;
}

export interface Challenge {
    id: string;
    title: string;
    description: string | null;
    beatFileUrl: string;
    thumbnailUrl: string | null;
    prizeAmount: string | null;
    tier: 'FREE' | 'PAID';
    rules: string | null;
    startDate: string;
    endDate: string;
    producerId: string;
    escrowStatus: 'PENDING' | 'FUNDED' | 'RELEASED' | 'REFUNDED';
    isActive: boolean;
    createdAt: string;
}

export interface ChallengeWithProducer extends Challenge {
    producer: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
    };
    submissionCount: number;
}

export interface Submission {
    id: string;
    videoUrl: string;
    thumbnailUrl: string | null;
    title: string | null;
    description: string | null;
    artistId: string;
    challengeId: string;
    voteCount: number;
    status: 'PROCESSING' | 'ACTIVE' | 'REJECTED';
    createdAt: string;
}

export interface SubmissionWithArtist extends Submission {
    artist: {
        id: string;
        username: string;
        displayName: string | null;
        avatarUrl: string | null;
    };
}

export interface ChallengeDetail extends ChallengeWithProducer {
    submissions: SubmissionWithArtist[];
}

export interface LeaderboardEntry {
    rank: number;
    score: number;
    submission: SubmissionWithArtist;
}
