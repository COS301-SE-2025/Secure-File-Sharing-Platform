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

export async function SendFile(fileMetadata, recipientUserId, fileid) {
  const sodium = await getSodium();
  const { userId, encryptionKey } = useEncryptionStore.getState();

  // try {
  //   sodium.from_base64(
  //     userKeysRaw.identity_private_key,
  //     sodium.base64_variants.ORIGINAL
  //   );
  //   console.log("Valid base64 key");
  // } catch (e) {
  //   console.error("INVALID base64:", e);
  // }

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
  const { fileName, fileContent, nonce } = await response.json();

      const decrypted = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(fileContent, sodium.base64_variants.ORIGINAL),
        sodium.from_base64(nonce, sodium.base64_variants.ORIGINAL),
        encryptionKey
      );

  const fileBuffer = decrypted;

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

  console.log("Identity private key is: ", userKeys.identity_private_key);

  // const isValid = sodium.crypto_sign_verify_detached(
  //   sodium.from_base64(recipientKeys.signedPrekeySignature),
  //   sodium.from_base64(recipientKeys.spk_public),
  //   sodium.from_base64(recipientKeys.ik_public)
  // );

  //if (!isValid) throw new Error("Recipient SPK signature invalid");

  // 5️⃣ Convert Ed25519 IK → Curve25519 for DH
  const ikPrivKeyCurve25519 = sodium.crypto_sign_ed25519_sk_to_curve25519(
    userKeys.identity_private_key
  );

  // 6️⃣ Ephemeral key pair
  const EK = sodium.crypto_box_keypair();

  // 7️⃣ Derive 4 X3DH shared secrets
  const DH1 = sodium.crypto_scalarmult(
    ikPrivKeyCurve25519,
    sodium.from_base64(recipientKeys.spk_public)
  );

  console.log("DH1 is :", DH1);
  const DH2 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.ik_public)
  );

  console.log("DH2 is: ", DH2);
  const DH3 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.spk_public)
  );

  console.log("DH3 is: ", DH3);
  const DH4 = sodium.crypto_scalarmult(
    EK.privateKey,
    sodium.from_base64(recipientKeys.opk.publicKey)
  );

  console.log("DH4 is :", DH4);
  const combinedDH = concatUint8Arrays([DH1, DH2, DH3, DH4]);

  console.log("Combined DH is :", combinedDH);
  const sharedKey = sodium.crypto_generichash(32, DH4);

  // 8️⃣ Encrypt the file
  const aesKey = sodium.crypto_secretbox_keygen();
  const fileNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedFile = sodium.crypto_secretbox_easy(
    fileBuffer,
    fileNonce,
    aesKey
  );

  console.log("Encrypted file when sending: ", encryptedFile);

  // 9️⃣ Encrypt AES key with shared secret
  const keyNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const encryptedAesKey = sodium.crypto_secretbox_easy(
    aesKey,
    keyNonce,
    sharedKey
  );
  console.log("AES key is: ", aesKey);

  // 🔟 Metadata
  const metadata = {
    fileNonce: sodium.to_base64(fileNonce),
    keyNonce: sodium.to_base64(keyNonce),
    ikPublicKey: sodium.to_base64(userKeys.identity_public_key),
    spkPublicKey: sodium.to_base64(userKeys.signedpk_public_key),
    ekPublicKey: sodium.to_base64(EK.publicKey),
    opk_id: recipientKeys.opk.opk_id,
    encryptedAesKey: sodium.to_base64(encryptedAesKey),
    file: decrypted,
  };

  // 🔁 Send encrypted data
  const res = await fetch("http://localhost:5000/api/files/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fileid,
      userId,
      recipientUserId,
      encryptedFile: sodium.to_base64(encryptedFile, sodium.base64_variants.URLSAFE_NO_PADDING),
      encryptedAesKey: sodium.to_base64(encryptedAesKey),
      ekPublicKey: sodium.to_base64(EK.publicKey),
      metadata,
    }),
  });

  console.log("EncryptedAesKey is: ", encryptedAesKey);
  console.log("Key Nonce is: ", keyNonce);
  console.log("File Nonce is: ", fileNonce);
  console.log("Shared key is: ", sharedKey);

  if (!res.ok) throw new Error("Failed to send file");
}

