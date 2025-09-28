/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    eslint: {
        ignoreDuringBuilds: true,
    },
    images: {
        domains: [
            'res.cloudinary.com',
            'lh3.googleusercontent.com',
            'lh4.googleusercontent.com',
            'lh5.googleusercontent.com',
            'lh6.googleusercontent.com'
        ],
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            // Exclude canvas-related packages from server-side bundling to avoid DOMMatrix errors
            config.externals.push('canvas', '@napi-rs/canvas', 'jsdom');
        }
        return config;
    },
};

export default nextConfig;
