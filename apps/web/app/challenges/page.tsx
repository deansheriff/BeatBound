'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Trophy, Clock, Users, Zap, Search, Filter } from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime, getInitials } from '@/lib/utils';
import { useState } from 'react';

export default function ChallengesPage() {
    const [filter, setFilter] = useState<'ALL' | 'FREE' | 'PAID'>('ALL');
    const [activeOnly, setActiveOnly] = useState(true);

    const { data: challenges, isLoading } = useQuery({
        queryKey: ['challenges', filter, activeOnly],
        queryFn: () =>
            api.getChallenges({
                tier: filter === 'ALL' ? undefined : filter,
                active: activeOnly,
            }),
    });

    return (
        <div className="container-custom py-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-display font-bold mb-4">Discover Challenges</h1>
                    <p className="text-surface-400 text-lg max-w-2xl">
                        Find the perfect beat, create your visual masterpiece, and compete for glory and prizes.
                    </p>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-2 p-1 bg-surface-900 rounded-xl border border-surface-800">
                    <button
                        onClick={() => setFilter('ALL')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            filter === 'ALL' ? "bg-surface-800 text-white shadow-sm" : "text-surface-400 hover:text-white"
                        )}
                    >
                        All
                    </button>
                    <button
                        onClick={() => setFilter('FREE')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            filter === 'FREE' ? "bg-surface-800 text-white shadow-sm" : "text-surface-400 hover:text-white"
                        )}
                    >
                        Free
                    </button>
                    <button
                        onClick={() => setFilter('PAID')}
                        className={cn(
                            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                            filter === 'PAID' ? "bg-surface-800 text-white shadow-sm" : "text-surface-400 hover:text-white"
                        )}
                    >
                        Paid
                    </button>
                </div>
            </div>

            {/* Loading State */}
            {isLoading && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="card h-80 animate-pulse bg-surface-900/50" />
                    ))}
                </div>
            )}

            {/* Grid */}
            {challenges && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.map((challenge) => (
                        <Link
                            key={challenge.id}
                            href={`/challenges/${challenge.id}`}
                            className="group card-hover overflow-hidden flex flex-col h-full"
                        >
                            {/* Thumbnail Area */}
                            <div className="relative aspect-video bg-gradient-to-br from-surface-800 to-surface-900 group-hover:scale-105 transition-transform duration-500">
                                {challenge.thumbnailUrl ? (
                                    <img src={challenge.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Trophy className={cn(
                                            "w-12 h-12 opacity-20",
                                            challenge.tier === 'PAID' ? "text-amber-400" : "text-emerald-400"
                                        )} />
                                    </div>
                                )}

                                {/* Badges */}
                                <div className="absolute top-4 left-4 flex gap-2">
                                    <span className={cn(
                                        "badge backdrop-blur-md",
                                        challenge.tier === 'PAID' ? "badge-paid" : "badge-free"
                                    )}>
                                        {challenge.tier}
                                    </span>
                                    {new Date(challenge.endDate) < new Date() && (
                                        <span className="badge badge-ended backdrop-blur-md">Ended</span>
                                    )}
                                </div>

                                {/* Prize Tag */}
                                {challenge.prizeAmount && (
                                    <div className="absolute bottom-4 right-4 bg-surface-950/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-surface-800 shadow-xl">
                                        <span className="font-bold text-amber-400">{formatCurrency(challenge.prizeAmount)}</span>
                                    </div>
                                )}
                            </div>

                            {/* Content */}
                            <div className="p-6 flex-1 flex flex-col">
                                <h3 className="text-xl font-bold mb-2 group-hover:text-brand-400 transition-colors line-clamp-1">
                                    {challenge.title}
                                </h3>
                                <p className="text-surface-400 text-sm mb-6 line-clamp-2 flex-1">
                                    {challenge.description || 'No description provided.'}
                                </p>

                                {/* Meta */}
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between text-sm text-surface-400">
                                        <div className="flex items-center gap-2">
                                            <Clock className="w-4 h-4" />
                                            <span>{formatRelativeTime(challenge.endDate)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Video className="w-4 h-4" />
                                            <span>{challenge.submissionCount || 0} entries</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 pt-4 border-t border-surface-800">
                                        <div className="w-6 h-6 rounded-full bg-surface-800 flex items-center justify-center text-[10px] font-bold">
                                            {challenge.producer.avatarUrl ? (
                                                <img src={challenge.producer.avatarUrl} className="w-full h-full rounded-full" />
                                            ) : (
                                                getInitials(challenge.producer.username)
                                            )}
                                        </div>
                                        <span className="text-sm font-medium text-surface-300">
                                            {challenge.producer.displayName || challenge.producer.username}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}

            {challenges && challenges.length === 0 && (
                <div className="text-center py-20">
                    <div className="w-16 h-16 rounded-full bg-surface-900 flex items-center justify-center mx-auto mb-6">
                        <Search className="w-8 h-8 text-surface-500" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">No challenges found</h3>
                    <p className="text-surface-400">Try adjusting your filters or check back later.</p>
                </div>
            )}
        </div>
    );
}
