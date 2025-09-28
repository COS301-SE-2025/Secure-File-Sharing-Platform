import { NextResponse } from 'next/server';
import { sendVerificationEmail, generateVerificationCode } from '@/lib/emailService';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
    try {
        const { email, userId, userName, type = 'email_verification' } = await request.json();

        if (!email || !userId) {
            return NextResponse.json(
                { error: 'Email and userId are required' },
                { status: 400 }
            );
        }

        const verificationCode = generateVerificationCode();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        const { error: insertError } = await supabase
        .from('verification_codes')
        .insert({
            user_id: userId,
            code: verificationCode,
            expires_at: expiresAt.toISOString(),
            type: type,
            used: false
        });

        if (insertError) {
            console.error('Failed to store verification code:', insertError);
            return NextResponse.json(
                { error: 'Failed to generate verification code' },
                { status: 500 }
            );
        }

        const emailResult = await sendVerificationEmail(email, verificationCode, userName || 'User');

        if (!emailResult.success) {
            return NextResponse.json(
                { error: 'Failed to send verification email' },
                { status: 500 }
            );
        }

        return NextResponse.json({
        success: true,
        message: 'Verification code sent successfully'
        });

    } catch (error) {
        console.error('Send verification error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
