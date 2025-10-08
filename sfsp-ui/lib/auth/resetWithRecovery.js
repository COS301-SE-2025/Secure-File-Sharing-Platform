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
      userFiles = await metadataResponse.json();
    }

    reportProgress(3, 6, 'Generating new encryption key...');

    // 5. Generate new salt and derive new key from new password (do this BEFORE re-encrypting files)
    const newSalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const newDerivedKey = sodium.crypto_pwhash(
      32,
      newPassword,
      newSalt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    reportProgress(4, 6, `Re-encrypting ${userFiles.length} file(s)...`);

    // 6. Re-encrypt all files with the new derived key
    const reencryptedFiles = [];
    for (let i = 0; i < userFiles.length; i++) {
      const file = userFiles[i];
      reportProgress(4, 6, `Re-encrypting file ${i + 1}/${userFiles.length}: ${file.fileName}`);

      try {
        // Download encrypted file
        const downloadUrl = getFileApiUrl('/download');
        const downloadResponse = await fetch(downloadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.id,
            fileId: file.fileId,
          }),
        });

        if (!downloadResponse.ok) {
          console.error(`Failed to download file ${file.fileId}`);
          continue;
        }

        const buffer = await downloadResponse.arrayBuffer();
        const encryptedFile = new Uint8Array(buffer);
        const oldNonce = downloadResponse.headers.get('x-nonce');

        // Decrypt with old key
        const decryptedFile = sodium.crypto_secretbox_open_easy(
          encryptedFile,
          sodium.from_base64(oldNonce, sodium.base64_variants.ORIGINAL),
          oldDerivedKey
        );

        if (!decryptedFile) {
          console.error(`Failed to decrypt file ${file.fileId}`);
          continue;
        }

        // Encrypt with new derived key
        const newFileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
        const reencryptedFile = sodium.crypto_secretbox_easy(
          decryptedFile,
          newFileNonce,
          newDerivedKey
        );

        reencryptedFiles.push({
          fileId: file.fileId,
          fileName: file.fileName,
          fileType: file.fileType,
          nonce: sodium.to_base64(newFileNonce, sodium.base64_variants.ORIGINAL),
          encryptedContent: sodium.to_base64(reencryptedFile, sodium.base64_variants.ORIGINAL),
        });
      } catch (error) {
        console.error(`Error re-encrypting file ${file.fileId}:`, error);
      }
    }

    // 7. Create new recovery backup with same recovery key
    const newRecoveryNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const recoveryKeyBytes = sodium.from_base64(recoveryKey.trim());
    const newRecoveryEncrypted = sodium.crypto_secretbox_easy(
      newDerivedKey,
      newRecoveryNonce,
      recoveryKeyBytes
    );

    reportProgress(5, 6, 'Updating your account...');

    // 8. Call backend API to update password, re-encrypt X3DH keys, and update files
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
        reencryptedFiles, // Send re-encrypted files to backend
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

    return {
      success: true,
      message: 'Password reset successfully! All your files have been re-encrypted. You can now log in with your new password.',
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
