"use client";

import { getSodium } from "@/app/lib/sodium";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

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


export async function SendFile(recipientUserId, fileid, isViewOnly = false) {
  const chunkSize = 5 * 1024 * 1024; // 5 MB per chunk
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  // 1️⃣ Get and normalize user keys
  const userKeysRaw = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(userKeysRaw, sodium);

  // 2️⃣ Download encrypted file as binary
  const response = await fetch(getFileApiUrl("/download"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, fileId: fileid }),
  });
  if (!response.ok) throw new Error("Failed to retrieve file content");

  const buffer = await response.arrayBuffer();
  const encryptedLocalFile = new Uint8Array(buffer);

  // 🔓 Decrypt local file
  const nonceHeader = response.headers.get("x-nonce");
  const decrypted = sodium.crypto_secretbox_open_easy(
    encryptedLocalFile,
    sodium.from_base64(nonceHeader, sodium.base64_variants.ORIGINAL),
    encryptionKey
  );

  const bundleRes = await fetch(
    getApiUrl(`/users/public-keys/${recipientUserId}`)
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

  // 5️⃣ Encrypt file with new AES key
  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(decrypted, fileNonce, aesKey);

  // 6️⃣ Encrypt AES key with shared key
  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(aesKey, keyNonce, sharedKey);

  // 7️⃣ Compute file hash & signature
  const ikPrivateKey = userKeys.identity_private_key;
  const fileHash = sodium.crypto_generichash(32, encryptedFile);
  const signature = sodium.crypto_sign_detached(fileHash, ikPrivateKey);

  // 8️⃣ Build metadata JSON (sent with every chunk)
  const metadataJSON = JSON.stringify({
    fileNonce: sodium.to_base64(fileNonce),
    keyNonce: sodium.to_base64(keyNonce),
    ikPublicKey: sodium.to_base64(userKeys.identity_public_key),
    spkPublicKey: sodium.to_base64(userKeys.signedpk_public_key),
    ekPublicKey: sodium.to_base64(EK.publicKey),
    opk_id: recipientKeys.opk.opk_id,
    encryptedAesKey: sodium.to_base64(encryptedAesKey),
    signature: sodium.to_base64(signature),
    fileHash: sodium.to_base64(fileHash),
    viewOnly: isViewOnly,
  });

  // 9️⃣ Chunk and upload
  const totalChunks = Math.ceil(encryptedFile.length / chunkSize);

  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, encryptedFile.length);
    const chunk = encryptedFile.slice(start, end);

    const formData = new FormData();
    formData.append("fileid", fileid);
    formData.append("userId", userId);
    formData.append("recipientUserId", recipientUserId);
    formData.append("metadata", metadataJSON);
    formData.append("chunkIndex", chunkIndex);
    formData.append("totalChunks", totalChunks);
    formData.append("encryptedFile", new Blob([chunk]), `chunk_${chunkIndex}.bin`);

    const endpoint = isViewOnly
      ? getFileApiUrl("/sendByView")
      : getFileApiUrl("/send");

    const res = await fetch(endpoint, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) throw new Error(`Chunk ${chunkIndex + 1} upload failed`);

    const result = await res.json();
    if (chunkIndex === totalChunks - 1) {
      return isViewOnly ? result.shareId : result.receivedFileID;
    }
  }
}

