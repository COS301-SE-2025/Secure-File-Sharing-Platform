'use client';

import { useEffect } from 'react';
import { getUserKeysSecurely } from '@/app/SecureKeyStorage';
import { useEncryptionStore } from '@/app/SecureKeyStorage';
import { get } from 'idb-keyval';


export default function KeyHydrator() {
  const encryptionKey = useEncryptionStore((state) => state.encryptionKey);
  const setUserId = useEncryptionStore((state) => state.setUserId);
  const setUserKeys = useEncryptionStore((state) => state.setUserKeys);

  useEffect(() => {
    const hydrate = async () => {
      try {
        const userId = await get('userId'); // Get from IndexedDB
        if (userId) {
          setUserId(userId);
          console.log('Zustand store hydrated with user ID');
        }

        if (encryptionKey) {
          const keys = await getUserKeysSecurely(encryptionKey);
          if (keys) {
            setUserKeys(keys);
            console.log('Zustand store hydrated with user keys');
          }
        }
      } catch (error) {
        console.error('Error hydrating Zustand store:', error);
      }
    };

    hydrate();
  }, [encryptionKey]);

  return null;
}
