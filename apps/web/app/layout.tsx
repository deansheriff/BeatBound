import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { Providers } from './providers';
import { Toaster } from 'sonner';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: 'BeatBound - Video Competition Platform for Music',
    description: 'The ultimate platform for music producers and artists. Create beat challenges, submit video performances, and win prizes.',
    keywords: ['music', 'beat challenge', 'video competition', 'producers', 'artists', 'hip hop', 'rap'],
    authors: [{ name: 'BeatBound' }],
    openGraph: {
        title: 'BeatBound - Video Competition Platform for Music',
        description: 'Create beat challenges, submit video performances, and win prizes.',
        type: 'website',
        siteName: 'BeatBound',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'BeatBound',
        description: 'Video Competition Platform for Music',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className={`${inter.variable} font-sans`}>
                <Providers>
                    {children}
                    <Toaster
                        position="bottom-right"
                        theme="dark"
                        toastOptions={{
                            style: {
                                background: 'hsl(224 71% 4%)',
                                border: '1px solid hsl(216 34% 17%)',
                                color: 'hsl(213 31% 91%)',
                            },
                        }}
                    />
                </Providers>
            </body>
        </html>
    );
}
