'use client';

import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Video, DollarSign, TrendingUp, Plus, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { usersApi } from '@/lib/api/client';
import { formatCurrency, formatTimeRemaining } from '@/lib/utils';

export default function DashboardPage() {
    const { user } = useAuthStore();
    const { data, isLoading, error } = useQuery({
        queryKey: ['dashboard-data'],
        queryFn: () => usersApi.dashboard(),
    });

    const stats = data?.data?.stats;
    const trendingChallenges = data?.data?.trendingChallenges || [];
    const recentActivity = data?.data?.recentActivity || [];

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading dashboard...
            </div>
        );
    }

    if (error) {
        return <div className="text-red-400">Failed to load dashboard data.</div>;
    }

    return (
        <div className="space-y-8 animate-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Welcome back, {user?.displayName || user?.username}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here&apos;s what&apos;s happening in your BeatBound world.
                    </p>
                </div>
                {(user?.role === 'PRODUCER' || user?.role === 'ADMIN') && (
                    <Link href="/challenges/new" className="btn-primary flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Challenge
                    </Link>
                )}
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Trophy className="h-6 w-6 text-primary-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats?.activeChallenges ?? 0}</div>
                    <div className="text-sm text-muted-foreground">Active Challenges</div>
                </div>
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <Video className="h-6 w-6 text-emerald-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats?.mySubmissions ?? 0}</div>
                    <div className="text-sm text-muted-foreground">My Submissions</div>
                </div>
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <TrendingUp className="h-6 w-6 text-purple-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{stats?.totalVotes ?? 0}</div>
                    <div className="text-sm text-muted-foreground">Total Votes</div>
                </div>
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-4">
                        <DollarSign className="h-6 w-6 text-amber-400" />
                    </div>
                    <div className="text-2xl font-bold text-foreground">{formatCurrency(stats?.earnings ?? 0)}</div>
                    <div className="text-sm text-muted-foreground">Earnings</div>
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Trending Challenges</h2>
                        <Link href="/challenges" className="text-sm text-primary-400 hover:text-primary-300">
                            View all
                        </Link>
                    </div>
                    {trendingChallenges.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No active challenges yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {trendingChallenges.map((challenge: any) => (
                                <Link
                                    key={challenge.id}
                                    href={`/challenges/${challenge.id}`}
                                    className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition"
                                >
                                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500/30 to-purple-500/30 flex items-center justify-center">
                                        <Trophy className="h-5 w-5 text-primary-400" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-foreground truncate">{challenge.title}</div>
                                        <div className="text-sm text-muted-foreground">
                                            {challenge.submissionCount} submissions · {formatTimeRemaining(challenge.submissionDeadline)}
                                        </div>
                                    </div>
                                    <div className="badge-primary">{formatCurrency(challenge.prizeAmount || 0)}</div>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>

                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                    </div>
                    {recentActivity.length === 0 ? (
                        <div className="text-sm text-muted-foreground">No recent activity yet.</div>
                    ) : (
                        <div className="space-y-4">
                            {recentActivity.map((item: any) => (
                                <div key={item.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                    <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                                    <div>
                                        <div className="text-sm text-foreground">{item.text}</div>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            {item.createdAt
                                                ? formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })
                                                : 'recently'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {user?.role === 'ARTIST' && (
                <div className="card-premium">
                    <div className="card-premium-inner">
                        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                            <div>
                                <h2 className="text-xl font-semibold text-foreground mb-2">Ready to compete?</h2>
                                <p className="text-muted-foreground">
                                    Browse active challenges and submit your first video to start earning votes!
                                </p>
                            </div>
                            <Link href="/challenges" className="btn-primary flex items-center gap-2">
                                <Trophy className="h-4 w-4" />
                                Browse Challenges
                            </Link>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
