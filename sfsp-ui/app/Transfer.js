"use client";

import { getSodium } from "@/app/lib/sodium";

//The is where we will be creting the shared key encrypting the file and encrypting the AES key
import { useEncryptionStore, getUserKeysSecurely } from "./SecureKeyStorage";

function concatUint8Arrays(arrays) {
  const totalLength = arrays.reduce((sum, arr) => sum + arr.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function normalizeUserKeys(userKeys) {
  return {
    ...userKeys,
    identity_private_key: new Uint8Array(
      Object.values(userKeys.identity_private_key)
    ),
    signedpk_private_key: new Uint8Array(
      Object.values(userKeys.signedpk_private_key)
    ),
    identity_public_key: new Uint8Array(
      Object.values(userKeys.identity_public_key)
    ),
    signedpk_public_key: new Uint8Array(
      Object.values(userKeys.signedpk_public_key)
    ),
    oneTimepks_private: userKeys.oneTimepks_private.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: new Uint8Array(Object.values(opk.private_key)),
    })),
    oneTimepks_public: userKeys.oneTimepks_public.map((opk) => ({
      opk_id: opk.opk_id,
      publicKey: new Uint8Array(Object.values(opk.publicKey)),
    })),
  };
}

export async function SendFile(fileMetadata, recipientUserId, fileid) {
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  // 1️⃣ Get user keys securely
  const userKeysRaw = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(userKeysRaw);

  // 2️⃣ Download encrypted file
  const response = await fetch("http://localhost:5000/api/files/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      filename: fileMetadata.name,
    }),
  });

  if (!response.ok) throw new Error("Failed to retrieve file content");
  const fileBuffer = new Uint8Array(await response.arrayBuffer());

  // 3️⃣ Get recipient's public keys
  const bundleRes = await fetch(`http://localhost:5000/api/users/public-keys/${recipientUserId}`);
  if (!bundleRes.ok) throw new Error("Recipient key bundle not found");

  const { data: recipientKeys } = await bundleRes.json();

  // 4️⃣ Validate SPK signature
  // const isValid = sodium.crypto_sign_verify_detached(
  //   sodium.from_base64(recipientKeys.signedPrekeySignature),
  //   sodium.from_base64(recipientKeys.spk_public),
  //   sodium.from_base64(recipientKeys.ed_signing_public)
  // );
  // if (!isValid) throw new Error("Recipient SPK signature invalid");

  // 5️⃣ Convert sender's IK to Curve25519
  const ikPrivKey = sodium.from_base64(userKeys.identity_private_key);

  // 6️⃣ Generate ephemeral key
  const EK = sodium.crypto_box_keypair();

  // 7️⃣ Derive 4 DH values
  const DH1 = sodium.crypto_scalarmult(
    ikPrivKey,
    sodium.from_base64(recipientKeys.spk_public)
  );
  const DH2 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.ik_public)
  );
  const DH3 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.spk_public)
  );
  const DH4 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.opk.publicKey)
  );

  const combinedDH = new Uint8Array(DH1.length + DH2.length + DH3.length + DH4.length);
  combinedDH.set(DH1, 0);
  combinedDH.set(DH2, DH1.length);
  combinedDH.set(DH3, DH1.length + DH2.length);
  combinedDH.set(DH4, DH1.length + DH2.length + DH3.length);

  const sharedKey = sodium.crypto_generichash(32, combinedDH);

  // 8️⃣ Encrypt file with AES-like key
  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(fileBuffer, fileNonce, aesKey);

  // 9️⃣ Encrypt AES key with shared key
  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(aesKey, keyNonce, sharedKey);

  // 🔟 Prepare metadata
  const metadata = {
    fileNonce: sodium.to_base64(fileNonce),
    keyNonce: sodium.to_base64(keyNonce),
    ikPublicKey: sodium.to_base64(userKeys.identity_public_key),
    ekPublicKey: sodium.to_base64(EK.publicKey),
    opk_id: recipientKeys.opk.opk_id,
  };

  // 🔁 Send all to backend
  const res = await fetch("http://localhost:5000/api/files/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileid,
      userId,
      recipientUserId,
      encryptedFile: sodium.to_base64(encryptedFile, sodium.base64_variants.ORIGINAL),
      encryptedAesKey: sodium.to_base64(encryptedAesKey, sodium.base64_variants.ORIGINAL),
      ekPublicKey: sodium.to_base64(EK.publicKey, sodium.base64_variants.ORIGINAL),
      metadata,
    }),
  });

  if (!res.ok) throw new Error("Failed to send file");
}

