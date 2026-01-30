'use client';

import { useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
    Loader2,
    UploadCloud,
    Video,
    AlertCircle,
    CheckCircle2,
    FileVideo
} from 'lucide-react';
import { challengesApi, uploadsApi, submissionsApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

// Validation Schema
const submissionSchema = z.object({
    title: z.string().min(3, 'Title is required'),
    description: z.string().optional(),
    videoFile: z.any().refine((files) => files?.length > 0, "Video is required"),
});

type SubmissionForm = z.infer<typeof submissionSchema>;

export default function SubmitEntryPage() {
    const router = useRouter();
    const { id } = useParams();
    const user = useAuthStore((state) => state.user);

    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const { data: challengeData, isLoading: challengeLoading } = useQuery({
        queryKey: ['challenge', id],
        queryFn: () => challengesApi.get(id as string),
        enabled: !!id,
    });

    const challenge = challengeData?.data?.challenge;

    const {
        register,
        handleSubmit,
        watch,
        formState: { errors },
    } = useForm<SubmissionForm>({
        resolver: zodResolver(submissionSchema),
    });

    const selectedFile = watch('videoFile')?.[0];

    // Access check
    if (user && user.role !== 'ARTIST') {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <AlertCircle className="h-12 w-12 text-destructive mb-4" />
                <h1 className="text-2xl font-bold mb-2">Artist Only</h1>
                <p className="text-muted-foreground mb-6">Only artists can submit entries.</p>
                <Link href={`/challenges/${id}`} className="btn-primary">Back to Challenge</Link>
            </div>
        );
    }

    const onSubmit = async (data: SubmissionForm) => {
        try {
            setIsUploading(true);
            const file = data.videoFile[0];

            // 1. Get Presigned URL
            const { data: presignedData } = await uploadsApi.getPresignedUrl({
                challengeId: id as string,
                fileName: file.name,
                fileType: file.type,
            });

            // 2. Upload to S3
            await axios.put(presignedData.url, file, {
                headers: { 'Content-Type': file.type },
                onUploadProgress: (progressEvent) => {
                    const percent = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
                    setUploadProgress(percent);
                },
            });

            // 3. Confirm Upload / Create Submission
            await uploadsApi.confirmUpload({
                key: presignedData.key,
                challengeId: id as string,
                title: data.title,
                description: data.description,
            });

            toast.success('Submission uploaded successfully!');
            router.push(`/challenges/${id}`);

        } catch (error: any) {
            console.error(error);
            toast.error('Upload failed. Please try again.');
        } finally {
            setIsUploading(false);
        }
    };

    if (challengeLoading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!challenge) return null;

    return (
        <div className="max-w-2xl mx-auto space-y-8 animate-in">
            <div>
                <h1 className="text-3xl font-bold text-foreground">Submit Entry</h1>
                <p className="text-muted-foreground mt-2">
                    Submitting to: <span className="font-semibold text-primary-400">{challenge.title}</span>
                </p>
            </div>

            <div className="glass-card p-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    {/* File Upload Area */}
                    <div className="relative">
                        <input
                            {...register('videoFile')}
                            type="file"
                            accept="video/*"
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                        />
                        <div className={`
              border-2 border-dashed rounded-2xl p-10 text-center transition-all
              ${selectedFile ? 'border-primary-500 bg-primary-500/5' : 'border-border hover:border-primary-400/50 hover:bg-muted/50'}
            `}>
                            {selectedFile ? (
                                <div className="flex flex-col items-center">
                                    <FileVideo className="h-12 w-12 text-primary-400 mb-4" />
                                    <p className="font-medium text-foreground">{selectedFile.name}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                                    </p>
                                    <div className="mt-4 flex items-center gap-2 text-sm text-emerald-400">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Ready to upload
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <UploadCloud className="h-12 w-12 text-muted-foreground mb-4" />
                                    <p className="font-medium text-foreground mb-1">Click to upload video</p>
                                    <p className="text-sm text-muted-foreground">MP4, MOV up to 500MB</p>
                                </div>
                            )}
                        </div>
                        {errors.videoFile && (
                            <p className="text-xs text-red-400 mt-2 text-center">{errors.videoFile.message as string}</p>
                        )}
                    </div>

                    {/* Progress Bar */}
                    {isUploading && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                                <span>Uploading...</span>
                                <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary-500 transition-all duration-300"
                                    style={{ width: `${uploadProgress}%` }}
                                />
                            </div>
                        </div>
                    )}

                    {/* Details */}
                    <div>
                        <label className="block text-sm font-medium mb-2">Submission Title</label>
                        <input
                            {...register('title')}
                            className="input-default"
                            placeholder="e.g., My Fire Remix"
                        />
                        {errors.title && (
                            <p className="text-xs text-red-400 mt-1">{errors.title.message}</p>
                        )}
                    </div>

                    <div>
                        <label className="block text-sm font-medium mb-2">Description / Notes</label>
                        <textarea
                            {...register('description')}
                            className="input-default min-h-[100px]"
                            placeholder="Tell us about your creative process..."
                        />
                    </div>

                    <div className="flex justify-end gap-4 pt-4">
                        <Link href={`/challenges/${id}`} className="btn-ghost">
                            Cancel
                        </Link>
                        <button
                            type="submit"
                            disabled={isUploading}
                            className="btn-primary min-w-[150px]"
                        >
                            {isUploading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="h-5 w-5 animate-spin" />
                                    Processing...
                                </div>
                            ) : (
                                'Submit Entry'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
