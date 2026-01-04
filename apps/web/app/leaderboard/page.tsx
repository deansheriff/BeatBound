'use client';

import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';

export default function LeaderboardRedirectPage() {
    // Since our leaderboards are per-challenge, we'll show a list of active challenges' leaders
    // or simply redirect the user to browse challenges to see rankings there.
    // For a "Global" leaderboard, the backend would need to aggregate total votes per artist.

    // For now, let's create a "Hall of Fame" style page listing active challenges to check their boards.

    const { data: challenges } = useQuery({
        queryKey: ['challenges', 'active'],
        queryFn: () => api.getChallenges({ active: true, limit: 10 }),
    });

    return (
        <div className="container-custom py-12">
            <div className="text-center mb-16">
                <h1 className="text-4xl font-display font-bold mb-4">Leaderboards</h1>
                <p className="text-surface-400 text-lg">Check out who's topping the charts in active challenges.</p>
            </div>

            <div className="grid gap-6">
                {challenges?.map((challenge) => (
                    <Link
                        key={challenge.id}
                        href={`/challenges/${challenge.id}`}
                        className="card p-6 flex flex-col md:flex-row items-center justify-between gap-6 hover:border-brand-500/50 group"
                    >
                        <div className="flex items-center gap-6">
                            <div className="w-16 h-16 rounded-xl bg-surface-800 flex items-center justify-center shrink-0">
                                <Trophy className="w-8 h-8 text-amber-400 group-hover:scale-110 transition-transform" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold group-hover:text-brand-400 transition-colors">{challenge.title}</h3>
                                <p className="text-surface-400">{challenge.submissionCount} contenders competing</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 text-surface-400 group-hover:text-white transition-colors">
                            View Rankings <ArrowRight className="w-5 h-5" />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