export async function GetFilesRecievedFromOtherUsers() {
  const { userId } = useEncryptionStore.getState();
  const response = await fetch("http://localhost:5000/api/files/received", {
    // all from where we store the files received from other users, mongo or else where
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve files");
  }

  const files = await response.json();
  return files.map((file) => ({
    ...file,
    fileName: file.filename, // ensure the file name is accessible
    filePath: file.path, // ensure the file path is accessible
    senderID: file.senderId, // ensure the sender ID is accessible
    fileNonce: file.fileNonce, // ensure the nonce is accessible
    keyNonce: file.keyNonce,
    encryptedAesKey: file.encryptedAesKey, // ensure the encrypted AES key is accessible
    ikPublicKey: file.ikPublicKey, // ensure the IK public key is accessible
    ekPublicKey: file.ekPublicKey, // ensure the EK public key is accessible
    opk_id: file.opk_id, // ensure the OPK ID is accessible
  }));
}

export async function ReceiveFile(files) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  const response = await fetch("http://localhost:5000/api/files/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      path: files.filePath,
      filename: files.fileName,
    }),
  });

  if (!response.ok) {
    throw new Error("Failed to retrieve file");
  }

  const userKeys = await getUserKeysSecurely(encryptionKey);

  const ikPublicKey = files.ikPublicKey;
  const ekPublicKey = files.ekPublicKey;
  const encryptedAesKey = files.encryptedAesKey;
  const encryptedFile = new Uint8Array(await response.arrayBuffer());
  const fileNonce = files.fileNonce;
  const keyNonce = files.keyNonce;

  // ✅ Convert Ed25519 private key to Curve25519 for IK
  const ikPrivKey = sodium.crypto_sign_ed25519_sk_to_curve25519(
    sodium.from_base64(userKeys.identity_private_key)
  );

  // ✅ Find the correct OPK private key
  const opkMatch = userKeys.oneTimepks_private.find(
    (opk) => opk.opk_id === files.opk_id
  );

  if (!opkMatch) throw new Error("Matching OPK not found");

  const opkPrivKey = opkMatch.private_key;

  // ✅ Derive shared secret using DH1–DH4
  const DH1 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.signedpk_private_key),
    sodium.from_base64(ikPublicKey)
  );
  const DH2 = sodium.crypto_scalarmult(
    ikPrivKey,
    sodium.from_base64(ekPublicKey)
  );
  const DH3 = sodium.crypto_scalarmult(
    sodium.from_base64(userKeys.signedpk_private_key),
    sodium.from_base64(ekPublicKey)
  );
  const DH4 = sodium.crypto_scalarmult(
    opkPrivKey,
    sodium.from_base64(ekPublicKey)
  );

  const sharedKey = sodium.crypto_generichash(
    32,
    sodium.crypto_generichash(32, concatUint8Arrays([DH1, DH2, DH3, DH4]))
  );

  // ✅ Decrypt AES key
  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedAesKey),
    sodium.from_base64(keyNonce),
    sharedKey
  );

  if (!aesKey) throw new Error("Failed to decrypt AES key");

  // ✅ Decrypt the file
  const decryptedFile = sodium.crypto_secretbox_open_easy(
    encryptedFile,
    sodium.from_base64(fileNonce),
    aesKey
  );

  if (!decryptedFile) throw new Error("Failed to decrypt file");

  return new Blob([decryptedFile]);
}
