'use client';

import sodium from 'libsodium-wrappers-sumo';

export async function getSodium() {
  if (!sodium.ready) {
    await sodium.ready;
  }

  if (
    typeof sodium.crypto_pwhash_SALTBYTES === 'undefined' ||
    typeof sodium.crypto_secretbox_NONCEBYTES === 'undefined' ||
    typeof sodium.crypto_sign_keypair !== 'function'
  ) {
    throw new Error('Libsodium not fully initialized: constants undefined. Something went wrong during import.');
  }

  return sodium;
}