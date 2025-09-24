import { NextResponse } from 'next/server';

export function middleware(request) {
    const response = NextResponse.next();

    const cspHeader = `
        default-src 'self';
        script-src 'self' 'unsafe-inline' 'unsafe-eval' https://accounts.google.com https://*.googleapis.com https://*.dropbox.com https://*.dropboxusercontent.com;
        script-src-elem 'self' 'unsafe-inline' https://accounts.google.com https://*.googleapis.com https://*.dropbox.com https://*.dropboxusercontent.com;
        connect-src 'self' http://localhost:* https://accounts.google.com https://*.googleapis.com 
        https://oauth2.googleapis.com https://*.dropbox.com https://*.dropboxusercontent.com 
        https://ipapi.co https://api.cloudinary.com;
        script-src-attr 'self' 'unsafe-inline';
        style-src 'self' 'unsafe-inline' https://*.dropboxusercontent.com;
        img-src 'self' data: https: blob:;
        font-src 'self' data:;
        object-src 'none';
        base-uri 'self';
        form-action 'self';
        frame-ancestors 'none';
        frame-src 'self' https://accounts.google.com https://*.googleapis.com https://*.dropbox.com https://*.dropboxusercontent.com;
    `.replace(/\s+/g, ' ').trim();

    response.headers.set('Content-Security-Policy', cspHeader);
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    return response;
}

export const config = {
    matcher: [
        '/((?!_next/static|_next/image|favicon.ico|public|api).*)',
    ],
};