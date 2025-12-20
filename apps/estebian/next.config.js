/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@njaz/ui-components', '@njaz/shared-auth'],
    images: {
        domains: ['localhost'],
        unoptimized: true,
    },
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
