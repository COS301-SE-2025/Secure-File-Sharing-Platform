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
      id: 'rsa',
      name: 'RSA Encryption',
      icon: '🔒',
      front: {
        title: 'RSA Encryption',
        description: 'Asymmetric cryptography for secure data transmission'
      },
      back: {
        usage: 'Used for secure data transmission, digital signatures, SSL/TLS certificates',
        explanation: 'RSA uses a public key for encryption and a private key for decryption. It relies on the practical difficulty of factoring the product of two large prime numbers.',
        strengths: ['Secure key exchange', 'Digital signatures', 'Widely adopted']
      }
    },
    {
      id: 'diffie-hellman',
      name: 'Diffie-Hellman Key Exchange',
      icon: '🔄',
      front: {
        title: 'DH Key Exchange',
        description: 'Secure method for exchanging cryptographic keys'
      },
      back: {
        usage: 'Used in SSL/TLS, VPNs, SSH for establishing shared secrets over insecure channels',
        explanation: 'Allows two parties to establish a shared secret over an insecure channel without prior communication. The security relies on the discrete logarithm problem.',
        strengths: ['Perfect forward secrecy', 'Secure key establishment', 'No pre-shared keys needed']
      }
    },
    {
      id: 'bcrypt',
      name: 'Bcrypt Hashing',
      icon: '🔑',
      front: {
        title: 'Bcrypt Hashing',
        description: 'Password hashing function designed for security'
      },
      back: {
        usage: 'Used for password storage, user authentication systems',
        explanation: 'Bcrypt is an adaptive hash function based on the Blowfish cipher. It incorporates a salt and is intentionally slow to protect against brute-force attacks.',
        strengths: ['Built-in salt', 'Adaptive to hardware improvements', 'Resistant to brute-force']
      }
    },
    {
      id: 'aes',
      name: 'AES Encryption',
      icon: '🛡️',
      front: {
        title: 'AES Encryption',
        description: 'Symmetric encryption standard'
      },
      back: {
        usage: 'Used in SSL/TLS, VPNs, disk encryption, file encryption, wireless security',
        explanation: 'Advanced Encryption Standard is a symmetric-key algorithm that uses the same key for encryption and decryption. It operates on fixed block sizes and supports key sizes of 128, 192, and 256 bits.',
        strengths: ['Fast and efficient', 'Highly secure', 'Hardware accelerated']
      }
    }
  ];

  return (
    <div className="p-6 bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white min-h-screen">
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
                  className={`absolute inset-0 w-full h-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 border-2 border-blue-200 dark:border-blue-800 transition-opacity duration-300 ${
                    flippedCards[method.id] ? 'opacity-0' : 'opacity-100'
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
                  className={`absolute inset-0 w-full h-full bg-gradient-to-br from-blue-50 to-gray-100 dark:from-gray-800 dark:to-gray-700 rounded-lg shadow-lg p-6 border-2 border-blue-300 dark:border-blue-600 transition-opacity duration-300 overflow-y-auto ${
                    flippedCards[method.id] ? 'opacity-100' : 'opacity-0'
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
        <div className="mt-12 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-4">
            Security Best Practices
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Use strong, unique passwords</strong> and store them securely using hashing algorithms like bcrypt
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Implement HTTPS</strong> using TLS with RSA or ECDHE for key exchange
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Use AES-256</strong> for encrypting sensitive data at rest
                </p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Regularly update</strong> encryption libraries and dependencies
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Implement proper key management</strong> and rotation policies
                </p>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0"></div>
                <p className="text-gray-700 dark:text-gray-300">
                  <strong>Use authenticated encryption</strong> to ensure data integrity
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