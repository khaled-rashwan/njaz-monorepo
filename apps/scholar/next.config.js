/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist'],
    },
    transpilePackages: ['@njaz/ui-components', '@njaz/shared-auth', 'aws-amplify', '@aws-amplify'],
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
