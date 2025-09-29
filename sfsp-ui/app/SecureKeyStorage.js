'use client';

import { set, get, del } from 'idb-keyval';
import { getSodium } from '@/app/lib/sodium';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useEncryptionStore = create(
  persist(
    (set) => ({
      encryptionKey: null,
      setEncryptionKey: (key) => set({ encryptionKey: key }),

      userId: null,
      setUserId: (id) => set({ userId: id }),

      userKeys: null,
      setUserKeys: (keys) => set({ userKeys: keys }),
    }),
    {
      name: 'encryption-store',
      partialize: (state) => ({ userId: state.userId }), // only persist this
    }
  )
);


// ========== Secure Storage Functions ==========

// Encrypt and store user keys securely in IndexedDB
export const storeUserKeysSecurely = async (userKeys, encryptionKey) => {
  try {
    const sodium = await getSodium();
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);

    // ✅ Encode Uint8Arrays to base64
    const serializedKeys = {
      ...userKeys,
      identity_private_key: sodium.to_base64(userKeys.identity_private_key),
      identity_public_key: sodium.to_base64(userKeys.identity_public_key),
      signedpk_private_key: sodium.to_base64(userKeys.signedpk_private_key),
      signedpk_public_key: sodium.to_base64(userKeys.signedpk_public_key),
      signedPrekeySignature: sodium.to_base64(userKeys.signedPrekeySignature),
      oneTimepks_private: userKeys.oneTimepks_private.map(opk => ({
        opk_id: opk.opk_id,
        private_key: sodium.to_base64(opk.private_key),
      })),
      oneTimepks_public: userKeys.oneTimepks_public.map(opk => ({
        opk_id: opk.opk_id,
        publicKey: sodium.to_base64(opk.publicKey),
      })),
    };

    const plaintext = new TextEncoder().encode(JSON.stringify(serializedKeys));
    const cipherText = sodium.crypto_secretbox_easy(plaintext, nonce, encryptionKey);

    await set('userKeys', {
      cipherText: sodium.to_base64(cipherText),
      nonce: sodium.to_base64(nonce),
    });

    if (userKeys.userId) {
      await set('userId', userKeys.userId);
    }

  } catch (error) {
    console.error('❌ Error storing user keys:', error);
  }
};


// Retrieve and decrypt user keys from IndexedDB
export const getUserKeysSecurely = async (encryptionKey) => {
  try {
    const sodium = await getSodium();
    const encrypted = await get('userKeys');
    if (!encrypted) return null;

    const decrypted = sodium.crypto_secretbox_open_easy(
      sodium.from_base64(encrypted.cipherText),
      sodium.from_base64(encrypted.nonce),
      encryptionKey
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    console.error('Error decrypting or retrieving user keys:', error);
    return null;
  }
};

// Clear all secure key data
export const deleteUserKeysSecurely = async () => {
  try {
    await del('userKeys');
    await del('userId');
  } catch (error) {
    console.error('Error deleting user keys:', error);
  }
};

// ========== App Startup: Load Keys Into Zustand ==========

export const loadKeysToStore = async (password) => {
  const sodium = await getSodium();

  const encrypted = await get('userKeys');
  if (!encrypted) return false;

  const decryptedPreview = await get('userId'); // assumes you persisted it
  if (!decryptedPreview) return false;

  // For demo: load salt from decryptedPreview or from userKeys if included
  const decryptedKeys = await getUserKeysSecurelyFromPassword(password); // use helper below

  if (!decryptedKeys || !decryptedKeys.userId) return false;

  const derivedKey = sodium.crypto_pwhash(
    32,
    password,
    decryptedKeys.salt,
    sodium.crypto_pwhash_OPSLIMIT_MODERATE,
    sodium.crypto_pwhash_MEMLIMIT_MODERATE,
    sodium.crypto_pwhash_ALG_DEFAULT
  );

  useEncryptionStore.setState({
    encryptionKey: derivedKey,
    userId: decryptedKeys.userId,
    userKeys: decryptedKeys,
  });

  return true;
};

// Helper to get user keys + salt with password (you might need salt stored separately)
export const getUserKeysSecurelyFromPassword = async (password) => {
  try {
    const sodium = await getSodium();
    const encrypted = await get('userKeys');
    if (!encrypted) return null;

    const userId = await get('userId'); // optional
    if (!userId) return null;

    // You need to have saved salt as part of userKeys before encryption
    const decrypted = sodium.crypto_secretbox_open_easy(
      sodium.from_base64(encrypted.cipherText),
      sodium.from_base64(encrypted.nonce),
      sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64((JSON.parse(new TextDecoder().decode(
          sodium.crypto_secretbox_open_easy(
            sodium.from_base64(encrypted.cipherText),
            sodium.from_base64(encrypted.nonce),
            sodium.crypto_pwhash(
              32,
              password,
              sodium.from_base64("...salt..."), // Replace with your salt storage
              sodium.crypto_pwhash_OPSLIMIT_MODERATE,
              sodium.crypto_pwhash_MEMLIMIT_MODERATE,
              sodium.crypto_pwhash_ALG_DEFAULT
            )
          )
        ))).salt), // assumes salt is inside userKeys
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      )
    );

    return JSON.parse(new TextDecoder().decode(decrypted));
  } catch (error) {
    console.error('Error decrypting keys with password:', error);
    return null;
  }
};

export const storeDerivedKeyEncrypted = async (derivedKey, unlockToken = 'session-unlock') => {
  const sodium = await getSodium();
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const unlockKey = sodium.crypto_generichash(32, new TextEncoder().encode(unlockToken));

  const encrypted = sodium.crypto_secretbox_easy(derivedKey, nonce, unlockKey);

  await set('encryptedDerivedKey', {
    cipherText: sodium.to_base64(encrypted),
    nonce: sodium.to_base64(nonce),
  });

  // 🔐 store token in sessionStorage
  sessionStorage.setItem('unlockToken', unlockToken);
};

export const restoreSession = async () => {
  const unlockToken = sessionStorage.getItem('unlockToken');
  if (!unlockToken) return false;

  const sodium = await getSodium();
  const encrypted = await get('encryptedDerivedKey');
  if (!encrypted) return false;

  const unlockKey = sodium.crypto_generichash(32, new TextEncoder().encode(unlockToken));

  const derivedKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encrypted.cipherText),
    sodium.from_base64(encrypted.nonce),
    unlockKey
  );

  if (!derivedKey) return false;

  const userKeys = await getUserKeysSecurely(derivedKey);
  if (!userKeys || !userKeys.userId) return false;

  useEncryptionStore.setState({
    encryptionKey: derivedKey,
    userId: userKeys.userId,
    userKeys: userKeys,
  });

  return true;
};

//One brach had this the other(receive) didn't
export function getUserId() {
  return useEncryptionStore.getState().userId;
}