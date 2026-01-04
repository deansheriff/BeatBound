import Link from 'next/link';
import { ArrowRight, Trophy, Video, Zap } from 'lucide-react';

export default function Home() {
    return (
        <div className="flex flex-col">
            {/* Hero Section */}
            <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden">
                {/* Background Effects */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-600/20 rounded-full blur-[128px] animate-pulse-slow" />
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/20 rounded-full blur-[128px] animate-pulse-slow delay-1000" />
                    <div className="absolute inset-0 bg-hero-pattern opacity-[0.03]" />
                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-surface-950/50 to-surface-950" />
                </div>

                <div className="container-custom relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-surface-900/50 border border-surface-700 backdrop-blur-md mb-8 animate-fade-in-up">
                        <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-sm font-medium text-surface-300">Live Competitions Happening Now</span>
                    </div>

                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-display font-bold tracking-tight mb-8">
                        Where Beats Meet <br />
                        <span className="gradient-text">Visual Artistry</span>
                    </h1>

                    <p className="max-w-2xl mx-auto text-lg md:text-xl text-surface-400 mb-10 leading-relaxed">
                        BeatBound is the premier platform for producers to host challenges and artists to compete with video responses. Upload, compete, and get discovered.
                    </p>

                    <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                        <Link href="/challenges" className="btn btn-primary text-lg px-8 py-4 w-full sm:w-auto">
                            Explore Challenges
                        </Link>
                        <Link href="/register" className="btn btn-secondary text-lg px-8 py-4 w-full sm:w-auto">
                            Create Account
                        </Link>
                    </div>

                    {/* Stats Preview */}
                    <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 py-8 border-y border-surface-800/50 bg-surface-950/30 backdrop-blur-sm">
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">$10k+</div>
                            <div className="text-surface-400 text-sm uppercase tracking-wider">Prizes Won</div>
                        </div>
                        <div className="text-center border-y md:border-y-0 md:border-x border-surface-800/50 py-8 md:py-0">
                            <div className="text-4xl font-bold text-white mb-2">500+</div>
                            <div className="text-surface-400 text-sm uppercase tracking-wider">Active Challenges</div>
                        </div>
                        <div className="text-center">
                            <div className="text-4xl font-bold text-white mb-2">50k+</div>
                            <div className="text-surface-400 text-sm uppercase tracking-wider">Video Submissions</div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Section */}
            <section className="py-24 bg-surface-950 relative">
                <div className="container-custom">
                    <div className="text-center max-w-3xl mx-auto mb-16">
                        <h2 className="text-3xl md:text-5xl font-display font-bold mb-6">How It Works</h2>
                        <p className="text-surface-400 text-lg">
                            Whether you're crafting beats or creating visuals, BeatBound connects you with the talent you need.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="card hover:border-brand-500/50 p-8 group">
                            <div className="w-14 h-14 rounded-2xl bg-brand-500/10 flex items-center justify-center mb-6 text-brand-400 group-hover:scale-110 transition-transform duration-300">
                                <Zap className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Producers Host</h3>
                            <p className="text-surface-400 leading-relaxed">
                                Upload your best beats, set the rules, and fund the prize pool securely with Stripe. Watch as artists bring your music to life.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="card hover:border-accent-500/50 p-8 group">
                            <div className="w-14 h-14 rounded-2xl bg-accent-500/10 flex items-center justify-center mb-6 text-accent-400 group-hover:scale-110 transition-transform duration-300">
                                <Video className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Artists create</h3>
                            <p className="text-surface-400 leading-relaxed">
                                Download the stems, record your video response, and submit your entry. Showcase your talent to a global audience.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="card hover:border-emerald-500/50 p-8 group">
                            <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                                <Trophy className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold mb-4">Vote & Win</h3>
                            <p className="text-surface-400 leading-relaxed">
                                The community votes with "Hype" points. Climb the leaderboard and win real cash prizes automatically released to you.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-surface-900 to-brand-950/20" />
                <div className="container-custom relative z-10">
                    <div className="bg-gradient-to-r from-brand-600 to-accent-600 rounded-3xl p-12 md:p-20 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-full bg-[url('/noise.png')] opacity-20 mix-blend-overlay" />
                        <div className="relative z-10 max-w-3xl mx-auto">
                            <h2 className="text-4xl md:text-6xl font-display font-bold mb-6 text-white">
                                Ready to Join the Movement?
                            </h2>
                            <p className="text-xl text-white/90 mb-10">
                                Start hosting challenges or submitting your masterpiece today.
                            </p>
                            <Link href="/register" className="btn bg-white text-surface-950 hover:bg-surface-100 px-10 py-4 text-lg border-none">
                                Get Started Now <ArrowRight className="w-5 h-5 ml-2" />
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
