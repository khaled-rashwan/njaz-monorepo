const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
    transpilePackages: ['@njaz/ui-components'],
    webpack: (config) => {
        // Alias shared assets to serve from the shared package
        config.resolve.alias['@shared-assets'] = path.resolve(__dirname, '../../packages/shared-assets/public');
        return config;
    },
};

module.exports = nextConfig;
