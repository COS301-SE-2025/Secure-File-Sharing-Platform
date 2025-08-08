import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

export async function POST(request) {
    try {
        const { userId, email } = await request.json();

        if (!userId || !email) {
        return NextResponse.json(
            { error: 'Missing userId or email' },
            { status: 400 }
        );
        }

        const payload = { userId, email };
        const secret = process.env.JWT_SECRET || 'nobody-is-going-to-guess-this-secret';
        const token = jwt.sign(payload, secret, { expiresIn: '24h' });

        return NextResponse.json({ token });

    } catch (error) {
        console.error('JWT generation error:', error);
        return NextResponse.json(
        { error: 'Failed to generate token' },
        { status: 500 }
        );
    }
}
