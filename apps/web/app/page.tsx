import Link from 'next/link';
import {
    Music,
    Trophy,
    Video,
    Users,
    ArrowRight,
    Play,
    Star,
    Zap,
    DollarSign
} from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-background">
            {/* Navigation */}
            <nav className="fixed top-0 left-0 right-0 z-50 glass-dark">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600">
                                <Music className="h-5 w-5 text-white" />
                            </div>
                            <span className="text-xl font-bold text-gradient">BeatBound</span>
                        </div>
                        <div className="hidden md:flex items-center gap-8">
                            <Link href="/challenges" className="text-muted-foreground hover:text-foreground transition">
                                Challenges
                            </Link>
                            <Link href="/leaderboard" className="text-muted-foreground hover:text-foreground transition">
                                Leaderboard
                            </Link>
                            <Link href="/about" className="text-muted-foreground hover:text-foreground transition">
                                About
                            </Link>
                        </div>
                        <div className="flex items-center gap-4">
                            <Link href="/login" className="btn-ghost text-sm">
                                Sign In
                            </Link>
                            <Link href="/register" className="btn-primary text-sm">
                                Get Started
                            </Link>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden">
                {/* Background effects */}
                <div className="absolute inset-0 bg-gradient-to-b from-primary-500/10 via-transparent to-transparent" />
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute top-1/3 right-1/4 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />

                <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center">
                        <div className="mb-6 inline-flex items-center rounded-full bg-primary-500/10 px-4 py-2 text-sm text-primary-400">
                            <Zap className="mr-2 h-4 w-4" />
                            The Future of Music Competition
                        </div>
                        <h1 className="mb-6 text-5xl font-bold tracking-tight text-foreground sm:text-6xl lg:text-7xl">
                            Where <span className="text-gradient">Beats</span> Meet
                            <br />
                            <span className="text-gradient">Talent</span>
                        </h1>
                        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground">
                            Producers drop beats. Artists showcase their skills. The community votes.
                            Winners take home prizes. Join the ultimate music competition platform.
                        </p>
                        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Link href="/register" className="btn-primary flex items-center gap-2 text-lg px-8 py-4">
                                Start Creating
                                <ArrowRight className="h-5 w-5" />
                            </Link>
                            <Link href="/challenges" className="btn-glass flex items-center gap-2 text-lg px-8 py-4">
                                <Play className="h-5 w-5" />
                                Browse Challenges
                            </Link>
                        </div>
                    </div>
                </div>
            </section>

            {/* Stats Section */}
            <section className="py-16 border-y border-border">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { label: 'Active Challenges', value: '100+', icon: Trophy },
                            { label: 'Artists', value: '10K+', icon: Users },
                            { label: 'Videos Submitted', value: '50K+', icon: Video },
                            { label: 'Prizes Awarded', value: '$100K+', icon: DollarSign },
                        ].map((stat, i) => (
                            <div key={i} className="text-center">
                                <stat.icon className="mx-auto mb-3 h-8 w-8 text-primary-400" />
                                <div className="text-3xl font-bold text-foreground">{stat.value}</div>
                                <div className="text-sm text-muted-foreground">{stat.label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* How It Works */}
            <section className="py-20">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-foreground mb-4">How It Works</h2>
                        <p className="text-muted-foreground max-w-2xl mx-auto">
                            Three simple steps to join the competition
                        </p>
                    </div>
                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                step: '01',
                                title: 'Producers Create Challenges',
                                description: 'Upload your beat, set the rules, and optionally add a prize pool. Watch artists compete over your creation.',
                                icon: Music,
                            },
                            {
                                step: '02',
                                title: 'Artists Submit Videos',
                                description: 'Record your performance to the beat, upload your video, and show the world what you\'ve got.',
                                icon: Video,
                            },
                            {
                                step: '03',
                                title: 'Community Votes',
                                description: 'Everyone gets to vote. The submission with the most votes wins the prize and earns recognition.',
                                icon: Star,
                            },
                        ].map((item, i) => (
                            <div key={i} className="card-premium group">
                                <div className="card-premium-inner">
                                    <div className="mb-4 flex items-center justify-between">
                                        <span className="text-4xl font-bold text-primary-500/30">{item.step}</span>
                                        <item.icon className="h-8 w-8 text-primary-400" />
                                    </div>
                                    <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                                    <p className="text-muted-foreground">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-20 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-primary-500/10 via-purple-500/10 to-pink-500/10" />
                <div className="relative mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
                    <h2 className="text-4xl font-bold text-foreground mb-6">
                        Ready to <span className="text-gradient">Drop Your Beat</span>?
                    </h2>
                    <p className="text-lg text-muted-foreground mb-8">
                        Join thousands of producers and artists already competing on BeatBound.
                    </p>
                    <Link href="/register" className="btn-primary inline-flex items-center gap-2 text-lg px-8 py-4">
                        Create Your Account
                        <ArrowRight className="h-5 w-5" />
                    </Link>
                </div>
            </section>

            {/* Footer */}
            <footer className="border-t border-border py-12">
                <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-2">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary-500 to-purple-600">
                                <Music className="h-4 w-4 text-white" />
                            </div>
                            <span className="font-bold text-foreground">BeatBound</span>
                        </div>
                        <div className="flex items-center gap-6 text-sm text-muted-foreground">
                            <Link href="/terms" className="hover:text-foreground transition">Terms</Link>
                            <Link href="/privacy" className="hover:text-foreground transition">Privacy</Link>
                            <Link href="/support" className="hover:text-foreground transition">Support</Link>
                        </div>
                        <div className="text-sm text-muted-foreground">
                            © 2024 BeatBound. All rights reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
