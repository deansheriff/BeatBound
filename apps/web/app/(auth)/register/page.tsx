'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuthStore } from '@/lib/store';
import { useRouter } from 'next/navigation';
import { Loader2, Music, Video, User } from 'lucide-react';
import { cn } from '@/lib/utils';

type Role = 'PRODUCER' | 'ARTIST' | 'FAN';

export default function RegisterPage() {
    const [step, setStep] = useState<1 | 2>(1);
    const [data, setData] = useState({
        username: '',
        email: '',
        password: '',
        role: 'FAN' as Role,
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const register = useAuthStore((state) => state.register);
    const router = useRouter();

    const handleRoleSelect = (role: Role) => {
        setData({ ...data, role });
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await register(data);
            router.push('/dashboard');
        } catch (err) {
            setError((err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-md w-full mx-auto">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-display font-bold mb-2">Create Account</h1>
                <p className="text-surface-400">
                    {step === 1 ? 'Choose how you want to participate' : 'Fill in your details to get started'}
                </p>
            </div>

            {step === 1 ? (
                <div className="space-y-4">
                    <button
                        onClick={() => handleRoleSelect('PRODUCER')}
                        className="w-full card cursor-pointer p-6 hover:border-brand-500/50 text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-brand-500/10 flex items-center justify-center text-brand-400 group-hover:scale-110 transition-transform">
                                <Music className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">I'm a Producer</h3>
                                <p className="text-sm text-surface-400">Host challenges, upload beats, fund prizes</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleRoleSelect('ARTIST')}
                        className="w-full card cursor-pointer p-6 hover:border-accent-500/50 text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-accent-500/10 flex items-center justify-center text-accent-400 group-hover:scale-110 transition-transform">
                                <Video className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">I'm an Artist</h3>
                                <p className="text-sm text-surface-400">Join challenges, submit videos, win prizes</p>
                            </div>
                        </div>
                    </button>

                    <button
                        onClick={() => handleRoleSelect('FAN')}
                        className="w-full card cursor-pointer p-6 hover:border-emerald-500/50 text-left transition-all group"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                                <User className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold">I'm a Fan</h3>
                                <p className="text-sm text-surface-400">Watch submissions, discover talent, vote</p>
                            </div>
                        </div>
                    </button>
                </div>
            ) : (
                <div className="card p-8">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        {error && (
                            <div className="bg-red-500/10 border border-red-500/20 text-red-500 text-sm p-3 rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                required
                                value={data.username}
                                onChange={(e) => setData({ ...data, username: e.target.value })}
                                className="input"
                                placeholder="CheckTheRhyme"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Email Address
                            </label>
                            <input
                                type="email"
                                required
                                value={data.email}
                                onChange={(e) => setData({ ...data, email: e.target.value })}
                                className="input"
                                placeholder="you@example.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-surface-300 mb-2">
                                Password
                            </label>
                            <input
                                type="password"
                                required
                                minLength={8}
                                value={data.password}
                                onChange={(e) => setData({ ...data, password: e.target.value })}
                                className="input"
                                placeholder="••••••••"
                            />
                        </div>

                        <div className="flex gap-4">
                            <button
                                type="button"
                                onClick={() => setStep(1)}
                                className="btn btn-secondary flex-1"
                            >
                                Back
                            </button>
                            <button
                                type="submit"
                                disabled={loading}
                                className="btn btn-primary flex-[2] text-base"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6 text-center text-sm text-surface-400">
                        Already have an account?{' '}
                        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">
                            Sign in
                        </Link>
                    </div>
                </div>
            )}
        </div>
    );
}
