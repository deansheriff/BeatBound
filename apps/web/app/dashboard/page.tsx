'use client';

import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Link from 'next/link';
import { Settings, LogOut, Plus, Video, CreditCard } from 'lucide-react';
import { api } from '@/lib/api';
import { useQuery } from '@tanstack/react-query';

export default function DashboardPage() {
    const { user, isAuthenticated, isLoading, logout } = useAuthStore();
    const router = useRouter();

    // Redirect if not authenticated
    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isLoading, isAuthenticated, router]);

    // Fetch stripe status for producers
    const { data: stripeStatus } = useQuery({
        queryKey: ['stripeStatus'],
        queryFn: () => api.getStripeStatus(),
        enabled: user?.role === 'PRODUCER',
    });

    const handleStartOnboarding = async () => {
        try {
            const { url } = await api.startStripeOnboarding();
            window.location.href = url;
        } catch (error) {
            console.error(error);
        }
    };

    if (isLoading || !user) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500" />
            </div>
        );
    }

    return (
        <div className="container-custom py-12">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 space-y-6">
                    <div className="card p-6 text-center">
                        <div className="w-20 h-20 mx-auto rounded-full bg-brand-500/10 flex items-center justify-center text-2xl font-bold text-brand-400 mb-4 border border-brand-500/20">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt={user.username} className="w-full h-full rounded-full object-cover" />
                            ) : (
                                user.username.slice(0, 2).toUpperCase()
                            )}
                        </div>
                        <h2 className="font-bold text-xl">{user.displayName || user.username}</h2>
                        <p className="text-sm text-surface-400 capitalize">{user.role}</p>
                    </div>

                    <nav className="space-y-2">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-3 px-4 py-3 rounded-xl bg-surface-900 text-white font-medium border border-surface-800"
                        >
                            <Settings className="w-4 h-4" /> Overview
                        </Link>
                        {user.role === 'PRODUCER' && (
                            <Link
                                href="/challenges/new"
                                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-800 text-surface-400 hover:text-white transition-colors"
                            >
                                <Plus className="w-4 h-4" /> Create Challenge
                            </Link>
                        )}
                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-surface-800 text-red-400 hover:text-red-300 transition-colors"
                        >
                            <LogOut className="w-4 h-4" /> Sign Out
                        </button>
                    </nav>
                </aside>

                {/* Main Content */}
                <div className="flex-1 space-y-8">
                    <div>
                        <h1 className="text-3xl font-display font-bold mb-2">Dashboard</h1>
                        <p className="text-surface-400">Manage your activity and settings</p>
                    </div>

                    {/* Producer: Stripe Status */}
                    {user.role === 'PRODUCER' && (
                        <div className="card p-6">
                            <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                <CreditCard className="w-5 h-5 text-accent-400" />
                                Payout Setup
                            </h3>

                            {stripeStatus?.onboarded ? (
                                <div className="flex items-center gap-2 text-emerald-400 bg-emerald-500/10 px-4 py-3 rounded-lg border border-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                                    <span>Stripe account connected and active</span>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-surface-400 mb-4">
                                        Connect your Stripe account to fund prizes and pay winners.
                                    </p>
                                    <button onClick={handleStartOnboarding} className="btn btn-primary">
                                        Connect Stripe
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="card p-6">
                            <div className="text-surface-400 text-sm mb-1">Total Views</div>
                            <div className="text-3xl font-bold">0</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-surface-400 text-sm mb-1">
                                {user.role === 'PRODUCER' ? 'Challenges Hosted' : 'Submissions'}
                            </div>
                            <div className="text-3xl font-bold">0</div>
                        </div>
                        <div className="card p-6">
                            <div className="text-surface-400 text-sm mb-1">Hype Received</div>
                            <div className="text-3xl font-bold text-rose-400">0</div>
                        </div>
                    </div>

                    {/* Recent Activity Placeholder */}
                    <div className="card p-8 text-center text-surface-400 min-h-[300px] flex flex-col items-center justify-center">
                        <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center mb-4">
                            <Video className="w-8 h-8 text-surface-500" />
                        </div>
                        <p>No activity yet. Get out there and make some noise!</p>
                        {user.role === 'PRODUCER' ? (
                            <Link href="/challenges/new" className="mt-4 text-brand-400 hover:text-brand-300 font-medium">Create your first challenge &rarr;</Link>
                        ) : (
                            <Link href="/challenges" className="mt-4 text-brand-400 hover:text-brand-300 font-medium">Browse active challenges &rarr;</Link>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
