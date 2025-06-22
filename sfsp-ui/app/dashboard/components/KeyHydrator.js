'use client';

import { useEffect } from 'react';
import { getUserKeysSecurely } from '@/app/SecureKeyStorage';
import { useEncryptionStore } from '@/app/SecureKeyStorage';
import { get } from 'cypress/types/lodash';

export default function KeyHydrator() {
  const setUserKeys = useEncryptionStore((state) => state.setUserKeys);

  useEffect(() => {
    getUserKeysSecurely().then((keys) => {
      if (keys) {
        setUserKeys(keys);
        console.log("Zustand store hydrated with user keys");
      }
    }),
	getUserId().then((userId) => {
	  if (userId) {
		useEncryptionStore.getState().setUserId(userId);
		console.log("Zustand store hydrated with user ID");
	  }
	})
	.catch((error) => {
	  console.error("Error hydrating Zustand store:", error);
	});
  }, []);

  return null; 
}
