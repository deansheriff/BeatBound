'use client';

import Link from 'next/link';
import { useAuthStore } from '@/lib/store';
import { Menu, X, Upload, Trophy, User as UserIcon, LogOut } from 'lucide-react';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { cn, getInitials } from '@/lib/utils';

export default function Navbar() {
    const { user, isAuthenticated, logout } = useAuthStore();
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const closeMenu = () => setIsOpen(false);

    // Determine active link
    const isActive = (path: string) => pathname === path;

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 bg-surface-950/80 backdrop-blur-md border-b border-surface-800">
            <div className="container-custom flex items-center justify-between h-16">
                {/* Logo */}
                <Link href="/" onClick={closeMenu} className="flex items-center gap-2 group">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-xl group-hover:shadow-[0_0_15px_rgba(217,70,239,0.5)] transition-shadow duration-300">
                        B
                    </div>
                    <span className="font-display font-bold text-xl tracking-tight">BeatBound</span>
                </Link>

                {/* Desktop Navigation */}
                <div className="hidden md:flex items-center gap-8">
                    <Link
                        href="/challenges"
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-brand-400",
                            isActive('/challenges') ? "text-brand-400" : "text-surface-300"
                        )}
                    >
                        Challenges
                    </Link>
                    <Link
                        href="/leaderboard"
                        className={cn(
                            "text-sm font-medium transition-colors hover:text-brand-400",
                            isActive('/leaderboard') ? "text-brand-400" : "text-surface-300"
                        )}
                    >
                        Leaderboard
                    </Link>

                    {isAuthenticated ? (
                        <div className="flex items-center gap-4 ml-4">
                            {user?.role === 'PRODUCER' && (
                                <Link href="/challenges/new" className="btn btn-primary py-2 px-4 text-sm">
                                    <Trophy className="w-4 h-4 mr-2" />
                                    New Challenge
                                </Link>
                            )}
                            {user?.role === 'ARTIST' && (
                                <Link href="/challenges" className="btn btn-accent py-2 px-4 text-sm">
                                    <Upload className="w-4 h-4 mr-2" />
                                    Submit Video
                                </Link>
                            )}

                            <div className="relative group">
                                <button className="flex items-center gap-2 outline-none">
                                    {user?.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.username}
                                            className="w-8 h-8 rounded-full border border-surface-700 object-cover"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-surface-800 border border-surface-700 flex items-center justify-center text-xs font-bold text-brand-400">
                                            {getInitials(user?.username)}
                                        </div>
                                    )}
                                </button>

                                {/* Dropdown */}
                                <div className="absolute right-0 mt-2 w-48 py-2 bg-surface-900 border border-surface-800 rounded-xl shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 transform origin-top-right">
                                    <div className="px-4 py-2 border-b border-surface-800 mb-2">
                                        <p className="text-sm font-medium text-white truncate">{user?.displayName || user?.username}</p>
                                        <p className="text-xs text-surface-400 truncate">{user?.email}</p>
                                    </div>
                                    <Link
                                        href="/dashboard"
                                        className="flex items-center gap-2 px-4 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-800"
                                    >
                                        <UserIcon className="w-4 h-4" />
                                        Dashboard
                                    </Link>
                                    <button
                                        onClick={logout}
                                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-surface-800 text-left"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Sign Out
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="text-sm font-medium text-surface-300 hover:text-white transition-colors">
                                Log In
                            </Link>
                            <Link href="/register" className="btn btn-primary py-2 px-4 text-sm">
                                Get Started
                            </Link>
                        </div>
                    )}
                </div>

                {/* Mobile Menu Button */}
                <button
                    className="md:hidden p-2 text-surface-400 hover:text-white"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                </button>
            </div>

            {/* Mobile Menu */}
            {isOpen && (
                <div className="md:hidden bg-surface-950 border-t border-surface-800 p-4 space-y-4 shadow-2xl">
                    <Link
                        href="/challenges"
                        className="block px-4 py-3 rounded-lg hover:bg-surface-900 text-surface-300 hover:text-white"
                        onClick={closeMenu}
                    >
                        Challenges
                    </Link>
                    <Link
                        href="/leaderboard"
                        className="block px-4 py-3 rounded-lg hover:bg-surface-900 text-surface-300 hover:text-white"
                        onClick={closeMenu}
                    >
                        Leaderboard
                    </Link>
                    {isAuthenticated ? (
                        <>
                            <Link
                                href="/dashboard"
                                className="block px-4 py-3 rounded-lg hover:bg-surface-900 text-surface-300 hover:text-white"
                                onClick={closeMenu}
                            >
                                Dashboard
                            </Link>
                            <button
                                onClick={() => { logout(); closeMenu(); }}
                                className="w-full text-left px-4 py-3 rounded-lg hover:bg-surface-900 text-red-400"
                            >
                                Sign Out
                            </button>
                        </>
                    ) : (
                        <div className="grid grid-cols-2 gap-4 mt-4">
                            <Link
                                href="/login"
                                className="btn btn-secondary py-3 justify-center"
                                onClick={closeMenu}
                            >
                                Log In
                            </Link>
                            <Link
                                href="/register"
                                className="btn btn-primary py-3 justify-center"
                                onClick={closeMenu}
                            >
                                Sign Up
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </nav>
    );
}
