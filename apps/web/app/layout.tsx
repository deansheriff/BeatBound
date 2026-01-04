import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import Navbar from '@/components/Navbar';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' });

export const metadata: Metadata = {
    title: 'BeatBound - The Ultimate Music Video Competition',
    description: 'Host beat challenges, upload video responses, and win prizes.',
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
            <body className="min-h-screen bg-surface-950 text-surface-100 selection:bg-brand-500/30 selection:text-brand-200">
                <Providers>
                    <Navbar />
                    <main className="pt-16 min-h-screen">
                        {children}
                    </main>
                    <footer className="border-t border-surface-900 bg-surface-950 py-12">
                        <div className="container-custom">
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                                <div>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded bg-gradient-to-br from-brand-500 to-accent-500 flex items-center justify-center text-white font-bold text-xs">
                                            B
                                        </div>
                                        <span className="font-display font-bold text-lg">BeatBound</span>
                                    </div>
                                    <p className="text-surface-400 text-sm leading-relaxed">
                                        The platform where producers and artists compete, collaborate, and get discovered.
                                    </p>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-4 text-surface-200">Platform</h4>
                                    <ul className="space-y-2 text-sm text-surface-400">
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Browse Challenges</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Recent Winners</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">How it Works</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-4 text-surface-200">Community</h4>
                                    <ul className="space-y-2 text-sm text-surface-400">
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Discord Server</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Twitter / X</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Instagram</a></li>
                                    </ul>
                                </div>
                                <div>
                                    <h4 className="font-semibold mb-4 text-surface-200">Legal</h4>
                                    <ul className="space-y-2 text-sm text-surface-400">
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Terms of Service</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Privacy Policy</a></li>
                                        <li><a href="#" className="hover:text-brand-400 transition-colors">Copyright</a></li>
                                    </ul>
                                </div>
                            </div>
                            <div className="border-t border-surface-900 pt-8 text-center text-sm text-surface-500">
                                © {new Date().getFullYear()} BeatBound. All rights reserved.
                            </div>
                        </div>
                    </footer>
                </Providers>
            </body>
        </html>
    );
}
