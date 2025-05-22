import { supabase } from '../supabaseClient';
import { hashPassword } from './hash';

export async function registerUser({ username, email, password }) {
    const hashed = await hashPassword(password);

    const { data, error } = await supabase
        .from('users')
        .insert([{ username, email, password: hashed }]);

    return { data, error };
}