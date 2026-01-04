'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from './api';

interface AuthState {
    user: User | null;
    token: string | null;
    isLoading: boolean;
    isAuthenticated: boolean;

    setUser: (user: User | null) => void;
    setToken: (token: string | null) => void;
    login: (email: string, password: string) => Promise<void>;
    register: (data: {
        email: string;
        password: string;
        username: string;
        role?: 'PRODUCER' | 'ARTIST' | 'FAN';
        displayName?: string;
    }) => Promise<void>;
    logout: () => void;
    checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isLoading: true,
            isAuthenticated: false,

            setUser: (user) => set({ user, isAuthenticated: !!user }),
            setToken: (token) => {
                api.setToken(token);
                set({ token });
            },

            login: async (email, password) => {
                try {
                    const { user, token } = await api.login(email, password);
                    api.setToken(token);
                    set({ user, token, isAuthenticated: true });
                } catch (error) {
                    throw error;
                }
            },

            register: async (data) => {
                try {
                    const { user, token } = await api.register(data);
                    api.setToken(token);
                    set({ user, token, isAuthenticated: true });
                } catch (error) {
                    throw error;
                }
            },

            logout: () => {
                api.setToken(null);
                set({ user: null, token: null, isAuthenticated: false });
            },

            checkAuth: async () => {
                const { token } = get();
                if (!token) {
                    set({ isLoading: false });
                    return;
                }

                try {
                    api.setToken(token);
                    const { user } = await api.getMe();
                    set({ user, isAuthenticated: true, isLoading: false });
                } catch {
                    set({ user: null, token: null, isAuthenticated: false, isLoading: false });
                }
            },
        }),
        {
            name: 'beatbound-auth',
            partialize: (state) => ({ token: state.token }),
        }
    )
);
