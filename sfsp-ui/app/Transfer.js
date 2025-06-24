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

function normalizeUserKeys(userKeys, sodium) {
  return {
    ...userKeys,
    identity_private_key: sodium.from_base64(userKeys.identity_private_key),
    signedpk_private_key: sodium.from_base64(userKeys.signedpk_private_key),
    identity_public_key: sodium.from_base64(userKeys.identity_public_key),
    signedpk_public_key: sodium.from_base64(userKeys.signedpk_public_key),
    oneTimepks_private: userKeys.oneTimepks_private.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: sodium.from_base64(opk.private_key),
    })),
    oneTimepks_public: userKeys.oneTimepks_public.map((opk) => ({
      opk_id: opk.opk_id,
      publicKey: sodium.from_base64(opk.publicKey),
    })),
  };
}

export async function SendFile(fileMetadata, recipientUserId, fileid) {
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  // 1️⃣ Get and normalize keys
  const userKeysRaw = await getUserKeysSecurely(encryptionKey);
  console.log("Before normalization IK:", userKeysRaw.identity_private_key);
  const userKeys = normalizeUserKeys(userKeysRaw, sodium);

  // 2️⃣ Download encrypted file
  const response = await fetch("http://localhost:5000/api/files/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, filename: fileMetadata.name }),
  });
  if (!response.ok) throw new Error("Failed to retrieve file content");

  const fileBuffer = new Uint8Array(await response.arrayBuffer());

  // 3️⃣ Get recipient's public keys
  const bundleRes = await fetch(
    `http://localhost:5000/api/users/public-keys/${recipientUserId}`
  );
  if (!bundleRes.ok) throw new Error("Recipient key bundle not found");

  const { data: recipientKeys } = await bundleRes.json();

  console.log("Verifying:");
  console.log("SPK pub:", sodium.from_base64(recipientKeys.spk_public));
  console.log("IK pub:", sodium.from_base64(recipientKeys.ik_public));
  console.log("Sig:", sodium.from_base64(recipientKeys.signedPrekeySignature));
  const ik = sodium.from_base64(userKeys.identity_private_key);
  console.log("After decoding IK:", ik); // should be Uint8Array(64)

  // const isValid = sodium.crypto_sign_verify_detached(
  //   sodium.from_base64(recipientKeys.signedPrekeySignature),
  //   sodium.from_base64(recipientKeys.spk_public),
  //   sodium.from_base64(recipientKeys.ik_public)
  // );

  //if (!isValid) throw new Error("Recipient SPK signature invalid");

  // 5️⃣ Convert Ed25519 IK → Curve25519 for DH
  const ikPrivKeyCurve25519 = sodium.crypto_sign_ed25519_sk_to_curve25519(ik);

  // 6️⃣ Ephemeral key pair
  const EK = sodium.crypto_box_keypair();

  // 7️⃣ Derive 4 X3DH shared secrets
  const DH1 = sodium.crypto_scalarmult(
    ikPrivKeyCurve25519,
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

  const combinedDH = concatUint8Arrays([DH1, DH2, DH3, DH4]);
  const sharedKey = sodium.crypto_generichash(32, combinedDH);

  // 8️⃣ Encrypt the file
  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(
    fileBuffer,
    fileNonce,
    aesKey
  );

  // 9️⃣ Encrypt AES key with shared secret
  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(
    aesKey,
    keyNonce,
    sharedKey
  );

  // 🔟 Metadata
  const metadata = {
    fileNonce: sodium.to_base64(fileNonce),
    keyNonce: sodium.to_base64(keyNonce),
    ikPublicKey: sodium.to_base64(userKeys.identity_public_key),
    ekPublicKey: sodium.to_base64(EK.publicKey),
    opk_id: recipientKeys.opk.opk_id,
  };

  // 🔁 Send encrypted data
  const res = await fetch("http://localhost:5000/api/files/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileid,
      userId,
      recipientUserId,
      encryptedFile: sodium.to_base64(encryptedFile),
      encryptedAesKey: sodium.to_base64(encryptedAesKey),
      ekPublicKey: sodium.to_base64(EK.publicKey),
      metadata,
    }),
  });

  if (!res.ok) throw new Error("Failed to send file");
}


export async function ReceiveFile(files) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  const response = await fetch("http://localhost:5000/api/files/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: userId,
      filename: files.fileName,
    }),
  });

  if (!response.ok) throw new Error("Failed to retrieve file");

  // Decode keys
  const rawKeys = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(rawKeys, sodium);

  const ikPrivKey = sodium.crypto_sign_ed25519_sk_to_curve25519(
    userKeys.identity_private_key
  );
  const spkPrivKey = sodium.crypto_sign_ed25519_sk_to_curve25519(
    userKeys.signedpk_private_key
  );

  const opkMatch = userKeys.oneTimepks_private.find(
    (opk) => opk.opk_id === files.opk_id
  );
  if (!opkMatch) throw new Error("Matching OPK not found");

  const opkPrivKey = opkMatch.private_key;

  const encryptedFile = new Uint8Array(await response.arrayBuffer());

  // Derive shared key
  const DH1 = sodium.crypto_scalarmult(
    spkPrivKey,
    sodium.from_base64(files.ikPublicKey)
  );
  const DH2 = sodium.crypto_scalarmult(
    ikPrivKey,
    sodium.from_base64(files.ekPublicKey)
  );
  const DH3 = sodium.crypto_scalarmult(
    spkPrivKey,
    sodium.from_base64(files.ekPublicKey)
  );
  const DH4 = sodium.crypto_scalarmult(
    opkPrivKey,
    sodium.from_base64(files.ekPublicKey)
  );

  const sharedKey = sodium.crypto_generichash(
    32,
    concatUint8Arrays([DH1, DH2, DH3, DH4])
  );

  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(files.encryptedAesKey),
    sodium.from_base64(files.keyNonce),
    sharedKey
  );
  if (!aesKey) throw new Error("Failed to decrypt AES key");

  const decryptedFile = sodium.crypto_secretbox_open_easy(
    encryptedFile,
    sodium.from_base64(files.fileNonce),
    aesKey
  );
  if (!decryptedFile) throw new Error("Failed to decrypt file");

  //uploadfile
  const formData = {
    userId,
    fileName: file.filename,
    fileType: decryptedFile.type,
    fileDescription: "User personal upload",
    fileTags: ["personal"],
    path: `files/${userId}`,
    fileContent: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
  };

  const res = await fetch("http://localhost:5000/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  if (!res.ok) throw new Error("Upload failed");
  return new Blob([decryptedFile]);
}
