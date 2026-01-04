'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { api } from '@/lib/api';
import FileUploader from '@/components/FileUploader';
import { Loader2, DollarSign, Calendar, Info } from 'lucide-react';
import { cn } from '@/lib/utils'; // Assuming cn utility exists

export default function CreateChallengePage() {
    const router = useRouter();
    const { user } = useAuthStore();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        rules: '',
        tier: 'FREE' as 'FREE' | 'PAID',
        prizeAmount: '',
        endDate: '',
    });

    const [beatFile, setBeatFile] = useState<File | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!beatFile) {
            setError('Please upload a beat file');
            return;
        }

        if (formData.tier === 'PAID' && !formData.prizeAmount) {
            setError('Please enter a prize amount for paid challenges');
            return;
        }

        setLoading(true);
        setError('');

        try {
            // 1. Create challenge on API to get upload URL
            const { challenge, uploadUrl } = await api.createChallenge({
                title: formData.title,
                description: formData.description,
                rules: formData.rules,
                tier: formData.tier,
                prizeAmount: formData.prizeAmount ? parseFloat(formData.prizeAmount) : undefined,
                endDate: formData.endDate,
                beatFileName: beatFile.name,
                beatContentType: beatFile.type,
            });

            // 2. Upload beat directly to S3
            await api.uploadFile(uploadUrl, beatFile);

            // 3. If paid, redirect to funding; otherwise go to challenge page
            if (challenge.tier === 'PAID') {
                const { checkoutUrl } = await api.fundChallenge(challenge.id);
                window.location.href = checkoutUrl;
            } else {
                router.push(`/challenges/${challenge.id}`);
            }
        } catch (err) {
            console.error(err);
            setError((err as Error).message || 'Failed to create challenge');
            setLoading(false);
        }
    };

    return (
        <div className="container-custom py-12">
            <div className="max-w-2xl mx-auto">
                <div className="mb-8">
                    <h1 className="text-3xl font-display font-bold mb-2">Create New Challenge</h1>
                    <p className="text-surface-400">
                        Upload your beat and set the stage for artists to compete.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-8">
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Basic Info */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Challenge Title</label>
                            <input
                                type="text"
                                required
                                className="input"
                                placeholder="e.g. Summer Vibe Contest 2024"
                                value={formData.title}
                                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Description</label>
                            <textarea
                                className="input min-h-[100px]"
                                placeholder="Tell artists what you're looking for..."
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>

                    {/* Beat Upload */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-surface-300">Beat File</label>
                        <FileUploader
                            accept={{ 'audio/*': ['.mp3', '.wav'] }}
                            onFileSelect={setBeatFile}
                            file={beatFile}
                            onClear={() => setBeatFile(null)}
                            label="Upload Beat"
                            description="MP3 or WAV files up to 100MB"
                        />
                    </div>

                    {/* Settings */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">End Date</label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-surface-500" />
                                <input
                                    type="date"
                                    required
                                    className="input pl-10"
                                    value={formData.endDate}
                                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">Competition Tier</label>
                            <div className="grid grid-cols-2 gap-2 p-1 bg-surface-900 rounded-xl border border-surface-800">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tier: 'FREE' })}
                                    className={cn(
                                        "py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                        formData.tier === 'FREE' ? "bg-surface-800 text-white shadow-sm" : "text-surface-400 hover:text-white"
                                    )}
                                >
                                    Free
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, tier: 'PAID' })}
                                    className={cn(
                                        "py-2 px-4 rounded-lg text-sm font-medium transition-all",
                                        formData.tier === 'PAID' ? "bg-surface-800 text-white shadow-sm" : "text-surface-400 hover:text-white"
                                    )}
                                >
                                    Paid
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Paid Tier Details */}
                    {formData.tier === 'PAID' && (
                        <div className="card p-6 border-amber-500/20 bg-amber-500/5 animate-fade-in-up">
                            <div className="flex items-start gap-4 mb-4">
                                <div className="p-3 rounded-lg bg-amber-500/10 text-amber-500">
                                    <DollarSign className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-500 mb-1">Prize Pool Funding</h3>
                                    <p className="text-sm text-surface-400">
                                        You'll need to fund the prize amount upfront via Stripe. The funds will be held in escrow until a winner is selected.
                                    </p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-surface-300 mb-2">Prize Amount ($)</label>
                                <input
                                    type="number"
                                    min="5"
                                    required
                                    className="input"
                                    placeholder="100.00"
                                    value={formData.prizeAmount}
                                    onChange={(e) => setFormData({ ...formData, prizeAmount: e.target.value })}
                                />
                            </div>
                        </div>
                    )}

                    <div className="pt-6 border-t border-surface-800">
                        <button
                            type="submit"
                            disabled={loading}
                            className="btn btn-primary w-full py-4 text-lg"
                        >
                            {loading ? (
                                <div className="flex items-center gap-2">
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    {beatFile ? 'Uploading Beat...' : 'Creating Challenge...'}
                                </div>
                            ) : (
                                'Launch Challenge'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
