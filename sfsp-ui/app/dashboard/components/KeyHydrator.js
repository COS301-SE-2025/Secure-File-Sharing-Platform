'use client';

import { useEffect } from 'react';
import { getUserKeysSecurely } from '@/app/SecureKeyStorage';
import { useEncryptionStore } from '@/app/SecureKeyStorage';

export default function KeyHydrator() {
  const setUserKeys = useEncryptionStore((state) => state.setUserKeys);

  useEffect(() => {
    getUserKeysSecurely().then((keys) => {
      if (keys) {
        setUserKeys(keys);
        console.log("✅ Zustand store hydrated with user keys");
      }
    });
  }, []);

  return null; 
}
