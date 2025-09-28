import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function registerUser({ username, email, password, keyData }) {
    const hashedPassword = await hashPassword(password);
    
    const { data, error } = await supabase.from('users').insert([
        { 
            username, 
            email, 
            password: hashedPassword,
            ik_public: keyData.ik_public,
            spk_public: keyData.spk_public,
            opks_public: JSON.stringify(keyData.opks_public),
            nonce: keyData.nonce,
            signedPrekeySignature: keyData.signedPrekeySignature,
            salt: keyData.salt,
            is_verified: false
        }
    ]).select().single();
    
    return { data, error };
}

export async function loginUser(email, password) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    if (error || !data) {
        return { data: null, error: { message: 'Invalid email or password' } };
    }
    
    if (!data.password && data.google_id) {
        return { data: null, error: { message: 'This account was created with Google. Please use "Continue with Google" to sign in.' } };
    }
    
    if (!data.password) {
        return { data: null, error: { message: 'Invalid email or password' } };
    }
    
    const isValidPassword = await verifyPassword(password, data.password);
    if (!isValidPassword) {
        return { data: null, error: { message: 'Invalid email or password' } };
    }
    
    return { data, error: null };
}

export async function getUserByEmail(email) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
    return { data, error };
}

export async function getUserByGoogleId(googleId) {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('google_id', googleId)
        .single();
    
    return { data, error };
}

export async function createGoogleUser(googleUser, keyData) {
    const { data, error } = await supabase.from('users').insert([
        {
            email: googleUser.email,
            username: googleUser.name,
            password: null,
            google_id: googleUser.id,
            avatar_url: googleUser.picture,
            is_verified: googleUser.verified_email,
            ik_public: keyData.ik_public,
            spk_public: keyData.spk_public,
            opks_public: JSON.stringify(keyData.opks_public),
            nonce: keyData.nonce,
            signedPrekeySignature: keyData.signedPrekeySignature,
            salt: keyData.salt,
        }
    ]).select().single();
    
    return { data, error };
}

export async function updateUserGoogleId(userId, googleId, avatarUrl, isVerified) {
    const { data, error } = await supabase
        .from('users')
        .update({ 
            google_id: googleId,
            avatar_url: avatarUrl,
            is_verified: isVerified
        })
        .eq('id', userId)
        .select()
        .single();
    
    return { data, error };
}