export async function ReceiveFile(fileData) {
  const { userId, encryptionKey } = useEncryptionStore.getState();
  const sodium = await getSodium();

  // 🔐 Load and normalize user keys
  const rawKeys = await getUserKeysSecurely(encryptionKey);
  const userKeys = normalizeUserKeys(rawKeys, sodium);

  // 🎯 Extract metadata
  const {
    file_id,
    file_name,
    file_type,
    cid,
    metadata,
    sender_id,
  } = fileData;
  const { ikPublicKey, ekPublicKey, fileNonce, keyNonce, opk_id, encryptedAesKey, spkPublicKey, file } =
    JSON.parse(metadata);

  console.log("File id is: ", file_id);
  console.log("File name is: ", file_name);
  console.log("File Type is: ", file_type);
  console.log("metadata is: ", metadata);

  const path = `/files/${sender_id}/sent/${file_id}`;
  console.log("Path is: ", path);

  // 🧊 Download the encrypted file from ownCloud via backend
  const response = await fetch(
    "http://localhost:5000/api/files/downloadSentFile",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        filepath: path,
      }),
    }
  );

  if (!response.ok) throw new Error("Failed to retrieve encrypted file");

  const encryptedBuffer = await response.arrayBuffer()
  //const fromBase64File = sodium.from_base64()
  const encryptedFile = new Uint8Array(encryptedBuffer)
  // 🔐 Retrieve private keys
  const ikPrivKey = userKeys.identity_private_key;
  const spkPrivKey = userKeys.signedpk_private_key;
  const opkMatch = userKeys.oneTimepks_private.find(
    (opk) => opk.opk_id === opk_id
  );
  if (!opkMatch) throw new Error("Matching OPK not found");
  const opkPrivKey = opkMatch.private_key;

  const spkPrivKeyCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(spkPrivKey);
  const ikPrivKeyCurve = sodium.crypto_sign_ed25519_sk_to_curve25519(ikPrivKey);

  const senderIkCurve = ed25519PubToCurve(sodium.from_base64(ikPublicKey), sodium);
  const senderSpkCurve = ed25519PubToCurve(sodium.from_base64(spkPublicKey), sodium);

  //keys are:
  console.log("Spk private: ", spkPrivKey);
  console.log("ikPublickey is: ", sodium.from_base64(ikPublicKey));

  // 🔑 Derive shared secret using 4 DH operations
  const DH1 = sodium.crypto_scalarmult(
  spkPrivKeyCurve,
  senderIkCurve
);


  console.log("DH1 is: ",DH1);

  console.log("Ik private is: ", ikPrivKey);
  console.log("ekPublicKey is :", sodium.from_base64(ekPublicKey));
  const DH2 = sodium.crypto_scalarmult(
    ikPrivKeyCurve,
  sodium.from_base64(ekPublicKey),
);

  console.log("DH2 is: ",DH2);
  console.log("SpkPrivekey is: ", spkPrivKey);
  const DH3 = sodium.crypto_scalarmult(
    spkPrivKeyCurve,
  sodium.from_base64(ekPublicKey),
);

  console.log("DH3 is: ",DH3)
  const DH4 = sodium.crypto_scalarmult(
    opkPrivKey,
    sodium.from_base64(ekPublicKey)
  );

  console.log("DH4 is: ", DH4);
  console.log("Combined key is: ", concatUint8Arrays([DH1, DH2, DH3, DH4]))
  const sharedKey = sodium.crypto_generichash(32, DH4);

  console.log("EncryptedAES keys is: ", sodium.from_base64(encryptedAesKey));
  console.log("Key Nonce is: ", sodium.from_base64(keyNonce));
  console.log("Shared key is: ", sharedKey);
  // 🔓 Decrypt AES key
  const aesKey = sodium.crypto_secretbox_open_easy(
    sodium.from_base64(encryptedAesKey),
    sodium.from_base64(keyNonce),
    sharedKey
  );
  if (!aesKey) throw new Error("Failed to decrypt AES key");

  // 🔓 Decrypt actual file
  console.log("File nounce is: ", sodium.from_base64(fileNonce));
  console.log("AES key is: ", aesKey);
  console.log("Encrypted file (raw):", encryptedFile);
  console.log("Type of encryptedFile:", typeof encryptedFile);
  //console.log("Encrypted file after from base 64 :", sodium.from_base64(encryptedFile));
  // const decryptedFile = sodium.crypto_secretbox_open_easy(
  //   encryptedFile,
  //   sodium.from_base64(fileNonce),
  //   aesKey
  // );

  // console.log("Decrypted file is: ", decryptedFile);
  // if (!decryptedFile) throw new Error("Failed to decrypt file");

  // ✍ Upload to ownCloud as user's personal copy
  const fileBuffer = new Uint8Array(file);
  const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
  const ciphertext = sodium.crypto_secretbox_easy(
    fileBuffer,
    nonce,
    encryptionKey
  );

  const formData = {
    fileName: file_name,
    fileType: file_type,
    userId: userId,
    nonce: sodium.to_base64(nonce, sodium.base64_variants.ORIGINAL),
    fileDescription: "Received file",
    fileTags: ["received"],
    path: `files/${userId}`,
    fileContent: sodium.to_base64(ciphertext, sodium.base64_variants.ORIGINAL),
  };

  const uploadRes = await fetch("http://localhost:5000/api/files/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(formData),
  });

  if (!uploadRes.ok) throw new Error("Upload failed");

  const uploadResult = await uploadRes.json();
  console.log("Upload success:", uploadResult);

  // 📦 Return file blob for preview or download
  return new Blob([decryptedFile], { type: file_type });
}
