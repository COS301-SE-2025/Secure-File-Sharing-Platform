import { supabase } from '../supabaseClient';
import bcrypt from 'bcryptjs';

export async function loginUser({ email, password }) {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .eq('email', email);

    if (error || users.length === 0) {
        return { error: 'User not found' };
    }

    const user = users[0];

    const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return { error: 'Invalid credentials' };
    }

    return { data: user };
}
