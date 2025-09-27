import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
    try {
        const { userId } = await params;
        const token = request.cookies.get('auth_token')?.value;
        
        if (!token) {
            return NextResponse.json(
                { success: false, message: 'Authentication required' },
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
            const verifyError = await verifyResponse.text();
            console.warn('Token verification failed:', verifyError);
            return NextResponse.json(
                { valid: false, message: 'Invalid or expired token' },
                { status: 401 }
            );
        }

        const userRes = await fetch(`http://localhost:5000/api/users/public-keys/${userId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
        });

        if (!userRes.ok) {
            const errorData = await userRes.json();
            return NextResponse.json(errorData, { status: userRes.status });
        }

        const result = await userRes.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Get public keys API error:', error);
        return NextResponse.json(
            { success: false, message: 'Service unavailable' },
            { status: 500 }
        );
    }
}