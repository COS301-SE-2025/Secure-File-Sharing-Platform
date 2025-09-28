const crypto = require('crypto');
const bip39 = require('bip39');
const argon2 = require('argon2');


class MnemonicCrypto {
  /**
   * @param {string[]} mnemonicWords
   * @returns {Buffer}
   */
  static deriveKeyFromMnemonic(mnemonicWords) {
    if (!Array.isArray(mnemonicWords) || mnemonicWords.length !== 10) {
      throw new Error('Invalid mnemonic: must be exactly 10 words');
    }

    for (const word of mnemonicWords) {
      if (!word || typeof word !== 'string' || word.trim().length === 0) {
        throw new Error('Invalid mnemonic: all words must be non-empty strings');
      }
    }

    const mnemonicPhrase = mnemonicWords.join(' ');
    const salt = 'sfsp-mnemonic-salt';
    return crypto.pbkdf2Sync(mnemonicPhrase, salt, 100000, 32, 'sha256');
  }

  /**
   * Encrypt plaintext using AES-256-CBC
   * @param {string} plaintext 
   * @param {Buffer} key
   * @returns {string}
   */
  static encrypt(plaintext, key) {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);

    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    return `${iv.toString('base64')}:${encrypted}`;
  }

  /**
   * Decrypt ciphertext using AES-256-CBC
   * @param {string} encryptedData
   * @param {Buffer} key
   * @returns {string}
   */
  static decrypt(encryptedData, key) {
    try {
      const parts = encryptedData.split(':');
      if (parts.length !== 2) {
        throw new Error('Invalid encrypted data format');
      }

      const iv = Buffer.from(parts[0], 'base64');
      const encrypted = parts[1];

      const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);

      let decrypted = decipher.update(encrypted, 'base64', 'utf8');
      decrypted += decipher.final('utf8');

      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed: ' + error.message);
    }
  }

  /**
   * @returns {string[]}
   */
  static generateMnemonic() {
    const wordlist = bip39.wordlists.english;

    const mnemonic = [];
    for (let i = 0; i < 10; i++) {
      const randomIndex = crypto.randomInt(0, wordlist.length);
      mnemonic.push(wordlist[randomIndex]);
    }

    return mnemonic;
  }

  /**
   * Validate that a password matches its hash using Argon2id
   * @param {string} password
   * @param {string} hash
   * @returns {boolean}
   */
  static async validatePassword(password, hash) {
    try {
      return await argon2.verify(hash, password);
    } catch (error) {
      return false;
    }
  }

  /**
   * Hash password using Argon2id
   * @param {string} password
   * @returns {string}
   */
  static async hashPassword(password) {
    return await argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 2 ** 16,
      timeCost: 3,
      parallelism: 1,
      hashLength: 32,
    });
  }
}

module.exports = MnemonicCrypto;