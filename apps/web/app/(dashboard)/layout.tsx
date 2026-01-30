'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
    Music,
    Home,
    Trophy,
    Video,
    User,
    LogOut,
    Bell,
    Plus,
    Menu,
    X
} from 'lucide-react';
import { useAuthStore } from '@/lib/store/auth';
import { cn } from '@/lib/utils';
import { useState } from 'react';

const navItems = [
    { href: '/dashboard', label: 'Dashboard', icon: Home },
    { href: '/challenges', label: 'Challenges', icon: Trophy },
    { href: '/submissions', label: 'My Submissions', icon: Video },
    { href: '/profile', label: 'Profile', icon: User },
];

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const { user, isAuthenticated, logout, isLoading } = useAuthStore();
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isLoading && !isAuthenticated) {
            router.push('/login');
        }
    }, [isAuthenticated, isLoading, router]);

    const handleLogout = () => {
        logout();
        router.push('/');
    };

    if (isLoading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background">
            {/* Top Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-dark h-16">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 h-full">
                    <div className="flex h-full items-center justify-between">
                        {/* Logo */}
                        <Link href="/dashboard" className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600">
                                <Music className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gradient hidden sm:block">BeatBound</span>
                        </Link>

                        {/* Desktop Nav */}
                        <div className="hidden md:flex items-center gap-6">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    className={cn(
                                        'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all',
                                        pathname === item.href || pathname.startsWith(item.href + '/')
                                            ? 'text-foreground bg-accent'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    )}
                                >
                                    <item.icon className="h-4 w-4" />
                                    {item.label}
                                </Link>
                            ))}
                        </div>

                        {/* Right side */}
                        <div className="flex items-center gap-4">
                            {/* Create button (for producers) */}
                            {(user?.role === 'PRODUCER' || user?.role === 'ADMIN') && (
                                <Link
                                    href="/challenges/new"
                                    className="btn-primary hidden sm:flex items-center gap-2 text-sm px-4 py-2"
                                >
                                    <Plus className="h-4 w-4" />
                                    New Challenge
                                </Link>
                            )}

                            {/* Notifications */}
                            <button className="relative p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition">
                                <Bell className="h-5 w-5" />
                                <span className="absolute top-1 right-1 w-2 h-2 bg-primary-500 rounded-full" />
                            </button>

                            {/* User Menu */}
                            <div className="flex items-center gap-3">
                                <div className="hidden sm:block text-right">
                                    <div className="text-sm font-medium text-foreground">
                                        {user?.displayName || user?.username}
                                    </div>
                                    <div className="text-xs text-muted-foreground capitalize">
                                        {user?.role?.toLowerCase()}
                                    </div>
                                </div>
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center text-white font-medium">
                                    {user?.displayName?.[0] || user?.username?.[0] || 'U'}
                                </div>
                                <button
                                    onClick={handleLogout}
                                    className="p-2 rounded-lg hover:bg-accent text-muted-foreground hover:text-foreground transition"
                                    title="Logout"
                                >
                                    <LogOut className="h-5 w-5" />
                                </button>
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden p-2 rounded-lg hover:bg-accent text-muted-foreground"
                            >
                                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile menu */}
                {mobileMenuOpen && (
                    <div className="md:hidden glass-dark border-t border-border">
                        <div className="px-4 py-4 space-y-2">
                            {navItems.map((item) => (
                                <Link
                                    key={item.href}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={cn(
                                        'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all',
                                        pathname === item.href
                                            ? 'text-foreground bg-accent'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {item.label}
                                </Link>
                            ))}
                            {(user?.role === 'PRODUCER' || user?.role === 'ADMIN') && (
                                <Link
                                    href="/challenges/new"
                                    onClick={() => setMobileMenuOpen(false)}
                                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium bg-primary-500 text-white"
                                >
                                    <Plus className="h-5 w-5" />
                                    New Challenge
                                </Link>
                            )}
                        </div>
                    </div>
                )}
            </nav>

            {/* Main content */}
            <main className="pt-20 pb-8 px-4 sm:px-6 lg:px-8">
                <div className="mx-auto max-w-7xl">
                    {children}
                </div>
            </main>
        </div>
    );
}
