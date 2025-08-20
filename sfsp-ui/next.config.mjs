/** @type {import('next').NextConfig} */
const nextConfig = {
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
};

export default nextConfig;
