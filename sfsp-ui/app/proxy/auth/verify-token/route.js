import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const token = request.cookies.get('auth_token')?.value;
        
        if (!token) {
            return NextResponse.json(
                { valid: false, message: 'No token found' },
                { status: 401 }
            );
        }

        const verifyResponse = await fetch('http://localhost:5000/api/users/verify-token', {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!verifyResponse.ok) {
            return NextResponse.json(
                { valid: false, message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const result = await verifyResponse.json();
        console.log('Backend result:', result); 
        
        if (result.success && result.data) {
            return NextResponse.json({ 
                valid: true,
                user: result.data 
            });
        } else {
            return NextResponse.json(
                { valid: false, message: result.message || 'Verification failed' },
                { status: 401 }
            );
        }

    } catch (error) {
        console.error('Token verification error:', error);
        return NextResponse.json(
            { valid: false, message: 'Verification service unavailable' },
            { status: 500 }
        );
    }
}