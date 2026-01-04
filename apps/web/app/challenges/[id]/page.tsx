'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuthStore } from '@/lib/store';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import { Trophy, Clock, Download, Share2, AlertCircle, Loader2 } from 'lucide-react';
import { cn, formatCurrency, formatRelativeTime } from '@/lib/utils';
import FileUploader from '@/components/FileUploader';
import SubmissionCard from '@/components/SubmissionCard';
import { format } from 'date-fns';

export default function ChallengeDetailPage() {
    const { id } = useParams() as { id: string };
    const { user } = useAuthStore();
    const queryClient = useQueryClient();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [submissionForm, setSubmissionForm] = useState({ title: '', description: '' });
    const [submitError, setSubmitError] = useState('');

    // Fetch challenge details
    const { data: challenge, isLoading: challengeLoading } = useQuery({
        queryKey: ['challenge', id],
        queryFn: () => api.getChallenge(id),
    });

    // Fetch submissions separately to allow easier invalidation
    const { data: submissions, isLoading: submissionsLoading } = useQuery({
        queryKey: ['challenges', id, 'submissions'],
        queryFn: () => api.getSubmissions(id, { sort: 'votes' }),
    });

    // Submit video mutation
    const submitMutation = useMutation({
        mutationFn: async () => {
            if (!videoFile) throw new Error('No video selected');

            // 1. Create submission
            const { submission, uploadUrl } = await api.createSubmission(id, {
                videoFileName: videoFile.name,
                videoContentType: videoFile.type,
                title: submissionForm.title,
                description: submissionForm.description,
            });

            // 2. Upload to S3
            await api.uploadFile(uploadUrl, videoFile);

            // 3. Confirm upload
            await api.confirmSubmission(submission.id);

            return submission;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['challenges', id, 'submissions'] });
            setIsSubmitting(false);
            setVideoFile(null);
            setSubmissionForm({ title: '', description: '' });
        },
        onError: (err) => {
            setSubmitError((err as Error).message);
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitError('');
        submitMutation.mutate();
    };

    if (challengeLoading) {
        return (
            <div className="container-custom py-12">
                <div className="h-96 w-full animate-pulse bg-surface-900 rounded-2xl" />
            </div>
        );
    }

    if (!challenge) return <div className="p-12 text-center text-surface-400">Challenge not found</div>;

    const isProducer = user?.id === challenge.producerId;
    const isArtist = user?.role === 'ARTIST';
    const hasSubmitted = submissions?.some(s => s.artistId === user?.id);

    return (
        <div className="flex flex-col min-h-screen">
            {/* Hero Header */}
            <div className="relative bg-surface-900 border-b border-surface-800 py-12 md:py-20 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-brand-900/20 to-surface-950/50 z-0" />
                <div className="container-custom relative z-10">
                    <div className="max-w-4xl">
                        <div className="flex items-center gap-3 mb-4">
                            <span className={cn(
                                "badge",
                                challenge.tier === 'PAID' ? "badge-paid" : "badge-free"
                            )}>
                                {challenge.tier} Challenge
                            </span>
                            <span className="flex items-center gap-1 text-sm text-surface-400">
                                <Clock className="w-4 h-4" />
                                {formatRelativeTime(challenge.endDate)}
                            </span>
                        </div>

                        <h1 className="text-4xl md:text-6xl font-display font-bold mb-6 tracking-tight">
                            {challenge.title}
                        </h1>
                        <p className="text-lg text-surface-300 md:text-xl max-w-2xl mb-8 leading-relaxed">
                            {challenge.description}
                        </p>

                        {/* Prize & Rules */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 backdrop-blur-sm bg-surface-950/30 rounded-xl p-6 border border-surface-800/50">
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-400 mb-2">Prize Pool</h3>
                                <div className="text-3xl font-bold text-amber-400 flex items-center gap-2">
                                    <Trophy className="w-8 h-8" />
                                    {challenge.prizeAmount ? formatCurrency(challenge.prizeAmount) : 'Clout Only'}
                                </div>
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold uppercase tracking-wider text-surface-400 mb-2">Hosted By</h3>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-surface-800 flex items-center justify-center">
                                        {challenge.producer.avatarUrl ? (
                                            <img src={challenge.producer.avatarUrl} className="w-full h-full rounded-full" />
                                        ) : (
                                            getInitials(challenge.producer.username)
                                        )}
                                    </div>
                                    <span className="font-bold">{challenge.producer.displayName || challenge.producer.username}</span>
                                </div>
                            </div>
                        </div>

                        {/* Actions for Artist */}
                        <div className="flex flex-wrap gap-4">
                            <a
                                href={challenge.beatFileUrl}
                                download
                                className="btn btn-secondary gap-2"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Download className="w-4 h-4" />
                                Download Beat
                            </a>

                            {isArtist && !hasSubmitted && !isSubmitting && (
                                <button
                                    onClick={() => setIsSubmitting(true)}
                                    className="btn btn-primary gap-2"
                                >
                                    <Trophy className="w-4 h-4" />
                                    Submit Your Mix
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Submission Form Section */}
            {isSubmitting && (
                <div className="border-b border-surface-800 bg-surface-900/50">
                    <div className="container-custom py-12">
                        <div className="max-w-2xl mx-auto card p-8 border-brand-500/30 shadow-2xl shadow-brand-900/20">
                            <h2 className="text-2xl font-bold mb-6">Submit Your Entry</h2>
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {submitError && (
                                    <div className="bg-red-500/10 text-red-400 p-4 rounded-xl text-sm flex gap-2">
                                        <AlertCircle className="w-5 h-5 shrink-0" />
                                        {submitError}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <input
                                        type="text"
                                        required
                                        placeholder="Submission Title"
                                        className="input"
                                        value={submissionForm.title}
                                        onChange={(e) => setSubmissionForm({ ...submissionForm, title: e.target.value })}
                                    />
                                    <textarea
                                        placeholder="Describe your creative process..."
                                        className="input min-h-[100px]"
                                        value={submissionForm.description}
                                        onChange={(e) => setSubmissionForm({ ...submissionForm, description: e.target.value })}
                                    />
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-surface-300">Video File</label>
                                        <FileUploader
                                            accept={{ 'video/*': ['.mp4', '.mov', '.webm'] }}
                                            onFileSelect={setVideoFile}
                                            file={videoFile}
                                            label="Upload Video"
                                            description="HD Video (MP4/MOV) up to 500MB"
                                        />
                                    </div>
                                </div>

                                <div className="flex gap-4 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsSubmitting(false)}
                                        className="btn btn-ghost flex-1"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={submitMutation.isPending || !videoFile}
                                        className="btn btn-primary flex-1"
                                    >
                                        {submitMutation.isPending ? (
                                            <span className="flex items-center gap-2">
                                                <Loader2 className="w-4 h-4 animate-spin" /> Uploading...
                                            </span>
                                        ) : 'Submit Entry'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Submissions Grid */}
            <div className="container-custom py-12 flex-1">
                <h2 className="text-2xl font-bold mb-8 flex items-center gap-3">
                    Community Submissions
                    <span className="bg-surface-800 text-surface-300 text-sm py-1 px-3 rounded-full">
                        {submissions?.length || 0}
                    </span>
                </h2>

                {submissionsLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="aspect-video bg-surface-900 animate-pulse rounded-xl" />
                        ))}
                    </div>
                ) : submissions && submissions.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {submissions.map((submission) => (
                            <SubmissionCard
                                key={submission.id}
                                submission={submission}
                                challengeId={challenge.id}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="text-center py-20 border border-dashed border-surface-800 rounded-2xl">
                        <p className="text-surface-400 text-lg">No submissions yet.</p>
                        {isArtist && (
                            <p className="text-brand-400 mt-2">Be the first to drop a response!</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
