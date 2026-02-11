import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '@/lib/store/auth';

// Force same-origin API usage so the web app always calls `/api/*` on the current domain.
// This avoids CORS/preflight issues in single-domain deployments (e.g. Coolify + reverse proxy).
const API_BASE_URL = '';

export const api = axios.create({
    baseURL: API_BASE_URL ? `${API_BASE_URL}/api` : '/api',
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = useAuthStore.getState().accessToken;
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // If 401 and we haven't tried refreshing yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = useAuthStore.getState().refreshToken;

            if (refreshToken) {
                try {
                    const response = await axios.post(`${API_BASE_URL}/api/auth/refresh`, {
                        refreshToken,
                    });

                    const { accessToken, refreshToken: newRefreshToken } = response.data;

                    useAuthStore.getState().setTokens(accessToken, newRefreshToken);

                    originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, logout user
                    useAuthStore.getState().logout();
                    window.location.href = '/login';
                    return Promise.reject(refreshError);
                }
            }
        }

        return Promise.reject(error);
    }
);

// API Response types
export interface ApiError {
    error: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// Auth API
export const authApi = {
    register: (data: {
        email: string;
        password: string;
        username: string;
        displayName?: string;
        role: 'FAN' | 'ARTIST' | 'PRODUCER';
    }) => api.post('/auth/register', data),

    login: (data: { email: string; password: string }) =>
        api.post('/auth/login', data),

    refresh: (refreshToken: string) =>
        api.post('/auth/refresh', { refreshToken }),

    me: () => api.get('/auth/me'),

    logout: () => api.post('/auth/logout'),
};

// Users API
export const usersApi = {
    dashboard: () => api.get('/users/me/dashboard'),

    getByUsername: (username: string) => api.get(`/users/${username}`),

    updateProfile: (data: {
        displayName?: string;
        bio?: string;
        avatarUrl?: string;
    }) => api.patch('/users/me', data),

    follow: (username: string) => api.post(`/users/${username}/follow`),

    unfollow: (username: string) => api.delete(`/users/${username}/follow`),
};

// Challenge types
export interface ChallengeCreateData {
    title: string;
    description: string;
    genre: string;
    bpm?: number;
    beatUrl: string;
    coverImageUrl?: string;
    rules?: string;
    prizeAmount?: number;
    maxSubmissions?: number;
    submissionDeadline: string;
    votingDeadline: string;
    winnerSelection?: 'VOTES' | 'PRODUCER_PICK' | 'HYBRID';
}

// Challenges API
export const challengesApi = {
    list: (params?: {
        page?: number;
        limit?: number;
        status?: string;
        genre?: string;
        search?: string;
        sortBy?: string;
    }) => api.get('/challenges', { params }),

    get: (id: string) => api.get(`/challenges/${id}`),

    create: (data: ChallengeCreateData) => api.post('/challenges', data),

    update: (id: string, data: Partial<ChallengeCreateData>) =>
        api.patch(`/challenges/${id}`, data),

    publish: (id: string) => api.post(`/challenges/${id}/publish`),

    delete: (id: string) => api.delete(`/challenges/${id}`),

    getSubmissions: (id: string, params?: { page?: number; limit?: number; sortBy?: string }) =>
        api.get(`/challenges/${id}/submissions`, { params }),
};

// Submissions API
export const submissionsApi = {
    get: (id: string) => api.get(`/submissions/${id}`),

    create: (data: {
        challengeId: string;
        title: string;
        description?: string;
        videoUrl: string;
    }) => api.post('/submissions', data),

    update: (id: string, data: { title?: string; description?: string }) =>
        api.patch(`/submissions/${id}`, data),

    delete: (id: string) => api.delete(`/submissions/${id}`),

    mine: (params?: { page?: number; limit?: number }) =>
        api.get('/submissions/mine', { params }),
};

// Votes API
export const votesApi = {
    vote: (submissionId: string) => api.post('/votes', { submissionId }),

    unvote: (submissionId: string) => api.delete(`/votes/${submissionId}`),

    leaderboard: (challengeId: string) => api.get(`/votes/leaderboard/${challengeId}`),
};

// Uploads API
export const uploadsApi = {
    getPresignedUrl: (data: {
        challengeId: string;
        fileName: string;
        fileType: string;
    }) => api.post('/uploads/presigned-url', data),

    confirmUpload: (data: {
        key: string;
        challengeId: string;
        title: string;
        description?: string;
    }) => api.post('/uploads/confirm', data),
};

// Payments API
export const paymentsApi = {
    createIntent: (challengeId: string) =>
        api.post('/payments/create-intent', { challengeId }),

    capture: (challengeId: string) =>
        api.post('/payments/capture', { challengeId }),

    onboard: () => api.post('/payments/onboard'),

    onboardStatus: () => api.get('/payments/onboard/status'),
};

// Admin API
export const adminApi = {
    listUsers: (params?: {
        page?: number;
        limit?: number;
        role?: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN';
        search?: string;
        suspended?: boolean;
    }) => api.get('/admin/users', { params }),

    updateUserRole: (id: string, role: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN') =>
        api.patch(`/admin/users/${id}/role`, { role }),

    suspendUser: (id: string, suspended: boolean, reason?: string) =>
        api.patch(`/admin/users/${id}/suspend`, { suspended, reason }),

    listChallenges: (params?: {
        page?: number;
        limit?: number;
        status?: 'DRAFT' | 'ACTIVE' | 'VOTING' | 'ENDED' | 'CANCELLED' | 'all';
    }) => api.get('/admin/challenges', { params }),

    getChallenge: (id: string) => api.get(`/admin/challenges/${id}`),

    createChallenge: (data: {
        producerId: string;
        title: string;
        description: string;
        genre: string;
        beatUrl: string;
        coverImageUrl?: string;
        rules?: string;
        status?: 'DRAFT' | 'ACTIVE' | 'VOTING' | 'ENDED' | 'CANCELLED';
        prizeAmount?: number;
        maxSubmissions?: number;
        submissionDeadline?: string;
        votingDeadline?: string;
    }) => api.post('/admin/challenges', data),

    updateChallenge: (
        id: string,
        data: Partial<{
            title: string;
            description: string;
            genre: string;
            beatUrl: string;
            coverImageUrl: string;
            rules: string;
            status: 'DRAFT' | 'ACTIVE' | 'VOTING' | 'ENDED' | 'CANCELLED';
            prizeAmount: number;
            maxSubmissions: number;
            submissionDeadline: string;
            votingDeadline: string;
        }>
    ) => api.patch(`/admin/challenges/${id}`, data),

    deleteChallenge: (id: string) => api.delete(`/admin/challenges/${id}`),

    listReports: (params?: {
        page?: number;
        limit?: number;
        status?: 'PENDING' | 'RESOLVED' | 'DISMISSED';
    }) => api.get('/admin/reports', { params }),

    resolveReport: (id: string, status: 'RESOLVED' | 'DISMISSED', notes?: string) =>
        api.patch(`/admin/reports/${id}/resolve`, { status, notes }),
};

export default api;
