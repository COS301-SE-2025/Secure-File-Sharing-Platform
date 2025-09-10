import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
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

        const formData = await request.formData();
        const backendFormData = new FormData();

        for (const [key, value] of formData.entries()) {
            backendFormData.append(key, value);
        }

        const response = await fetch('http://localhost:5000/api/files/changeShareMethod', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
            },
            body: backendFormData,
        });

        if (!response.ok) {
            const errorText = await response.text();
            return NextResponse.json(
                { success: false, message: errorText },
                { status: response.status }
            );
        }

        const result = await response.json();
        return NextResponse.json(result);

    } catch (error) {
        console.error('Change share method API error:', error);
        return NextResponse.json(
            { success: false, message: 'Service unavailable' },
            { status: 500 }
        );
    }
}