"use client";

import { useState } from 'react';
import Image from 'next/image';

const SecurityPage = ({ onNavigate }) => {
  const [flippedCards, setFlippedCards] = useState({});
  const [activeTab, setActiveTab] = useState('security')
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFPModalOpen, setIsFPModalOpen] = useState(false);

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

  const renderSecurityContent = () => (
    <>
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
    </>
  );

  const renderDiagramsContent = () => (
    <div className="space-y-8">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
          Security Architecture Diagrams
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Visual representations of our security protocols and data flow
        </p>
      </div>

      {/* File Encryption Flow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-300 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">📁</span>
          File Encryption Flow
        </h3>
        <div className="bg-gray-50 dark:bg-gray-200 dark:text-black rounded-lg p-6 border border-gray-300 dark:border-gray-700">
          <div className="flex flex-col md:flex-row items-center justify-between space-y-4 md:space-y-0">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">📄</span>
              </div>
              <p className="text-sm font-medium">Original File</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🔑</span>
              </div>
              <p className="text-sm font-medium">AES-256 Encryption</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">🛡️</span>
              </div>
              <p className="text-sm font-medium">Encrypted File</p>
            </div>
            <div className="text-2xl text-gray-400">→</div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-2">
                <span className="text-2xl">☁️</span>
              </div>
              <p className="text-sm font-medium">Secure Storage</p>
            </div>
          </div>
        </div>
        <p className="text-gray-600 dark:text-gray-400 mt-4 text-sm">
          Files are encrypted client-side using AES-256 before being uploaded to our servers, ensuring end-to-end encryption.
        </p>
      </div>

      {/* File Transfer Flow */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-300 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🔄</span>
          File Transfer Flow
        </h3>
        <div className="bg-gray-100 dark:bg-gray-200 rounded-lg p-6 border border-gray-300 dark:border-gray-700">
          <div className="flex justify-center">
            <Image
              src="/img/File-trans.svg"
              alt="File Transfer Flow Diagram"
              width={800}
              height={500}
              className="w-full max-w-4xl h-auto rounded-lg shadow-md cursor-pointer"
              onClick={() => setIsModalOpen(true)}
            />
          </div>
          <div className="text-center mt-4">
            <button
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>View Full Size</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>

      </div>

      {/* Forget Password */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border border-gray-300 dark:border-gray-700">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
          <span className="text-2xl">🗝️</span>
          Forget Password Flow
        </h3>
        <div className="bg-gray-100 dark:bg-gray-200 rounded-lg p-6 border border-gray-300 dark:border-gray-700">
          <div className="flex justify-center">
            <Image
              src="/img/forget-pass.svg"
              alt="File Transfer Flow Diagram"
              width={800}
              height={500}
              className="w-full max-w-4xl h-auto rounded-lg shadow-md cursor-pointer"
              onClick={() => setIsFPModalOpen(true)}
            />
          </div>
          <div className="text-center mt-4">
            <button
              onClick={() => setIsFPModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <span>View Full Size</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-6 bg-gray-200 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
      <div className="max-w-6xl mx-auto">
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
            Back
          </button>
          <div>
            <h1 className="text-3xl font-bold text-blue-500">Security</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Learn about our security architecture and encryption methods
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-8">
          <div className="border-b border-gray-300 dark:border-gray-700">
            <nav className="-mb-px flex space-x-8">
              <button
                onClick={() => setActiveTab('security')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'security'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                Security & Encryption
              </button>
              <button
                onClick={() => setActiveTab('diagrams')}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${activeTab === 'diagrams'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
              >
                Diagrams
              </button>
            </nav>
          </div>
        </div>

        {activeTab === 'security' ? renderSecurityContent() : renderDiagramsContent()}

        {isModalOpen && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setIsModalOpen(false)}
          >
            <div className="relative max-w-7xl max-h-full">
              <button
                className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300 z-10 bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
              <div className="bg-white rounded-lg overflow-hidden">
                <Image
                  src="/img/File-trans.svg"
                  alt="File Transfer Flow Diagram - Full Size"
                  width={1400}
                  height={1000}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
              <div className="text-center mt-2 text-white text-sm">
                Click anywhere to close
              </div>
            </div>
          </div>
        )}

        {isFPModalOpen && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setIsFPModalOpen(false)}
          >
            <div className="relative max-w-7xl max-h-full">
              <button
                className="absolute -top-12 right-0 text-white text-2xl hover:text-gray-300 z-10 bg-gray-800 rounded-full w-8 h-8 flex items-center justify-center"
                onClick={() => setIsFPModalOpen(false)}
              >
                ✕
              </button>
              <div className="bg-white rounded-lg overflow-hidden">
                <Image
                  src="/img/forget-pass.svg"
                  alt="File Transfer Flow Diagram - Full Size"
                  width={1400}
                  height={1000}
                  className="max-w-full max-h-[80vh] object-contain"
                />
              </div>
              <div className="text-center mt-2 text-white text-sm">
                Click anywhere to close
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SecurityPage;