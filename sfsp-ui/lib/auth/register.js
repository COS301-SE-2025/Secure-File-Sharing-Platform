import { supabase } from '../supabaseClient';
import { hashPassword } from './hash';
import { generatePIN } from './generatePIN';

export async function registerUser({ username, email, password }) {
    const hashed = await hashPassword(password);
    const resetPIN = await generatePIN();

    const { data, error } = await supabase
        .from('users')
        .insert([{ username, email, password: hashed, resetPIN }]);

    return { data, error };
}