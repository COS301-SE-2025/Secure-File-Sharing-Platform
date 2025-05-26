'use client';

import { supabase } from '../supabaseClient';


const sendResetEmail = (email, pinCode) => {
  const mailOptions = {
    from: 'cacheme.2025@gmail.com',
    to: email,
    subject: 'Password Reset PIN Code',
    html: `<p>Your password reset PIN code is: <strong>${pinCode}</strong></p>
           <p>Use this PIN in the reset form to change your password.</p>`,
  };

  return transporter.sendMail(mailOptions);
};

export async function requestPasswordReset(email) {
  const { data: users, error } = await supabase
    .from('users')
    .select('email, resetPIN')
    .eq('email', email)
    .single();

  if (error || !users) {
    return { error: 'Email not found' };
  }

  const { resetPIN } = users;

  try {
    await sendResetEmail(email, resetPIN);
    return { message: 'Reset PIN sent to email' };
  } catch (err) {
    return { error: 'Failed to send email', details: err.message };
  }
}
