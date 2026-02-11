'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { addDays, format } from 'date-fns';
import { toast } from 'sonner';
import {
    Loader2,
    Music,
    Image as ImageIcon,
    DollarSign,
    Target,
    Calendar,
    AlertCircle
} from 'lucide-react';
import { challengesApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';

// Validation Schema
const createChallengeSchema = z.object({
    title: z.string().min(5, 'Title must be at least 5 characters'),
    description: z.string().min(20, 'Description must be at least 20 characters'),
    genre: z.string().min(1, 'Please select a genre'),
    bpm: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
    beatUrl: z.string().url('Invalid beat URL'),
    coverImageUrl: z.string().url('Invalid image URL').optional().or(z.literal('')),
    rules: z.string().optional(),
    prizeAmount: z.union([z.string(), z.number()]).transform((val) => Number(val)).optional(),
    durationDays: z.union([z.string(), z.number()]).transform((val) => Number(val)),
});

type CreateChallengeForm = z.infer<typeof createChallengeSchema>;

const genres = ['Hip Hop', 'R&B', 'Pop', 'Trap', 'Lo-Fi', 'Electronic', 'Drill', 'Afrobeats'];
const durations = [7, 14, 30];

export default function CreateChallengePage() {
    const router = useRouter();
    const user = useAuthStore((state) => state.user);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<CreateChallengeForm>({
        resolver: zodResolver(createChallengeSchema),
        defaultValues: {
            durationDays: 14,
            prizeAmount: 0,
        },
    });

    // Redirect if not producer
    if (user && user.role !== 'PRODUCER' && user.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
                <p className="text-muted-foreground mb-6">Only producers can create challenges.</p>
                <Link href="/dashboard" className="btn-primary">Go to Dashboard</Link>
            </div>
        );
    }

    const selectedGenre = watch('genre');
    const selectedDuration = watch('durationDays');

    const onSubmit = async (data: CreateChallengeForm) => {
        setIsLoading(true);
        try {
            const now = new Date();
            const submissionDeadline = addDays(now, data.durationDays);
            const votingDeadline = addDays(submissionDeadline, 7); // 1 week voting

            const response = await challengesApi.create({
                ...data,
                prizeAmount: data.prizeAmount || 0,
                submissionDeadline: submissionDeadline.toISOString(),
                votingDeadline: votingDeadline.toISOString(),
                winnerSelection: 'VOTES',
                coverImageUrl: data.coverImageUrl || undefined,
                maxSubmissions: 100, // Default limit
            });

            toast.success('Challenge created successfully!');

            // If there's a prize, we need to handle payment
            if (data.prizeAmount && data.prizeAmount > 0) {
                router.push(`/challenges/${response.data.challenge.id}/payment`);
            } else {
                // Otherwise just publish it
                await challengesApi.publish(response.data.challenge.id);
                toast.success('Challenge published!');
                router.push(`/challenges/${response.data.challenge.id}`);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to create challenge');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-3xl mx-auto space-y-8 animate-in">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Create New Challenge</h1>
                <p className="text-muted-foreground mt-2">
                    Upload your beat and set the rules for the competition.
                </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Basic Info */}
                <div className="glass-card p-6 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Music className="h-5 w-5 text-primary-400" />
                        Challenge Details
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Title</label>
                            <input
                                {...register('title')}
                                className="input-default"
                                placeholder="e.g., Summer Vibes Beat Challenge"
                            />
                            {errors.title && (
                                <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
                            )}
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Genre</label>
                            <div className="flex flex-wrap gap-2">
                                {genres.map((g) => (
                                    <button
                                        key={g}
                                        type="button"
                                        onClick={() => setValue('genre', g)}
                                        className={cn(
                                            'px-4 py-2 rounded-full text-sm font-medium transition-all',
                                            selectedGenre === g
                                                ? 'bg-primary-500 text-white shadow-glow'
                                                : 'bg-muted text-muted-foreground hover:text-foreground'
                                        )}
                                    >
                                        {g}
                                    </button>
                                ))}
                            </div>
                            <input type="hidden" {...register('genre')} />
                            {errors.genre && (
                                <p className="text-xs text-red-400 mt-1">{errors.genre.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">BPM</label>
                            <input
                                {...register('bpm')}
                                type="number"
                                className="input-default"
                                placeholder="120"
                            />
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Description</label>
                            <textarea
                                {...register('description')}
                                className="input-default min-h-[100px]"
                                placeholder="Tell artists what you're looking for..."
                            />
                            {errors.description && (
                                <p className="text-xs text-red-400 mt-1">{errors.description.message}</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Media */}
                <div className="glass-card p-6 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <Target className="h-5 w-5 text-purple-400" />
                        Media Assets
                    </h2>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-2">Beat URL (MP3/WAV)</label>
                            <input
                                {...register('beatUrl')}
                                className="input-default"
                                placeholder="https://..."
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Direct link to your beat file (S3, Dropbox, etc.)
                            </p>
                            {errors.beatUrl && (
                                <p className="text-xs text-red-400 mt-1">{errors.beatUrl.message}</p>
                            )}
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Cover Image URL (Optional)</label>
                            <div className="flex gap-4">
                                <input
                                    {...register('coverImageUrl')}
                                    className="input-default flex-1"
                                    placeholder="https://..."
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Rules & Prize */}
                <div className="glass-card p-6 space-y-6">
                    <h2 className="text-xl font-semibold flex items-center gap-2">
                        <DollarSign className="h-5 w-5 text-amber-400" />
                        Competition Rules
                    </h2>

                    <div className="grid md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium mb-2">Duration</label>
                            <div className="grid grid-cols-3 gap-2">
                                {durations.map((d) => (
                                    <button
                                        key={d}
                                        type="button"
                                        onClick={() => setValue('durationDays', d)}
                                        className={cn(
                                            'px-3 py-2 rounded-lg text-sm font-medium border transition-all',
                                            selectedDuration === d
                                                ? 'border-primary-500 bg-primary-500/10 text-primary-400'
                                                : 'border-border bg-muted/50 text-muted-foreground'
                                        )}
                                    >
                                        {d} Days
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2">Prize Pool ($)</label>
                            <input
                                {...register('prizeAmount')}
                                type="number"
                                min="0"
                                className="input-default"
                                placeholder="0"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Enter 0 for a free-entry challenge
                            </p>
                        </div>

                        <div className="col-span-2">
                            <label className="block text-sm font-medium mb-2">Specific Rules</label>
                            <textarea
                                {...register('rules')}
                                className="input-default min-h-[100px]"
                                placeholder="e.g., No sampling, minimum 16 bars, etc."
                            />
                        </div>
                    </div>
                </div>

                <div className="flex justify-end gap-4">
                    <Link href="/dashboard" className="btn-ghost">
                        Cancel
                    </Link>
                    <button
                        type="submit"
                        disabled={isLoading}
                        className="btn-primary min-w-[150px]"
                    >
                        {isLoading ? (
                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                        ) : (
                            'Create Challenge'
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
