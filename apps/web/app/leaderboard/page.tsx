'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { Trophy, Users, Clock, Loader2 } from 'lucide-react';
import { challengesApi } from '@/lib/api/client';
import { formatTimeRemaining } from '@/lib/utils';

export default function LeaderboardPage() {
    const { data, isLoading, error } = useQuery({
        queryKey: ['public-leaderboard-challenges'],
        queryFn: async () => {
            const voting = await challengesApi.list({
                status: 'VOTING',
                sortBy: 'popular',
                limit: 20,
            });

            const votingChallenges = voting.data?.challenges ?? [];
            if (votingChallenges.length > 0) {
                return votingChallenges;
            }

            const active = await challengesApi.list({
                status: 'ACTIVE',
                sortBy: 'popular',
                limit: 20,
            });

            return active.data?.challenges ?? [];
        },
    });

    const challenges = data ?? [];

    return (
        <div className="min-h-screen bg-background">
            <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-foreground">Leaderboard</h1>
                    <p className="mt-2 text-muted-foreground">
                        Open a challenge to see ranked submissions and vote counts.
                    </p>
                </div>

                {isLoading ? (
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading leaderboard...
                    </div>
                ) : error ? (
                    <div className="text-red-400">Failed to load leaderboard data.</div>
                ) : challenges.length === 0 ? (
                    <div className="glass-card p-8 text-center text-muted-foreground">
                        No leaderboard data yet. Check back after submissions are published.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {challenges.map((challenge: any) => (
                            <Link
                                key={challenge.id}
                                href={`/challenges/${challenge.id}`}
                                className="glass-card block p-5 transition hover:bg-white/5"
                            >
                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <h2 className="text-lg font-semibold text-foreground">{challenge.title}</h2>
                                        <p className="mt-1 text-sm text-muted-foreground">{challenge.genre}</p>
                                    </div>
                                    <span className="badge-primary">{challenge.status}</span>
                                </div>
                                <div className="mt-4 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                    <span className="inline-flex items-center gap-1">
                                        <Users className="h-4 w-4" />
                                        {challenge.submissionCount} submissions
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {formatTimeRemaining(challenge.submissionDeadline)}
                                    </span>
                                    <span className="inline-flex items-center gap-1">
                                        <Trophy className="h-4 w-4" />
                                        View rankings
                                    </span>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
