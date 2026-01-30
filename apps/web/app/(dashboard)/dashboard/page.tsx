'use client';

import Link from 'next/link';
import { Trophy, Video, DollarSign, TrendingUp, Plus } from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';

export default function DashboardPage() {
    const { user } = useAuthStore();

    const stats = [
        { label: 'Active Challenges', value: '12', icon: Trophy, color: 'text-primary-400' },
        { label: 'My Submissions', value: '5', icon: Video, color: 'text-emerald-400' },
        { label: 'Total Votes', value: '248', icon: TrendingUp, color: 'text-purple-400' },
        { label: 'Earnings', value: '$0', icon: DollarSign, color: 'text-amber-400' },
    ];

    return (
        <div className="space-y-8 animate-in">
            {/* Welcome */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-foreground">
                        Welcome back, {user?.displayName || user?.username}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Here's what's happening in your BeatBound world.
                    </p>
                </div>
                {(user?.role === 'PRODUCER' || user?.role === 'ADMIN') && (
                    <Link href="/challenges/new" className="btn-primary flex items-center gap-2">
                        <Plus className="h-4 w-4" />
                        Create Challenge
                    </Link>
                )}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {stats.map((stat, i) => (
                    <div key={i} className="glass-card p-6">
                        <div className="flex items-center justify-between mb-4">
                            <stat.icon className={`h-6 w-6 ${stat.color}`} />
                        </div>
                        <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                        <div className="text-sm text-muted-foreground">{stat.label}</div>
                    </div>
                ))}
            </div>

            {/* Quick Actions */}
            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Challenges */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Trending Challenges</h2>
                        <Link href="/challenges" className="text-sm text-primary-400 hover:text-primary-300">
                            View all
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50 hover:bg-muted transition">
                                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-500/30 to-purple-500/30 flex items-center justify-center">
                                    <Trophy className="h-5 w-5 text-primary-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="font-medium text-foreground truncate">Hip Hop Beat Challenge #{i}</div>
                                    <div className="text-sm text-muted-foreground">24 submissions · 3 days left</div>
                                </div>
                                <div className="badge-primary">$100</div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="glass-card p-6">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
                    </div>
                    <div className="space-y-4">
                        {[
                            { text: 'You received 12 votes on your submission', time: '2 hours ago' },
                            { text: 'New challenge "Trap Vibes" started', time: '5 hours ago' },
                            { text: 'Producer @beatmaker followed you', time: '1 day ago' },
                        ].map((item, i) => (
                            <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                                <div className="w-2 h-2 rounded-full bg-primary-500 mt-2" />
                                <div>
                                    <div className="text-sm text-foreground">{item.text}</div>
                                    <div className="text-xs text-muted-foreground mt-1">{item.time}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Getting Started (for new users) */}
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
