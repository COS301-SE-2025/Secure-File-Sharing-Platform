import { getSodium } from '@/app/lib/sodium';
import { supabase } from '../supabaseClient';
import { getApiUrl, getFileApiUrl } from '@/lib/api-config';

/**
 * Reset user password using recovery key
 * Re-encrypts all user X3DH keys and files with new password
 * @param {string} email - User's email address
 * @param {string} recoveryKey - Base64 encoded recovery key (shown during signup)
 * @param {string} newPassword - New password to set
 * @param {Function} onProgress - Optional callback for progress updates (current, total, message)
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function resetPasswordWithRecovery(email, recoveryKey, newPassword, onProgress = null) {
  try {
    const sodium = await getSodium();

    // Helper to report progress
    const reportProgress = (current, total, message) => {
      if (onProgress) {
        onProgress(current, total, message);
      }
    };

    reportProgress(1, 6, 'Verifying recovery key...');

    // 1. Fetch user data from Supabase
    const { data: user, error: fetchError } = await supabase
      .from('users')
      .select('id, email, recovery_key_encrypted, recovery_key_nonce, recovery_salt, salt, nonce')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      return {
        success: false,
        message: 'User not found. Please check your email address.'
      };
    }

    // 2. Check if user has recovery key set up
    if (!user.recovery_key_encrypted || !user.recovery_key_nonce) {
      return {
        success: false,
        message: 'This account does not have a recovery key set up. Please contact support.',
      };
    }

    // 3. Verify recovery key by attempting to decrypt the backup
    let oldDerivedKey;
    try {
      const recoveryKeyBytes = sodium.from_base64(recoveryKey.trim());

      oldDerivedKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(user.recovery_key_encrypted),
        sodium.from_base64(user.recovery_key_nonce),
        recoveryKeyBytes
      );

      if (!oldDerivedKey) {
        throw new Error('Decryption failed');
      }
    } catch (error) {
      return {
        success: false,
        message: 'Invalid recovery key. Please check and try again.',
      };
    }

    reportProgress(2, 6, 'Fetching your files...');

    // 4. Fetch all user files metadata
    const metadataUrl = getFileApiUrl('/metadata');
    const metadataResponse = await fetch(metadataUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id }),
    });

    let userFiles = [];
    if (metadataResponse.ok) {
      const data = await metadataResponse.json();
      userFiles = Array.isArray(data) ? data : [];
    }

    // If user has no files, skip re-encryption step
    if (userFiles.length === 0) {
      console.log('No files to re-encrypt for this user');
    }

    reportProgress(3, 6, 'Generating new encryption key...');

    // 5. Generate new salt and derive new key from new password
    const newSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const newDerivedKey = sodium.crypto_pwhash(
      32,
      newPassword,
      newSalt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    if (userFiles.length > 0) {
      reportProgress(4, 6, `You have ${userFiles.length} file(s) that will be re-encrypted in the background...`);
    } else {
      reportProgress(4, 6, 'No files to re-encrypt...');
    }

    // Note: File re-encryption will happen in the background on the backend
    // The user will receive an email when the process completes

    // 6. Create new recovery backup with same recovery key
    const newRecoveryNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const recoveryKeyBytes = sodium.from_base64(recoveryKey.trim());
    const newRecoveryEncrypted = sodium.crypto_secretbox_easy(
      newDerivedKey,
      newRecoveryNonce,
      recoveryKeyBytes
    );

    reportProgress(5, 6, 'Updating your account...');

    // 7. Call backend API to update password and re-encrypt X3DH keys
    // Files will be re-encrypted in the background
    const resetUrl = getApiUrl('/users/reset-password-with-recovery');

    const response = await fetch(resetUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: user.id,
        email: user.email,
        newPassword,
        oldDerivedKey: sodium.to_base64(oldDerivedKey),
        newDerivedKey: sodium.to_base64(newDerivedKey),
        newSalt: sodium.to_base64(newSalt),
        recovery_key_encrypted: sodium.to_base64(newRecoveryEncrypted),
        recovery_key_nonce: sodium.to_base64(newRecoveryNonce),
        oldNonce: user.nonce,
        fileCount: userFiles.length, // Send file count for background processing
      }),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      return {
        success: false,
        message: result.message || 'Failed to reset password. Please try again.',
      };
    }

    reportProgress(6, 6, 'Password reset complete!');

    // Build appropriate success message based on file count
    let successMessage = 'Password reset successfully! You can now log in with your new password.';
    if (userFiles.length > 0) {
      successMessage += ` Your ${userFiles.length} file(s) are being re-encrypted in the background. You will receive an email confirmation when the process completes.`;
    }

    return {
      success: true,
      message: successMessage,
      data: result.data,
    };

  } catch (error) {
    console.error('Password reset error:', error);
    return {
      success: false,
      message: 'An unexpected error occurred. Please try again later.',
    };
  }
}
