import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface User {
    id: string;
    email: string;
    username: string;
    displayName: string | null;
    bio: string | null;
    avatarUrl: string | null;
    role: 'FAN' | 'ARTIST' | 'PRODUCER' | 'ADMIN';
    stripeOnboardingComplete: boolean;
}

interface AuthState {
    user: User | null;
    accessToken: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;

    setUser: (user: User | null) => void;
    setTokens: (accessToken: string, refreshToken: string) => void;
    login: (user: User, accessToken: string, refreshToken: string) => void;
    logout: () => void;
    setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            accessToken: null,
            refreshToken: null,
            isAuthenticated: false,
            isLoading: true,

            setUser: (user) => set({ user, isAuthenticated: !!user }),

            setTokens: (accessToken, refreshToken) =>
                set({ accessToken, refreshToken }),

            login: (user, accessToken, refreshToken) =>
                set({
                    user,
                    accessToken,
                    refreshToken,
                    isAuthenticated: true,
                    isLoading: false,
                }),

            logout: () =>
                set({
                    user: null,
                    accessToken: null,
                    refreshToken: null,
                    isAuthenticated: false,
                    isLoading: false,
                }),

            setLoading: (isLoading) => set({ isLoading }),
        }),
        {
            name: 'beatbound-auth',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                user: state.user,
                accessToken: state.accessToken,
                refreshToken: state.refreshToken,
                isAuthenticated: state.isAuthenticated,
            }),
            onRehydrateStorage: () => (state) => {
                state?.setLoading(false);
            },
        }
    )
);
