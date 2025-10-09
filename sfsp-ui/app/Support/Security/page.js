"use client";

import { useState } from 'react';

const SecurityPage = ({ onNavigate }) => {
  const [flippedCards, setFlippedCards] = useState({});

  const toggleFlip = (id) => {
    setFlippedCards(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleBack = () => {
    if (onNavigate) {
      onNavigate('/');
    } else {
      window.history.back();
    }
  };

  const encryptionMethods = [
    {
      id: 'aes-256',
      name: 'AES-256-CBC',
      icon: '🛡️',
      front: {
        title: 'AES-256-CBC',
        description: 'Symmetric file encryption standard'
      },
      back: {
        usage: 'Used for encrypting files at rest and during transmission, mnemonic-based recovery encryption',
        explanation: 'Advanced Encryption Standard with 256-bit keys in CBC mode. Our platform uses it for encrypting user files before storage and for securing recovery keys with PBKDF2-derived keys from mnemonics.',
        strengths: ['256-bit key length', 'Fast encryption/decryption', 'Industry standard', 'Hardware accelerated']
      }
    },
    {
      id: 'x3dh',
      name: 'X3DH Key Agreement',
      icon: '🔄',
      front: {
        title: 'X3DH Protocol',
        description: 'Extended Triple Diffie-Hellman key exchange'
      },
      back: {
        usage: 'Used for secure file sharing between users, establishing shared secrets without prior communication',
        explanation: 'X3DH combines identity keys, signed prekeys, one-time prekeys, and ephemeral keys to create a shared secret. Enables end-to-end encrypted file sharing with forward secrecy and deniability.',
        strengths: ['Perfect forward secrecy', 'Asynchronous messaging', 'Deniable authentication', 'Multiple DH exchanges']
      }
    },
    {
      id: 'ed25519',
      name: 'Ed25519 Signatures',
      icon: '✍️',
      front: {
        title: 'Ed25519',
        description: 'Digital signature algorithm for authentication'
      },
      back: {
        usage: 'Used for identity keys, signed prekeys, file integrity verification, and authentication',
        explanation: 'EdDSA signature scheme using Curve25519. Provides fast, secure digital signatures for verifying file authenticity and sender identity with small signature sizes.',
        strengths: ['Fast signature generation', 'Small key and signature sizes', 'Deterministic', 'Side-channel resistant']
      }
    },
    {
      id: 'curve25519',
      name: 'Curve25519 ECDH',
      icon: '🔐',
      front: {
        title: 'Curve25519',
        description: 'Elliptic curve for key exchange'
      },
      back: {
        usage: 'Used in X3DH protocol for Diffie-Hellman exchanges, ephemeral key generation',
        explanation: 'High-performance elliptic curve for Diffie-Hellman key exchange. Converted from Ed25519 keys for use in X3DH protocol to establish shared secrets between users.',
        strengths: ['High security margin', 'Fast computation', 'Constant-time operations', 'Widely audited']
      }
    },
    {
      id: 'bcrypt',
      name: 'Bcrypt',
      icon: '🔒',
      front: {
        title: 'Bcrypt',
        description: 'Adaptive password hashing'
      },
      back: {
        usage: 'Used for frontend password hashing in user authentication',
        explanation: 'Bcrypt is an adaptive hash function based on the Blowfish cipher. It incorporates a salt and is intentionally slow to protect against brute-force attacks.',
        strengths: ['Built-in salt', 'Adaptive cost factor', 'Resistant to brute-force', 'Battle-tested']
      }
    },
    {
      id: 'xsalsa20-poly1305',
      name: 'XSalsa20-Poly1305',
      icon: '🚀',
      front: {
        title: 'XSalsa20-Poly1305',
        description: 'Authenticated encryption cipher'
      },
      back: {
        usage: 'Used via libsodium crypto_secretbox for encrypting files and keys with authentication',
        explanation: 'Combines XSalsa20 stream cipher with Poly1305 MAC for authenticated encryption. Provides both confidentiality and integrity verification in a single operation.',
        strengths: ['Fast performance', 'Authenticated encryption', 'Large nonce space', 'Simple API']
      }
    },
    {
      id: 'blake2b',
      name: 'BLAKE2b',
      icon: '⚡',
      front: {
        title: 'BLAKE2b',
        description: 'Fast cryptographic hash function'
      },
      back: {
        usage: 'Used via libsodium crypto_generichash for file integrity checks and key derivation in X3DH',
        explanation: 'Cryptographic hash function faster than MD5, SHA-1, SHA-2, and SHA-3, yet as secure as SHA-3. Used for hashing combined DH outputs and verifying file integrity.',
        strengths: ['Extremely fast', 'Secure as SHA-3', 'Keyed hashing support', 'Variable output length']
      }
    },
    {
      id: 'jwt',
      name: 'JWT (HS256)',
      icon: '🎫',
      front: {
        title: 'JSON Web Tokens',
        description: 'Secure authentication tokens'
      },
      back: {
        usage: 'Used for user authentication, session management, and API authorization',
        explanation: 'JWTs with HMAC-SHA256 signatures provide stateless authentication. Tokens contain user identity and are verified on each API request without database lookups.',
        strengths: ['Stateless authentication', 'Signed tokens', 'Standard format', 'Easy to verify']
      }
    },
    {
      id: 'tls',
      name: 'TLS/HTTPS',
      icon: '🌐',
      front: {
        title: 'Transport Layer Security',
        description: 'Secure network communication'
      },
      back: {
        usage: 'Used for all client-server communications, API calls, and file transfers',
        explanation: 'TLS encrypts all data in transit between users and servers. Ensures that encrypted files remain protected even during upload/download over the network.',
        strengths: ['Industry standard', 'End-to-end encryption', 'Certificate validation', 'Forward secrecy']
      }
    },
    {
      id: '256-bit-keys',
      name: '256-bit Key Length',
      icon: '🔑',
      front: {
        title: '256-bit Keys',
        description: 'High-security encryption standard'
      },
      back: {
        usage: 'Used across AES, X3DH, Ed25519, Curve25519, and bcrypt for strong security',
        explanation: '256-bit keys provide a high level of security against brute-force attacks. Our platform consistently uses 256-bit keys to ensure robust protection of user data.',
        strengths: ['High security margin', 'Resistant to brute-force', 'Industry recommended', 'Future-proof']
      }
    }
  ];

  return (
    <div className="p-6 bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>

          </button>
          <div>
            <h1 className="text-3xl font-bold text-blue-500">Security & Encryption</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Learn about the encryption methods that keep your data secure
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
          {encryptionMethods.map((method) => (
            <div
              key={method.id}
              className="relative h-80 cursor-pointer"
              style={{ perspective: '1000px' }}
              onClick={() => toggleFlip(method.id)}
            >
              {/* Flip Card Container */}
              <div
                className={`relative w-full h-full transition-transform duration-600 ease-in-out`}
                style={{
                  transformStyle: 'preserve-3d',
                  transform: flippedCards[method.id] ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front of Card */}
                <div
                  className={`absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800 transition-opacity duration-300 ${flippedCards[method.id] ? 'opacity-0' : 'opacity-100'
                    }`}
                  style={{ backfaceVisibility: 'hidden' }}
                >
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="text-4xl mb-4">{method.icon}</div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                      {method.front.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      {method.front.description}
                    </p>
                    <div className="mt-6 text-sm text-blue-500 dark:text-blue-400">
                      Click to learn more
                    </div>
                  </div>
                </div>

                {/* Back of Card */}
                <div
                  className={`absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-lg p-6 border-2 border-blue-300 dark:border-blue-600 transition-opacity duration-300 overflow-y-auto ${flippedCards[method.id] ? 'opacity-100' : 'opacity-0'
                    }`}
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  <div className="h-full">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="text-2xl">{method.icon}</div>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                        {method.name}
                      </h3>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div>
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          Where it&apos;s used:
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {method.back.usage}
                        </p>
                      </div>

                      <div>
                        <h4 className="font-semibold text-blue-600 dark:text-blue-400 mb-1">
                          How it works:
                        </h4>
                        <p className="text-gray-700 dark:text-gray-300">
                          {method.back.explanation}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 gap-3">
                        <div>
                          <h4 className="font-semibold text-green-600 dark:text-green-400 mb-1">
                            Strengths:
                          </h4>
                          <ul className="list-disc list-inside text-gray-700 dark:text-gray-300 space-y-1">
                            {method.back.strengths.map((strength, idx) => (
                              <li key={idx}>{strength}</li>
                            ))}
                          </ul>
                        </div>

                      </div>
                    </div>

                    <div className="mt-4 text-center text-xs text-blue-500 dark:text-blue-400">
                      Click to flip back
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Additional Security Information */}
        <div className="mt-12 bg-blue-100 dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Security Best Practices from You
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Save your recovery key securely</strong> - This is your only way to reset your password and access your files
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Use strong, unique passwords</strong> with a mix of letters, numbers, and special characters
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Never share your recovery key</strong> with anyone - we will never ask for it
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Be cautious with file sharing</strong> - only share with trusted individuals and set appropriate permissions
                </p>
              </div>
            </div>
          </div>
          <div className="mt-6 p-4 bg-blue-200 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Remember:</p>
                <p className="text-sm text-blue-800 dark:text-blue-200 mt-1">
                  Your files are protected with end-to-end encryption. We cannot access your data or reset your password without your recovery key.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityPage;