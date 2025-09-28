import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(request) {
    try {
        const { userId, code } = await request.json();

        if (!userId || !code) {
            return NextResponse.json(
                { error: 'userId and code are required' },
                { status: 400 }
            );
        }

        const { data: verificationData, error: fetchError } = await supabase
        .from('verification_codes')
        .select('*')
        .eq('user_id', userId)
        .eq('code', code)
        .in('type', ['google_signin', 'email_verification', 'login_verify', 'google_login', 'google_signup'])
        .eq('used', false)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

        if (fetchError || !verificationData) {
            return NextResponse.json(
                { error: 'Invalid verification code' },
                { status: 400 }
            );
        }

        const now = new Date();
        const expiresAt = new Date(verificationData.expires_at);
        
        if (now > expiresAt) {
            return NextResponse.json(
                { error: 'Verification code has expired' },
                { status: 400 }
            );
        }

        const { error: updateError } = await supabase
        .from('verification_codes')
        .update({ used: true })
        .eq('id', verificationData.id);

        if (updateError) {
            console.error('Failed to mark code as used:', updateError);
            return NextResponse.json(
                { error: 'Failed to verify code' },
                { status: 500 }
            );
        }

        // Mark the user as verified
        const { error: userUpdateError } = await supabase
        .from('users')
        .update({ is_verified: true })
        .eq('id', userId);

        if (userUpdateError) {
            console.error('Failed to mark user as verified:', userUpdateError);
            // Continue anyway as the code was valid
        }

        return NextResponse.json({
            success: true,
            message: 'Verification successful'
        });

    } catch (error) {
        console.error('Verify code error:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
