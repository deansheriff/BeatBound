'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
    Trophy,
    Clock,
    Users,
    Search,
    Filter,
    ChevronDown,
    Loader2
} from 'lucide-react';
import { challengesApi } from '@/lib/api/client';
import { formatTimeRemaining, formatCurrency, cn } from '@/lib/utils';

const genres = ['All', 'Hip Hop', 'R&B', 'Pop', 'Trap', 'Lo-Fi', 'Electronic'];
const sortOptions = [
    { value: 'newest', label: 'Newest' },
    { value: 'ending', label: 'Ending Soon' },
    { value: 'popular', label: 'Most Popular' },
    { value: 'prize', label: 'Highest Prize' },
];

export default function ChallengesPage() {
    const [search, setSearch] = useState('');
    const [genre, setGenre] = useState('All');
    const [sortBy, setSortBy] = useState('newest');

    const { data, isLoading, error } = useQuery({
        queryKey: ['challenges', { search, genre: genre === 'All' ? undefined : genre, sortBy }],
        queryFn: () => challengesApi.list({
            search: search || undefined,
            genre: genre === 'All' ? undefined : genre,
            sortBy,
            status: 'ACTIVE',
        }),
    });

    const challenges = data?.data?.challenges || [];

    return (
        <div className="space-y-6 animate-in">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold text-foreground">Challenges</h1>
                <p className="text-muted-foreground mt-1">
                    Browse active beat challenges and showcase your talent
                </p>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search challenges..."
                        className="input-default pl-10"
                    />
                </div>

                {/* Genre Filter */}
                <div className="relative">
                    <select
                        value={genre}
                        onChange={(e) => setGenre(e.target.value)}
                        className="input-default appearance-none pr-10 min-w-[150px]"
                    >
                        {genres.map((g) => (
                            <option key={g} value={g}>{g}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>

                {/* Sort */}
                <div className="relative">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value)}
                        className="input-default appearance-none pr-10 min-w-[150px]"
                    >
                        {sortOptions.map((opt) => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                </div>
            </div>

            {/* Challenge Grid */}
            {isLoading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : error ? (
                <div className="text-center py-20">
                    <p className="text-destructive">Failed to load challenges</p>
                </div>
            ) : challenges.length === 0 ? (
                <div className="text-center py-20">
                    <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No challenges found</p>
                </div>
            ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                    {challenges.map((challenge: any) => (
                        <Link
                            key={challenge.id}
                            href={`/challenges/${challenge.id}`}
                            className="card-premium group"
                        >
                            <div className="card-premium-inner p-0 overflow-hidden">
                                {/* Cover Image */}
                                <div className="relative aspect-video bg-gradient-to-br from-primary-500/20 to-purple-500/20">
                                    {challenge.coverImageUrl ? (
                                        <img
                                            src={challenge.coverImageUrl}
                                            alt={challenge.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Trophy className="h-12 w-12 text-primary-400/50" />
                                        </div>
                                    )}
                                    {/* Prize badge */}
                                    {parseFloat(challenge.prizeAmount) > 0 && (
                                        <div className="absolute top-3 right-3 badge-primary font-semibold">
                                            {formatCurrency(challenge.prizeAmount)}
                                        </div>
                                    )}
                                </div>

                                {/* Content */}
                                <div className="p-5">
                                    {/* Genre */}
                                    <div className="text-xs text-primary-400 font-medium mb-2">
                                        {challenge.genre}
                                        {challenge.bpm && ` · ${challenge.bpm} BPM`}
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-semibold text-foreground mb-2 line-clamp-1 group-hover:text-primary-400 transition">
                                        {challenge.title}
                                    </h3>

                                    {/* Description */}
                                    <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                                        {challenge.description}
                                    </p>

                                    {/* Stats */}
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-4 text-muted-foreground">
                                            <div className="flex items-center gap-1">
                                                <Users className="h-4 w-4" />
                                                <span>{challenge.submissionCount}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>{formatTimeRemaining(challenge.submissionDeadline)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Producer */}
                                    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs text-white font-medium">
                                            {challenge.producer?.displayName?.[0] || challenge.producer?.username?.[0]}
                                        </div>
                                        <span className="text-sm text-muted-foreground">
                                            by {challenge.producer?.displayName || challenge.producer?.username}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
