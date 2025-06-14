import { supabase } from '../supabaseClient';
import { hashPassword } from './hash';

export async function confirmReset(email, inputPIN, newPassword) {
  // 1. Fetch user by email
  const { data: user, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', email)
    .single();

  if (error || !user) {
    return { error: 'User not found' };
  }

  // 2. Check if PIN matches
  if (user.resetPIN !== inputPIN) {
    return { error: 'Invalid PIN code' };
  }

  // 3. Hash the new password
  const hashedPassword = await hashPassword(newPassword);

  // 4. Update the password and optionally clear resetPIN
  const { error: updateError } = await supabase
    .from('users')
    .update({
      password: hashedPassword,
      resetPIN: null // Clear the PIN after use (optional but recommended)
    })
    .eq('id', user.id);

  if (updateError) {
    return { error: 'Failed to update password' };
  }

  return { message: 'Password reset successfully' };
}