export async function ChangeShareMethod(recipientUserId, fileid, isViewOnly = false){
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  const userKeysRaw = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(userKeysRaw, sodium);

  const response = await fetch(getFileApiUrl("/download"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId, fileId: fileid }),
  });
  if (!response.ok) throw new Error("Failed to retrieve file content");

  const buffer = await response.arrayBuffer();
  const encryptedLocalFile = new Uint8Array(buffer);

  const nonceHeader = response.headers.get("x-nonce");
  const decrypted = sodium.crypto_secretbox_open_easy(
    encryptedLocalFile,
    sodium.from_base64(
      response.headers.get("x-nonce"),
      sodium.base64_variants.ORIGINAL
    ),
    encryptionKey
  );

  const bundleRes = await fetch(
    getApiUrl(`/users/public-keys/${recipientUserId}`)
  );
  if (!bundleRes.ok) throw new Error("Recipient key bundle not found");

  const { data: recipientKeys } = await bundleRes.json();

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

  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(
    decrypted,
    fileNonce,
    aesKey
  );

  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(
    aesKey,
    keyNonce,
    sharedKey
  );

  const ikPrivateKey = userKeys.identity_private_key;

  const fileHash = sodium.crypto_generichash(32, encryptedFile);
  const signature = sodium.crypto_sign_detached(fileHash, ikPrivateKey);

  const newShareMethod = isViewOnly ? "view" : "download";
  const formData = new FormData();
  formData.append("fileid", fileid);
  formData.append("userId", userId);
  formData.append("recipientId", recipientUserId);
  formData.append("newShareMethod", newShareMethod);
  formData.append(
    "metadata",
    JSON.stringify({
      fileNonce: sodium.to_base64(fileNonce),
      keyNonce: sodium.to_base64(keyNonce),
      ikPublicKey: sodium.to_base64(userKeys.identity_public_key),//we already send ikPublicKey
      spkPublicKey: sodium.to_base64(userKeys.signedpk_public_key),
      ekPublicKey: sodium.to_base64(EK.publicKey),
      opk_id: recipientKeys.opk.opk_id,
      encryptedAesKey: sodium.to_base64(encryptedAesKey),
      signature: sodium.to_base64(signature),
      fileHash: sodium.to_base64(fileHash),
    })
  );
  formData.append("encryptedFile", new Blob([encryptedFile]));

  const res = await fetch(getFileApiUrl("/changeShareMethod"), {
    method: "POST",
    body: formData,
  });

  if(!res.ok) throw new Error("Failed to change share method");
  const result = await res.json();
  if (isViewOnly) {
    return result.shareId;
  } else {
    return result.receivedFileID;
  }
}

