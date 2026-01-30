/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    reactStrictMode: true,
    images: {
        domains: [
            'localhost',
            'beatbound-videos.s3.amazonaws.com',
            'beatbound-videos.s3.us-east-1.amazonaws.com',
        ],
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**.amazonaws.com',
            },
            {
                protocol: 'https',
                hostname: '**.cloudfront.net',
            },
        ],
    },
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${process.env.API_INTERNAL_URL || 'http://localhost:4000'}/api/:path*`,
            },
        ];
    },
};

module.exports = nextConfig;
