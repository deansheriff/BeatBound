'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, SubmissionWithArtist } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { Heart, Trophy, User } from 'lucide-react';
import { cn, formatVoteCount, getInitials } from '@/lib/utils';
import { useState } from 'react';
import VideoPlayer from './VideoPlayer';

interface SubmissionCardProps {
    submission: SubmissionWithArtist;
    challengeId: string;
}

export default function SubmissionCard({ submission, challengeId }: SubmissionCardProps) {
    const { user, isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();
    const [isPlaying, setIsPlaying] = useState(false);

    // Check if user voted (only if authenticated)
    const { data: voteStatus } = useQuery({
        queryKey: ['hasVoted', submission.id],
        queryFn: () => api.hasHyped(submission.id),
        enabled: isAuthenticated,
    });

    // Hype mutation
    const hypeMutation = useMutation({
        mutationFn: (isHyped: boolean) =>
            isHyped ? api.unhype(submission.id) : api.hype(submission.id),
        onMutate: async (isHyped) => {
            // Cancel queries
            await queryClient.cancelQueries({ queryKey: ['hasVoted', submission.id] });
            await queryClient.cancelQueries({ queryKey: ['challenges', challengeId, 'submissions'] });

            // Optimistic update
            const previousStatus = queryClient.getQueryData(['hasVoted', submission.id]);

            queryClient.setQueryData(['hasVoted', submission.id], {
                hasVoted: !isHyped
            });

            return { previousStatus };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['hasVoted', submission.id], context?.previousStatus);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['hasVoted', submission.id] });
            queryClient.invalidateQueries({ queryKey: ['challenges', challengeId, 'submissions'] });
        },
    });

    const handleHype = () => {
        if (!isAuthenticated) return; // Should show login modal potentially
        hypeMutation.mutate(!!voteStatus?.hasVoted);
    };

    return (
        <div className="flex flex-col gap-3 group">
            {/* Video / Thumbnail */}
            <div
                className="relative bg-black rounded-xl overflow-hidden aspect-video shadow-lg ring-1 ring-surface-800 group-hover:ring-brand-500/50 transition-all cursor-pointer"
                onClick={() => setIsPlaying(true)}
            >
                {isPlaying ? (
                    <VideoPlayer src={submission.videoUrl} autoPlay />
                ) : (
                    <div className="relative w-full h-full">
                        {submission.thumbnailUrl ? (
                            <img src={submission.thumbnailUrl} className="w-full h-full object-cover opacity-80" />
                        ) : (
                            <div className="w-full h-full bg-surface-900 flex items-center justify-center text-surface-500">
                                <VideoPlayer src={submission.videoUrl} /> {/* Using player in cover mode essentially */}
                            </div>
                        )}
                        {/* Overlay info */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4">
                            <h3 className="font-bold text-white truncate">{submission.title || 'Untitled Submission'}</h3>
                            <p className="text-xs text-white/70 line-clamp-1">{submission.description}</p>
                        </div>
                    </div>
                )}
            </div>

            {/* Meta & Actions */}
            <div className="flex items-center justify-between px-1">
                {/* Artist */}
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center overflow-hidden">
                        {submission.artist.avatarUrl ? (
                            <img src={submission.artist.avatarUrl} className="w-full h-full object-cover" />
                        ) : (
                            <span className="text-xs font-bold text-surface-400">{getInitials(submission.artist.username)}</span>
                        )}
                    </div>
                    <div className="text-sm">
                        <div className="font-medium leading-none">{submission.artist.displayName || submission.artist.username}</div>
                        <div className="text-xs text-surface-500 mt-0.5">Artist</div>
                    </div>
                </div>

                {/* Hype Button */}
                <button
                    onClick={handleHype}
                    disabled={!isAuthenticated || hypeMutation.isPending}
                    className={cn(
                        "flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all active:scale-95 border",
                        voteStatus?.hasVoted
                            ? "bg-rose-500/10 border-rose-500/50 text-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.2)]"
                            : "bg-surface-900 border-surface-700 text-surface-400 hover:text-white hover:bg-surface-800"
                    )}
                >
                    <Heart className={cn("w-4 h-4", voteStatus?.hasVoted && "fill-current")} />
                    <span className="text-sm font-semibold font-mono">
                        {formatVoteCount(submission.voteCount + (hypeMutation.variables === false ? 1 : hypeMutation.variables === true ? -1 : 0))}
                    </span>
                </button>
            </div>
        </div>
    );
}
