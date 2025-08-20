import { NextResponse } from 'next/server';

export async function POST(request) {
    try {
        const { userId, email } = await request.json();

        if (!userId || !email) {
            return NextResponse.json(
                { error: 'Missing userId or email' },
                { status: 400 }
            );
        }

        const tokenResponse = await fetch('http://localhost:5000/api/users/get-token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ userId }),
        });

        if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            return NextResponse.json(
                { error: errorData.message || 'Failed to generate token' },
                { status: tokenResponse.status }
            );
        }

        const result = await tokenResponse.json();
        return NextResponse.json({ token: result.token });

    } catch (error) {
        console.error('JWT generation error:', error);
        return NextResponse.json(
            { error: 'Failed to generate token' },
            { status: 500 }
        );
    }
}
