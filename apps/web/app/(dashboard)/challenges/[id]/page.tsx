'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    Trophy,
    Clock,
    Users,
    Play,
    Heart,
    Share2,
    Music,
    Calendar,
    Tag,
    Loader2,
    ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { challengesApi, votesApi } from '@/lib/api/client';
import { formatTimeRemaining, formatCurrency, formatDate, cn } from '@/lib/utils';
import { useAuthStore } from '@/lib/store/auth';

export default function ChallengeDetailPage() {
    const { id } = useParams();
    const { user, isAuthenticated } = useAuthStore();
    const [activeTab, setActiveTab] = useState<'submissions' | 'rules'>('submissions');

    const { data: challengeData, isLoading: challengeLoading } = useQuery({
        queryKey: ['challenge', id],
        queryFn: () => challengesApi.get(id as string),
        enabled: !!id,
    });

    const { data: submissionsData, isLoading: submissionsLoading } = useQuery({
        queryKey: ['challenge-submissions', id],
        queryFn: () => challengesApi.getSubmissions(id as string, { sortBy: 'votes' }),
        enabled: !!id,
    });

    const { data: leaderboardData } = useQuery({
        queryKey: ['leaderboard', id],
        queryFn: () => votesApi.leaderboard(id as string),
        enabled: !!id,
    });

    const challenge = challengeData?.data?.challenge;
    const submissions = submissionsData?.data?.submissions || [];
    const leaderboard = leaderboardData?.data?.leaderboard || [];

    if (challengeLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!challenge) {
        return (
            <div className="text-center py-20">
                <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Challenge not found</p>
                <Link href="/challenges" className="btn-primary mt-4 inline-block">
                    Browse Challenges
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-in">
            {/* Back Link */}
            <Link href="/challenges" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition">
                <ArrowLeft className="h-4 w-4" />
                Back to Challenges
            </Link>

            {/* Hero */}
            <div className="glass-card overflow-hidden">
                <div className="relative aspect-[3/1] bg-gradient-to-br from-primary-500/20 to-purple-500/20">
                    {challenge.coverImageUrl ? (
                        <img
                            src={challenge.coverImageUrl}
                            alt={challenge.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Music className="h-24 w-24 text-primary-400/30" />
                        </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent" />
                </div>

                <div className="p-6 -mt-16 relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="badge-primary">{challenge.genre}</span>
                                {challenge.bpm && <span className="badge bg-accent text-foreground">{challenge.bpm} BPM</span>}
                                {challenge.status === 'VOTING' && (
                                    <span className="badge-warning">Voting Phase</span>
                                )}
                            </div>
                            <h1 className="text-3xl font-bold text-foreground">{challenge.title}</h1>
                            <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-xs text-white font-medium">
                                    {challenge.producer?.displayName?.[0] || challenge.producer?.username?.[0]}
                                </div>
                                <span>by {challenge.producer?.displayName || challenge.producer?.username}</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            {parseFloat(challenge.prizeAmount) > 0 && (
                                <div className="text-right">
                                    <div className="text-sm text-muted-foreground">Prize Pool</div>
                                    <div className="text-2xl font-bold text-gradient">
                                        {formatCurrency(challenge.prizeAmount)}
                                    </div>
                                </div>
                            )}
                            {isAuthenticated && user?.role === 'ARTIST' && challenge.status === 'ACTIVE' && (
                                <Link href={`/challenges/${id}/submit`} className="btn-primary">
                                    Submit Video
                                </Link>
                            )}
                        </div>
                    </div>

                    {/* Stats Bar */}
                    <div className="flex flex-wrap gap-6 mt-6 pt-6 border-t border-border">
                        <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">{challenge.submissionCount}</span>
                            <span className="text-muted-foreground">submissions</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="h-4 w-4 text-muted-foreground" />
                            <span className="text-foreground font-medium">
                                {formatTimeRemaining(challenge.submissionDeadline)}
                            </span>
                            <span className="text-muted-foreground">left to submit</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                                Voting ends {formatDate(challenge.votingDeadline)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Audio Player */}
            {challenge.beatUrl && (
                <div className="glass-card p-4">
                    <div className="flex items-center gap-4">
                        <button className="btn-primary p-3 rounded-full">
                            <Play className="h-5 w-5" />
                        </button>
                        <div className="flex-1">
                            <div className="text-sm font-medium text-foreground mb-1">Beat Preview</div>
                            <audio controls className="w-full h-8" src={challenge.beatUrl}>
                                Your browser does not support the audio element.
                            </audio>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border">
                {['submissions', 'rules'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as any)}
                        className={cn(
                            'px-4 py-3 text-sm font-medium border-b-2 -mb-[1px] transition',
                            activeTab === tab
                                ? 'border-primary-500 text-foreground'
                                : 'border-transparent text-muted-foreground hover:text-foreground'
                        )}
                    >
                        {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                ))}
            </div>

            {/* Content */}
            {activeTab === 'submissions' ? (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {submissions.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                            <Play className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No submissions yet. Be the first!</p>
                        </div>
                    ) : (
                        submissions.map((submission: any, index: number) => (
                            <div key={submission.id} className="glass-card overflow-hidden group">
                                {/* Thumbnail */}
                                <div className="relative aspect-video bg-muted">
                                    {submission.thumbnailUrl ? (
                                        <img
                                            src={submission.thumbnailUrl}
                                            alt={submission.title}
                                            className="w-full h-full object-cover"
                                        />
                                    ) : (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <Play className="h-12 w-12 text-muted-foreground" />
                                        </div>
                                    )}
                                    {/* Rank badge */}
                                    {index < 3 && (
                                        <div className={cn(
                                            'absolute top-3 left-3 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm',
                                            index === 0 ? 'bg-amber-500 text-black' :
                                                index === 1 ? 'bg-slate-400 text-black' :
                                                    'bg-amber-700 text-white'
                                        )}>
                                            #{index + 1}
                                        </div>
                                    )}
                                    {/* Play overlay */}
                                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                                        <Play className="h-12 w-12 text-white" />
                                    </div>
                                </div>

                                {/* Info */}
                                <div className="p-4">
                                    <h3 className="font-medium text-foreground mb-1 truncate">
                                        {submission.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                                        <span>by {submission.artist?.displayName || submission.artist?.username}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-sm">
                                            <Heart className="h-4 w-4 text-primary-400" />
                                            <span className="text-foreground font-medium">{submission.voteCount}</span>
                                            <span className="text-muted-foreground">votes</span>
                                        </div>
                                        <button className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition">
                                            <Share2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="glass-card p-6">
                    <h2 className="text-lg font-semibold text-foreground mb-4">Challenge Rules</h2>
                    <div className="prose prose-invert max-w-none">
                        {challenge.rules ? (
                            <p className="text-muted-foreground whitespace-pre-wrap">{challenge.rules}</p>
                        ) : (
                            <p className="text-muted-foreground">No specific rules provided. Get creative!</p>
                        )}
                    </div>

                    <h3 className="text-md font-semibold text-foreground mt-6 mb-3">Description</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{challenge.description}</p>
                </div>
            )}
        </div>
    );
}