export async function ReceiveFile(fileData) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  const rawKeys = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(rawKeys, sodium);

  const { file_id, file_name, file_type, metadata, sender_id, viewOnly } = fileData;
  const {
    ikPublicKey,
    ekPublicKey,
    fileNonce,
    keyNonce,
    opk_id,
    encryptedAesKey,
    spkPublicKey,
    signature,
    fileHash,
  } = JSON.parse(metadata);

  const path = `/files/${sender_id}/sent/${file_id}`;
  const endpoint = viewOnly
    ? getFileApiUrl("/downloadViewFile")
    : getFileApiUrl("/downloadSentFile");

  // 1️⃣ Stream download
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(viewOnly ? { userId, fileId: file_id } : { filepath: path }),
  });

  if (!response.ok) {
    if (response.status === 403) throw new Error("Access has been revoked or expired");
    throw new Error("Failed to retrieve encrypted file");
  }

  const reader = response.body.getReader();
  const chunks = [];
  let totalLength = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    totalLength += value.length;
  }

  const encryptedFile = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    encryptedFile.set(chunk, offset);
    offset += chunk.length;
  }

  // 2️⃣ Verify file hash & signature
  const fileHashBytes = sodium.from_base64(fileHash);
  const computedHash = sodium.crypto_generichash(32, encryptedFile);
  if (!sodium.memcmp(fileHashBytes, computedHash)) {
    throw new Error("File hash does not match expected hash");
  }

  const signatureBytes = sodium.from_base64(signature);
  const ikPublicKeyBytes = sodium.from_base64(ikPublicKey);
  if (!sodium.crypto_sign_verify_detached(signatureBytes, fileHashBytes, ikPublicKeyBytes)) {
    throw new Error("Invalid signature for the received file");
  }

  // 3️⃣ Derive shared secret with X3DH
  const ikPrivKey = userKeys.identity_private_key;
  const spkPrivKey = userKeys.signedpk_private_key;
  
  // Debug: Log available OPK IDs and the requested one
  
  const opkMatch = userKeys.oneTimepks_private.find((opk) => opk.opk_id === opk_id);
  if (!opkMatch) {
    console.error("❌ Matching OPK not found. Available:", userKeys.oneTimepks_private.map(opk => opk.opk_id), "Requested:", opk_id);
    throw new Error("Matching OPK not found");
  }

  const spkPrivKeyCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(spkPrivKey);
  const ikPrivKeyCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(ikPrivKey);
  const opkPrivKey = opkMatch.private_key;

  const senderIkCurve = sodium.crypto_sign_ed25519_pk_to_curve25519(
    sodium.from_base64(ikPublicKey)
  );
  const senderSpkCurve = sodium.crypto_sign_ed25519_pk_to_curve25519(
    sodium.from_base64(spkPublicKey)
  );

  const DH1 = sodium.crypto_scalarmult(spkPrivKeyCurve, senderIkCurve);
  const DH2 = sodium.crypto_scalarmult(ikPrivKeyCurve, sodium.from_base64(ekPublicKey));
  const DH3 = sodium.crypto_scalarmult(spkPrivKeyCurve, sodium.from_base64(ekPublicKey));
  const DH4 = sodium.crypto_scalarmult(opkPrivKey, sodium.from_base64(ekPublicKey));

  const combinedDH = concatUint8Arrays([DH1, DH2, DH3, DH4]);
  const sharedKey = sodium.crypto_generichash(32, combinedDH);

  // 4️⃣ Decrypt AES key and file
  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedAesKey),
    sodium.from_base64(keyNonce),
    sharedKey
  );
  if (!aesKey) throw new Error("Failed to decrypt AES key");

  const decryptedFile = sodium.crypto_secretbox_open_easy(
    encryptedFile,
    sodium.from_base64(fileNonce),
    aesKey
  );
  if (!decryptedFile) throw new Error("Failed to decrypt file");

  // 5️⃣ Re-encrypt for local storage
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(decryptedFile, nonce, encryptionKey);

  // 6️⃣ Start upload session
  const startRes = await fetch(getFileApiUrl("/startUpload"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileName: file_name,
      fileType: file_type,
      userId,
      nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
      fileDescription: "",
      fileTags: viewOnly ? ["received", "view-only"] : ["received"],
      path: "files",
    }),
  });
  if (!startRes.ok) throw new Error("Failed to start upload");
  const { fileId } = await startRes.json();

  // 7️⃣ Chunk + parallel upload
  const chunkSize = 5 * 1024 * 1024;
  const totalChunks = Math.ceil(ciphertext.length / chunkSize);
  await Promise.all(
    Array.from({ length: totalChunks }, (_, chunkIndex) => {
      const start = chunkIndex * chunkSize;
      const end = Math.min(start + chunkSize, ciphertext.length);
      const chunk = ciphertext.slice(start, end);

      const formData = new FormData();
      formData.append("fileId", fileId);
      formData.append("userId", userId);
      formData.append("fileName", file_name);
      formData.append("fileType", file_type || "application/octet-stream");
      formData.append("fileDescription", "");
      formData.append("fileTags", JSON.stringify(viewOnly ? ["received", "view-only"] : ["received"]));
      formData.append("path", "files");
      formData.append(
        "fileHash",
        Array.from(fileHashBytes).map((b) => b.toString(16).padStart(2, "0")).join("")
      );
      formData.append("nonce", sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL));
      formData.append("chunkIndex", chunkIndex.toString());
      formData.append("totalChunks", totalChunks.toString());
      formData.append("encryptedFile", new Blob([chunk]), file_name);

      return fetch(getFileApiUrl("/upload"), { method: "POST", body: formData });
    })
  );

}
