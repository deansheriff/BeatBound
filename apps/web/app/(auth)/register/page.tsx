'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { Eye, EyeOff, Music, Loader2, Check } from 'lucide-react';
import { authApi } from '@/lib/api/client';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';

const registerSchema = z.object({
    email: z.string().email('Invalid email address'),
    username: z
        .string()
        .min(3, 'Username must be at least 3 characters')
        .max(50, 'Username must be at most 50 characters')
        .regex(/^[a-zA-Z0-9_]+$/, 'Username can only contain letters, numbers, and underscores'),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .regex(
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/,
            'Password must contain uppercase, lowercase, number, and special character'
        ),
    confirmPassword: z.string(),
    role: z.enum(['FAN', 'ARTIST', 'PRODUCER']),
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

const roles = [
    { id: 'FAN', name: 'Fan', description: 'Vote and support artists' },
    { id: 'ARTIST', name: 'Artist', description: 'Submit videos to challenges' },
    { id: 'PRODUCER', name: 'Producer', description: 'Create beat challenges' },
] as const;

export default function RegisterPage() {
    const router = useRouter();
    const login = useAuthStore((state) => state.login);
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const {
        register,
        handleSubmit,
        watch,
        setValue,
        formState: { errors },
    } = useForm<RegisterFormData>({
        resolver: zodResolver(registerSchema),
        defaultValues: {
            role: 'FAN',
        },
    });

    const selectedRole = watch('role');
    const password = watch('password');

    const passwordChecks = [
        { label: 'At least 8 characters', valid: password?.length >= 8 },
        { label: 'One uppercase letter', valid: /[A-Z]/.test(password || '') },
        { label: 'One lowercase letter', valid: /[a-z]/.test(password || '') },
        { label: 'One number', valid: /\d/.test(password || '') },
        { label: 'One special character', valid: /[@$!%*?&]/.test(password || '') },
    ];

    const onSubmit = async (data: RegisterFormData) => {
        setIsLoading(true);
        try {
            const response = await authApi.register({
                email: data.email,
                username: data.username,
                password: data.password,
                role: data.role,
            });

            const { user, accessToken, refreshToken } = response.data;

            login(user, accessToken, refreshToken);
            toast.success('Account created successfully!');
            router.push('/dashboard');
        } catch (error: any) {
            const message = error.response?.data?.message || 'Registration failed';
            toast.error(message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            {/* Background effects */}
            <div className="absolute inset-0 bg-gradient-to-br from-primary-500/10 via-transparent to-purple-500/10" />
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600">
                        <Music className="h-6 w-6 text-white" />
                    </div>
                    <span className="text-2xl font-bold text-gradient">BeatBound</span>
                </div>

                {/* Card */}
                <div className="glass-card p-8">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-foreground mb-2">Create Account</h1>
                        <p className="text-muted-foreground">Join the music competition revolution</p>
                    </div>

                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {/* Role Selection */}
                        <div>
                            <label className="block text-sm font-medium text-foreground mb-3">
                                I am a...
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {roles.map((role) => (
                                    <button
                                        key={role.id}
                                        type="button"
                                        onClick={() => setValue('role', role.id)}
                                        className={cn(
                                            'p-3 rounded-lg border text-center transition-all',
                                            selectedRole === role.id
                                                ? 'border-primary-500 bg-primary-500/10 text-foreground'
                                                : 'border-border bg-muted hover:border-primary-500/50 text-muted-foreground'
                                        )}
                                    >
                                        <div className="font-medium text-sm">{role.name}</div>
                                        <div className="text-xs mt-1 opacity-70">{role.description}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Email */}
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                                Email
                            </label>
                            <input
                                {...register('email')}
                                type="email"
                                id="email"
                                className="input-default"
                                placeholder="you@example.com"
                            />
                            {errors.email && (
                                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
                            )}
                        </div>

                        {/* Username */}
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-foreground mb-2">
                                Username
                            </label>
                            <input
                                {...register('username')}
                                type="text"
                                id="username"
                                className="input-default"
                                placeholder="your_username"
                            />
                            {errors.username && (
                                <p className="mt-1 text-sm text-red-400">{errors.username.message}</p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    {...register('password')}
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    className="input-default pr-10"
                                    placeholder="••••••••"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>
                            {/* Password strength */}
                            {password && (
                                <div className="mt-3 space-y-1">
                                    {passwordChecks.map((check, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <Check className={cn('h-3 w-3', check.valid ? 'text-emerald-400' : 'text-muted-foreground')} />
                                            <span className={check.valid ? 'text-emerald-400' : 'text-muted-foreground'}>
                                                {check.label}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                            {errors.password && (
                                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div>
                            <label htmlFor="confirmPassword" className="block text-sm font-medium text-foreground mb-2">
                                Confirm Password
                            </label>
                            <input
                                {...register('confirmPassword')}
                                type="password"
                                id="confirmPassword"
                                className="input-default"
                                placeholder="••••••••"
                            />
                            {errors.confirmPassword && (
                                <p className="mt-1 text-sm text-red-400">{errors.confirmPassword.message}</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="btn-primary w-full flex items-center justify-center gap-2"
                        >
                            {isLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                            Create Account
                        </button>
                    </form>

                    {/* Login Link */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Already have an account?{' '}
                        <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
