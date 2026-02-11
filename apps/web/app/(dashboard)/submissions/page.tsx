'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, Video } from 'lucide-react';
import { submissionsApi } from '@/lib/api/client';

interface MySubmission {
    id: string;
    title: string;
    description: string | null;
    status: 'PROCESSING' | 'READY' | 'FAILED' | 'DISQUALIFIED';
    voteCount: number;
    viewCount: number;
    createdAt: string;
    challenge: {
        id: string;
        title: string;
        status: string;
        genre: string;
    };
}

export default function SubmissionsPage() {
    const [items, setItems] = useState<MySubmission[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const load = async () => {
            try {
                const response = await submissionsApi.mine();
                setItems(response.data.submissions ?? []);
            } catch (err: any) {
                setError(err.response?.data?.message || 'Failed to load submissions');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, []);

    if (loading) {
        return (
            <div className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
                Loading submissions...
            </div>
        );
    }

    if (error) {
        return <div className="text-red-400">{error}</div>;
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-foreground">My Submissions</h1>
                <p className="text-muted-foreground mt-1">Track your entries across all challenges.</p>
            </div>

            {items.length === 0 ? (
                <div className="glass-card p-8 text-center space-y-3">
                    <Video className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-muted-foreground">You have not submitted any videos yet.</p>
                    <Link href="/challenges" className="btn-primary inline-flex">
                        Browse Challenges
                    </Link>
                </div>
            ) : (
                <div className="space-y-4">
                    {items.map((submission) => (
                        <div key={submission.id} className="glass-card p-5">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <h2 className="text-lg font-semibold text-foreground">{submission.title}</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Challenge:{' '}
                                        <Link href={`/challenges/${submission.challenge.id}`} className="text-primary-400 hover:text-primary-300">
                                            {submission.challenge.title}
                                        </Link>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        Status: {submission.status} | Votes: {submission.voteCount} | Views: {submission.viewCount}
                                    </p>
                                </div>
                                <Link href={`/submissions/${submission.id}`} className="btn-secondary text-sm px-4 py-2">
                                    View
                                </Link>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
