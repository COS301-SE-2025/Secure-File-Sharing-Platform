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

function ed25519PubToCurve(pubEd25519, sodium) {
  return sodium.crypto_sign_ed25519_pk_to_curve25519(pubEd25519);
}

export async function SendFile(fileMetadata, recipientUserId, fileid, sendViewUrl) {
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  // 1️⃣ Get and normalize keys
  const userKeysRaw = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(userKeysRaw, sodium);

  // 2️⃣ Download encrypted file as binary
  const response = await fetch("http://localhost:5000/api/files/download", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, filename: fileMetadata.name }),
  });
  if (!response.ok) throw new Error("Failed to retrieve file content");

  const buffer = await response.arrayBuffer();
  const encryptedLocalFile = new Uint8Array(buffer);

  // 🔓 Decrypt local
  const nonceHeader = response.headers.get("x-nonce");
  console.log("Received x-nonce header:", nonceHeader);
  const decrypted = sodium.crypto_secretbox_open_easy(
    encryptedLocalFile,
    sodium.from_base64(
      response.headers.get("x-nonce"),
      sodium.base64_variants.ORIGINAL
    ),
    encryptionKey
  );

  // 3️⃣ Get recipient's public keys
  const bundleRes = await fetch(
    `http://localhost:5000/api/users/public-keys/${recipientUserId}`
  );
  if (!bundleRes.ok) throw new Error("Recipient key bundle not found");

  const { data: recipientKeys } = await bundleRes.json();

  // 4️⃣ Derive X3DH shared key
  const ikPrivKeyCurve25519 = sodium.crypto_sign_ed25519_sk_to_curve25519(
    userKeys.identity_private_key
  );
  const EK = sodium.crypto_kx_keypair();

  const DH1 = sodium.crypto_scalarmult(
    ikPrivKeyCurve25519,
    sodium.crypto_sign_ed25519_pk_to_curve25519(
      sodium.from_base64(recipientKeys.spk_public)
    )
  );
  const DH2 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.crypto_sign_ed25519_pk_to_curve25519(
      sodium.from_base64(recipientKeys.ik_public)
    )
  );
  const DH3 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.crypto_sign_ed25519_pk_to_curve25519(
      sodium.from_base64(recipientKeys.spk_public)
    )
  );
  const DH4 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.opk.publicKey)
  );

  const combinedDH = concatUint8Arrays([DH1, DH2, DH3, DH4]);
  const sharedKey = sodium.crypto_generichash(32, combinedDH);

  // 5️⃣ Encrypt the file
  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(
    decrypted,
    fileNonce,
    aesKey
  );

  // 6️⃣ Encrypt AES key with shared key
  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(
    aesKey,
    keyNonce,
    sharedKey
  );

  // 7️⃣ Use FormData to upload as binary
  const formData = new FormData();
  formData.append("fileid", fileid);
  formData.append("userId", userId);
  formData.append("recipientUserId", recipientUserId);
  formData.append(
    "metadata",
    JSON.stringify({
      fileNonce: sodium.to_base64(fileNonce),
      keyNonce: sodium.to_base64(keyNonce),
      ikPublicKey: sodium.to_base64(userKeys.identity_public_key),
      spkPublicKey: sodium.to_base64(userKeys.signedpk_public_key),
      ekPublicKey: sodium.to_base64(EK.publicKey),
      opk_id: recipientKeys.opk.opk_id,
      encryptedAesKey: sodium.to_base64(encryptedAesKey),
    })
  );
  formData.append("encryptedFile", new Blob([encryptedFile]));

  if (sendViewUrl) {
    const res = await fetch(sendViewUrl, {
      method: "POST",
      body: formData,
    });
    if (!res.ok) throw new Error("Failed to send file via view");
    return;
  }

  const res = await fetch("http://localhost:5000/api/files/send", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Failed to send file");
}

export async function ReceiveFile(fileData) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  const rawKeys = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(rawKeys, sodium);

  const { file_id, file_name, file_type, metadata, sender_id } = fileData;
  const {
    ikPublicKey,
    ekPublicKey,
    fileNonce,
    keyNonce,
    opk_id,
    encryptedAesKey,
    spkPublicKey,
  } = JSON.parse(metadata);

  console.log("File id:", file_id, "file_name:", file_name, "type:", file_type);

  const path = `/files/${sender_id}/sent/${file_id}`;
  console.log("Downloading from path:", path);

  // 🚀 Download binary directly
  const response = await fetch(
    "http://localhost:5000/api/files/downloadSentFile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filepath: path }),
    }
  );

  if (!response.ok) throw new Error("Failed to retrieve encrypted file");

  // 🚀 Use arrayBuffer instead of text
  const buffer = await response.arrayBuffer();
  const encryptedFile = new Uint8Array(buffer);

  console.log("Encrypted file bytes length:", encryptedFile.length);

  // 🔑 Derive shared secret using X3DH
  const ikPrivKey = userKeys.identity_private_key;
  const spkPrivKey = userKeys.signedpk_private_key;
  const opkMatch = userKeys.oneTimepks_private.find(
    (opk) => opk.opk_id === opk_id
  );
  if (!opkMatch) throw new Error("Matching OPK not found");

  const spkPrivKeyCurve =
    sodium.crypto_sign_ed25519_sk_to_curve25519(spkPrivKey);
  const ikPrivKeyCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(ikPrivKey);
  const opkPrivKey = opkMatch.private_key;

  const senderIkCurve = sodium.crypto_sign_ed25519_pk_to_curve25519(
    sodium.from_base64(ikPublicKey)
  );
  const senderSpkCurve = sodium.crypto_sign_ed25519_pk_to_curve25519(
    sodium.from_base64(spkPublicKey)
  );

  const DH1 = sodium.crypto_scalarmult(spkPrivKeyCurve, senderIkCurve);
  const DH2 = sodium.crypto_scalarmult(
    ikPrivKeyCurve,
    sodium.from_base64(ekPublicKey)
  );
  const DH3 = sodium.crypto_scalarmult(
    spkPrivKeyCurve,
    sodium.from_base64(ekPublicKey)
  );
  const DH4 = sodium.crypto_scalarmult(
    opkPrivKey,
    sodium.from_base64(ekPublicKey)
  );

  const combinedDH = concatUint8Arrays([DH1, DH2, DH3, DH4]);
  const sharedKey = sodium.crypto_generichash(32, combinedDH);

  console.log("Shared key derived.");

  // 🔓 Decrypt AES key
  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedAesKey),
    sodium.from_base64(keyNonce),
    sharedKey
  );
  if (!aesKey) throw new Error("Failed to decrypt AES key");

  // 🔓 Decrypt actual file
  const decryptedFile = sodium.crypto_secretbox_open_easy(
    encryptedFile,
    sodium.from_base64(fileNonce),
    aesKey
  );
  if (!decryptedFile) throw new Error("Failed to decrypt file");

  console.log("Decrypted file, length:", decryptedFile.length);

  // 🔐 Re-encrypt for local storage
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    decryptedFile,
    nonce,
    encryptionKey
  );

  const formData = new FormData();
  formData.append("userId", userId);
  formData.append("fileName", file_name);
  formData.append("fileType", file_type);
  formData.append("fileDescription", "Received file");
  formData.append("fileTags", JSON.stringify(["received"]));
  formData.append("path", `files/${userId}`);
  formData.append(
    "nonce",
    sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL)
  );

  // ⬇️ Encrypted file as binary Blob
  formData.append("encryptedFile", new Blob([ciphertext]), file_name);

  const res = await fetch("http://localhost:5000/api/files/upload", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw new Error("Upload failed");
}
