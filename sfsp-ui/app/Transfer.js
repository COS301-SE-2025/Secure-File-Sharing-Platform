'use client';

import { getSodium } from '@/app/lib/sodium';

//The is where we will be creting the shared key encrypting the file and encrypting the AES key
import { useEncryptionStore, getUserKeysSecurely } from "./SecureKeyStorage";

export async function SendFile(file, recipientUserId, filePath) {
  //get the user ID and encryption key from the Zustand store
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  //derive a shared key using the user's public keys
  //we will first get the user's public keys from the Zustand store
  const userKeys = await getUserKeysSecurely(encryptionKey);

  //now we need the recipient's public keys, which we will get from the recipients userID
  const recipientKeys = await fetch(
    `http://localhost:5000/api/users/${recipientUserId}/public-keys`
  );

  //now we need to check if the recipient's keys are valid
  if (!recipientKeys.ok) {
    throw new Error("Recipient keys not found or invalid");
  }

  //we need to check if the IK for the recipient is valid
  const valid = sodium.crypto_sign_verify_detached(
    sodium.from_base64(recipientKeys.signedPreKeySignature),
    sodium.from_base64(recipientKeys.spk_public_key),
    sodium.from_base64(recipientKeys.ik_public_key)
  );
  if (!valid) throw new Error("Invalid SPK signature");

  //now we can create the EK for the user
  const EK = sodium.crypto_sign_keypair();

  //now we can create the shared key using the user's IK and the recipient's IK
  const DH1 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.ik_private_key),
    sodium.from_base64(recipientKeys.spk_public_key)
  );
  const DH2 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.ik_public_key)
  );
  const DH3 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.spk_public_key)
  );
  const DH4 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.opk_public_key)
  );

  const dhConcat = sodium.concat([DH1, DH2, DH3, DH4]);
  const sharedKey = sodium.crypto_generichash(32, dhConcat);

  //Generate the AES key from the shared key
  const aesKey = sodium.crypto_aead_xchacha20poly1305_ietf_keygen();

  //Encrypt the file using the AES key
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox(fileBuffer, nonce, aesKey);

  //encrypt the AES key using the shared key
  const encryptedAesKey = sodium.crypto_secretbox_easy(
    aesKey,
    nonce,
    sharedKey
  );

  //now we send the encrypted file, the nonce, the encrypted AES key, the IK public, the EK public, and the user ID to the server
  const response = await fetch("http://localhost:5000/api/files/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
	  fileName: file.name,
	  filePath: filePath, //the path where the file will be stored, this should be modified to be in the sending folder in the api
      userId, //the id is sent so that we can download and fetch the file later from the the users files
      encryptedFile: sodium.to_base64(encryptedFile),// this will be sent to the users server sending folder
      nonce: sodium.to_base64(nonce),
      encryptedAesKey: sodium.to_base64(encryptedAesKey),
      ikPublicKey: sodium.to_base64(userKeys.ik_public_key), //for decrypting the file later
      ekPublicKey: sodium.to_base64(EK.publicKey), //for decrypting the file later
	  opk_id: recipientKeys.opk_id, //the OPK ID of the recipient
    }),
  });
  if (!response.ok) {
    throw new Error("Failed to send file");
  }
}

export async function GetFilesRecievedFromOtherUsers() {
	  const { userId } = useEncryptionStore.getState();
  const response = await fetch("http://localhost:5000/api/files/received", {// all from where we store the files received from other users, mongo or else where
	method: "POST",
	headers: { "Content-Type": "application/json" },
	body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
	throw new Error("Failed to retrieve files");
  }

  const files = await response.json();
  return files.map(file => ({
	...file,
	fileName: file.filename, // ensure the file name is accessible
	filePath: file.path, // ensure the file path is accessible
	senderID: file.senderId, // ensure the sender ID is accessible
	nonce: file.nonce, // ensure the nonce is accessible
	encryptedAesKey: file.encryptedAesKey, // ensure the encrypted AES key is accessible
	ikPublicKey: file.ikPublicKey, // ensure the IK public key is accessible
	ekPublicKey: file.ekPublicKey, // ensure the EK public key is accessible
	opk_id : file.opk_id, // ensure the OPK ID is accessible
  }));
}

export async function ReceiveFile(files) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  const response = await fetch("http://localhost:5000/api/files/download", { //reuse the download endpoint to get the encrypted file
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: files.filePath, //the path where the file is stored
      filename: files.fileName, //the name of the file to download
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve file");
  }

  const userKeys = await getUserKeysSecurely(encryptionKey);

  // Recompute shared key
  const DH1 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.spk_private_key),
    sodium.from_base64(ikPublicKey)
  );
  const DH2 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.ik_private_key),
    sodium.from_base64(ekPublicKey)
  );
  const DH3 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.spk_private_key),
    sodium.from_base64(ekPublicKey)
  );
  const DH4 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.oneTimepks_private), // ensure it's the correct OPK
    sodium.from_base64(ekPublicKey)
  );

  const sharedKey = sodium.crypto_generichash(
    32,
    sodium.concat([DH1, DH2, DH3, DH4])
  );

  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedAesKey),
    sodium.from_base64(nonce),
    sharedKey
  );

  const decryptedFile = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedFile),
    sodium.from_base64(nonce),
    aesKey
  );

  return new Blob([decryptedFile]);
}
