import { set, del, get} from 'idb-keyval';
import sodium from 'libsodium-wrappers';
import {create} from 'zustand';



//store the derived key in a Zustand store
export const useEncryptionStore = create((set) => ({
  encryptionKey: null,
  setEncryptionKey: (key) => set({ encryptionKey: key }),

  userId: null,
  setUserId: (id) => set({ userId: id })
}));

//use the function to store the user keys securely in IndexedDB
//You can use this function to store the user keys after successful signup or login
export const storeUserKeysSecurely = async (userKeys, encryptionKey) => {
  try {
	await sodium.ready;
	const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
	const plaintext = sodium.to_base64(new TextEncoder().encode(JSON.stringify(userKeys)));

	const cipherText = sodium.crypto_secretbox(
	  sodium.from_base64(plaintext),
	  nonce,
	  encryptionKey
	);

	await set('userKeys', {
	  cipherText: sodium.to_base64(cipherText),
	  nonce: sodium.to_base64(nonce)
	});
	console.log('User keys stored securely');
  } catch (error) {
	console.error('Error storing user keys:', error);
  }
};

//use this function when the user logs out or when they exit the tab
export const deleteUserKeysSecurely = async () => {
  try {
	// Delete the user keys from IndexedDB
	await del('userKeys');
	console.log('User keys deleted securely');
  } catch (error) {
	console.error('Error deleting user keys:', error);
  }
}

export const getUserKeysSecurely = async (encryptionKey) => {
  try {
	await sodium.ready;
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





