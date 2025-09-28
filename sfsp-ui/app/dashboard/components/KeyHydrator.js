'use client';

import { useEffect } from 'react';
import { get } from 'idb-keyval';
import { getUserKeysSecurely, useEncryptionStore } from '@/app/SecureKeyStorage';
import { getSodium } from '@/app/lib/sodium';

export default function KeyHydrator() {
  const encryptionKey = useEncryptionStore((state) => state.encryptionKey);
  const setEncryptionKey = useEncryptionStore((state) => state.setEncryptionKey);
  const setUserId = useEncryptionStore((state) => state.setUserId);
  const setUserKeys = useEncryptionStore((state) => state.setUserKeys);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const userId = await get('userId');
        if (userId) {
          setUserId(userId);
          console.log('✅ Hydrated userId');
        }

        const unlockToken = sessionStorage.getItem('unlockToken');
        if (!unlockToken) {
          console.warn('No unlock token found in sessionStorage.');
          return;
        }

        const sodium = await getSodium();
        const encrypted = await get('encryptedDerivedKey');
        if (!encrypted) {
          console.warn('No encrypted derived key found in IndexedDB.');
          return;
        }

        const unlockKey = sodium.crypto_generichash(32, new TextEncoder().encode(unlockToken));
        const derivedKey = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(encrypted.cipherText),
          sodium.from_base64(encrypted.nonce),
          unlockKey
        );

        if (!derivedKey) {
          console.warn('Decryption of derivedKey failed.');
          return;
        }

        setEncryptionKey(derivedKey);
        console.log('✅ Hydrated encryptionKey');

        const userKeys = await getUserKeysSecurely(derivedKey);
        if (userKeys) {
          setUserKeys(userKeys);
          console.log('✅ Hydrated userKeys');
        }
      } catch (error) {
        console.error('❌ Error hydrating Zustand store:', error);
      }
    };

    hydrate();
  }, [setEncryptionKey, setUserId, setUserKeys]);

  return null;
}