'use client';
import Image from 'next/image';
import Typewriter from './Typewriter';
import HomeRotator from './home_features';
import Footer from './Footer/footer';
import Link from 'next/link';
import AnimatedIcon from './AnimatedIcon';
import { useState } from 'react';
import { ShieldCheckIcon, ShieldExclamationIcon, EyeIcon, LinkIcon, ArrowUpOnSquareIcon, LockClosedIcon, DevicePhoneMobileIcon, UserGroupIcon, RocketLaunchIcon, } from '@heroicons/react/24/solid';

export default function Home() {
  const [activeDiagram, setActiveDiagram] = useState('fileTransfer');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isFPModalOpen, setIsFPModalOpen] = useState(false);

  return (
    <div className="grid grid-rows-[auto_1fr_auto] min-h-screen font-sans text-gray-800 dark:text-white dark:bg-gray-900">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 w-full z-50 px-8 py-4 flex justify-between items-center bg-neutral-200/95 backdrop-blur-sm shadow-md dark:bg-gray-800/95 transition-all duration-300">
        <div className="flex items-center gap-3 animate-fade-in-left">
          {/* Light mode logo */}
          <Image
            src="/img/shield-emp-black.png"
            alt="SecureShare Logo Light"
            width={28}
            height={28}
            className="block dark:hidden transition-transform duration-300 hover:scale-110"
          />
          {/* Dark mode logo */}
          <Image
            src="/img/shield-emp-white.png"
            alt="SecureShare Logo Dark"
            width={28}
            height={28}
            className="hidden dark:block transition-transform duration-300 hover:scale-110"
          />
          <Link href="/">
            <span className="text-xl font-bold tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-300">
              SecureShare
            </span>
          </Link>
        </div>

        <ul className="flex gap-6 text-sm sm:text-base animate-fade-in-up">
          <li>
            <a href="#main" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 underline-offset-4">
              Home
            </a>
          </li>
          <li>
            <a href="#features" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 underline-offset-4">
              Features
            </a>
          </li>
          <li>
            <a href="#how-it-works" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 underline-offset-4">
              How It Works
            </a>
          </li>
          <li>
            <a href="#why-choose" className="hover:underline hover:text-blue-600 dark:hover:text-blue-400 transition-all duration-300 underline-offset-4">
              Why Choose Us
            </a>
          </li>
        </ul>

        <a
          href="/auth"
          className="relative overflow-hidden bg-blue-600 text-white px-4 py-2 rounded-full text-sm font-medium transition-all duration-300 hover:shadow-lg hover:scale-105 animate-fade-in-right group"
        >
          <span className="relative z-10">Log In</span>
          <div className="absolute inset-0 bg-blue-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
        </a>
      </nav>

      {/*Main Content */}
      <section id="main" className="min-h-[calc(100vh-64px)] pt-24 px-8 py-12 sm:px-20 flex flex-col sm:flex-row items-center justify-between gap-12 text-left">
        <div className="flex-1 max-w-xl space-y-6 animate-fade-in-left">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-4 py-2 rounded-full text-sm font-medium animate-slide-in-bottom">
            <AnimatedIcon
              icon={ShieldCheckIcon}
              alt="SecureShare Icon"
              width={20}
              height={20}
              animationType="bounce"
              colorClass="text-blue-600 dark:text-blue-400"
            />
            Privacy-First File Sharing Platform
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight animate-slide-in-bottom">
            Secure File Sharing with <span className="text-blue-600 dark:text-blue-400 animate-gradient-text">End-to-End Encryption</span>
          </h1>

          <p className="text-lg text-gray-600 dark:text-gray-300 animate-slide-in-bottom animation-delay-200">
            Share files with absolute confidence. SecureShare ensures only you and your intended recipient can access your content through military-grade encryption. No backdoors, no third-party access—ever.
          </p>

          <div className="flex flex-wrap gap-4 animate-slide-in-bottom animation-delay-300">
            <div className="flex items-center gap-2 text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
              <AnimatedIcon
                icon={ShieldCheckIcon}
                alt="Zero-Knowledge Icon"
                width={16}
                height={16}
                animationType="pulse"
                colorClass="text-green-500 dark:text-green-400"
              />
              Zero-Knowledge Architecture
            </div>
            <div className="flex items-center gap-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full">
              <AnimatedIcon
                icon={LockClosedIcon}
                alt="AES-256 Icon"
                width={16}
                height={16}
                animationType="pulse"
                colorClass="text-purple-500 dark:text-purple-400"
              />
              AES-256 Encryption
            </div>
            <div className="flex items-center gap-2 text-sm bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full">
              <AnimatedIcon
                icon={LinkIcon}
                alt="Self-Destructing Links Icon"
                width={16}
                height={16}
                animationType="pulse"
                colorClass="text-orange-500 dark:text-orange-400"
              />
              Self-Destructing Links
            </div>
          </div>

          <div className="flex gap-4 animate-slide-in-bottom animation-delay-400">
            <a
              href="/auth"
              className="relative overflow-hidden bg-blue-600 text-white px-6 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:scale-105 group"
            >
              <span className="relative z-10">Start Sharing Securely</span>
              <div className="absolute inset-0 bg-blue-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            </a>
            <a
              href="#how-it-works"
              className="border-2 border-blue-600 text-blue-600 dark:text-blue-400 px-6 py-3 rounded-full font-medium transition-all duration-300 hover:bg-blue-600 hover:text-white hover:scale-105"
            >
              See How It Works
            </a>
          </div>
        </div>

        <div className="flex-1 flex justify-center animate-fade-in-right">
          <Image
            src="/img/cloud-computing-security-abstract-concept-illustration.png"
            alt="Secure File Sharing Illustration"
            width={700}
            height={500}
            className="max-w-full h-auto transition-transform duration-500 hover:scale-105 animate-float"
          />
        </div>
      </section>

      {/* Problem statement & solution */}
      <section className="py-16 px-8 sm:px-20 bg-gray-50 dark:bg-gray-800 animate-fade-in-up">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white animate-slide-in-bottom">
            The Problem with Traditional File Sharing
          </h2>
          <div className="grid md:grid-cols-3 gap-8 mt-12">
            <div className="bg-red-50 dark:bg-red-900/20 p-6 rounded-lg animate-slide-in-bottom animation-delay-200">
              <AnimatedIcon
                icon={ShieldExclamationIcon}
                alt="Warning Icon"
                width={32}
                height={32}
                className="mb-4"
                animationType="rotate"
                colorClass="text-red-600 dark:text-red-400"
              />
              <h3 className="font-semibold text-red-800 dark:text-red-300 mb-2">Data Breaches</h3>
              <p className="text-sm text-red-600 dark:text-red-400">Cloud providers can access your files, creating vulnerability to breaches and unauthorized access.</p>
            </div>
            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-6 rounded-lg animate-slide-in-bottom animation-delay-300">
              <AnimatedIcon
                icon={EyeIcon}
                alt="Privacy Icon"
                width={32}
                height={32}
                className="mb-4"
                animationType="rotate"
                colorClass="text-yellow-600 dark:text-yellow-400"
              />
              <h3 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">Privacy Concerns</h3>
              <p className="text-sm text-yellow-600 dark:text-yellow-400">Your sensitive documents may be scanned, analyzed, or used for advertising purposes.</p>
            </div>
            <div className="bg-orange-50 dark:bg-orange-900/20 p-6 rounded-lg animate-slide-in-bottom animation-delay-400">
              <AnimatedIcon
                icon={LinkIcon}
                alt="Link Icon"
                width={32}
                height={32}
                className="mb-4"
                animationType="rotate"
                colorClass="text-orange-600 dark:text-orange-400"
              />
              <h3 className="font-semibold text-orange-800 dark:text-orange-300 mb-2">Permanent Exposure</h3>
              <p className="text-sm text-orange-600 dark:text-orange-400">Once shared, files remain accessible indefinitely, even after you no longer want them shared.</p>
            </div>
          </div>
        </div>
      </section>

      {/* how it works section */}
      <section id="how-it-works" className="py-16 px-8 sm:px-20 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 animate-slide-in-bottom">
            How <span className="text-blue-600 dark:text-blue-400">SecureShare</span> Works
          </h2>
          <div className="grid md:grid-cols-4 gap-8">
            <div className="text-center animate-slide-in-bottom animation-delay-200">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AnimatedIcon
                  icon={ArrowUpOnSquareIcon}
                  alt="Upload Icon"
                  width={32}
                  height={32}
                  animationType="bounce"
                  colorClass="text-blue-600 dark:text-blue-400"
                />
              </div>
              <h3 className="font-semibold mb-2">1. Upload File</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Select and upload your file through our secure interface</p>
            </div>
            <div className="text-center animate-slide-in-bottom animation-delay-300">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AnimatedIcon
                  icon={LockClosedIcon}
                  alt="Encrypt Icon"
                  width={32}
                  height={32}
                  animationType="bounce"
                  colorClass="text-green-600 dark:text-green-400"
                />
              </div>
              <h3 className="font-semibold mb-2">2. Auto-Encrypt</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Your file is encrypted client-side before leaving your device</p>
            </div>
            <div className="text-center animate-slide-in-bottom animation-delay-400">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AnimatedIcon
                  icon={LinkIcon}
                  alt="Share Link Icon"
                  width={32}
                  height={32}
                  animationType="bounce"
                  colorClass="text-purple-600 dark:text-purple-400"
                />
              </div>
              <h3 className="font-semibold mb-2">3. Share Files</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Securely share your files with recipient</p>
            </div>
            <div className="text-center animate-slide-in-bottom animation-delay-500">
              <div className="w-16 h-16 bg-orange-100 dark:bg-orange-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <AnimatedIcon
                  icon={DevicePhoneMobileIcon}
                  alt="Access Icon"
                  width={32}
                  height={32}
                  animationType="bounce"
                  colorClass="text-orange-600 dark:text-orange-400"
                />
              </div>
              <h3 className="font-semibold mb-2">4. Secure Access</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Recipient downloads and decrypts the file securely</p>
            </div>
          </div>
        </div>
      </section>

      {/* features */}
      <section id="features" className="grid grid-rows-[auto_1fr_auto] font-sans text-gray-800 bg-gray-300 dark:text-white dark:bg-gray-300 animate-fade-in-up">
        <h2 className="text-2xl sm:text-3xl font-semibold text-center pt-8 text-gray-800 animate-slide-in-bottom">
          Why <span className="animate-gradient-text">SecureShare</span> is Your Best Choice for Privacy
        </h2>
        <div className="animate-fade-in-up animation-delay-300">
          <HomeRotator />
        </div>
      </section>

      {/* why choose US */}
      <section id="why-choose" className="py-16 px-8 sm:px-20 bg-gray-50 dark:bg-gray-800">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-12 animate-slide-in-bottom">
            Why Choose <span className="text-blue-600 dark:text-blue-400">SecureShare</span>?
          </h2>
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6 animate-fade-in-left">
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <AnimatedIcon
                    icon={UserGroupIcon}
                    alt="Target Icon"
                    width={20}
                    height={20}
                    animationType="rotate"
                    colorClass="text-blue-600 dark:text-blue-400"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Built for Everyone</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Whether you&apos;re a business professional, healthcare worker, legal expert, or just privacy-conscious, SecureShare adapts to your needs.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <AnimatedIcon
                    icon={RocketLaunchIcon}
                    alt="Rocket Icon"
                    width={20}
                    height={20}
                    animationType="bounce"
                    colorClass="text-green-600 dark:text-green-400"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Simple Yet Powerful</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">Advanced security doesn&apos;t mean complexity. Our intuitive interface makes secure sharing as easy as a few clicks.</p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                  <AnimatedIcon
                    icon={LockClosedIcon}
                    alt="Lock Icon"
                    width={20}
                    height={20}
                    animationType="pulse"
                    colorClass="text-purple-600 dark:text-purple-400"
                  />
                </div>
                <div>
                  <h3 className="font-semibold mb-2">Zero-Trust Architecture</h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm">We can&apos;t access your files even if we wanted to. Your encryption keys never leave your device.</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 p-8 rounded-lg animate-fade-in-right">
              <h3 className="text-xl font-semibold mb-4">Perfect For:</h3>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-3">
                  <AnimatedIcon
                    icon={ShieldCheckIcon}
                    alt="Legal Icon"
                    width={12}
                    height={12}
                    animationType="pulse"
                    colorClass="text-blue-500 dark:text-blue-400"
                  />
                  Legal documents and contracts
                </li>
                <li className="flex items-center gap-3">
                  <AnimatedIcon
                    icon={ShieldCheckIcon}
                    alt="Medical Icon"
                    width={12}
                    height={12}
                    animationType="pulse"
                    colorClass="text-green-500 dark:text-green-400"
                  />
                  Medical records and patient data
                </li>
                <li className="flex items-center gap-3">
                  <AnimatedIcon
                    icon={ShieldCheckIcon}
                    alt="Financial Icon"
                    width={12}
                    height={12}
                    animationType="pulse"
                    colorClass="text-purple-500 dark:text-purple-400"
                  />
                  Financial reports and sensitive business data
                </li>
                <li className="flex items-center gap-3">
                  <AnimatedIcon
                    icon={ShieldCheckIcon}
                    alt="Personal Icon"
                    width={12}
                    height={12}
                    animationType="pulse"
                    colorClass="text-orange-500 dark:text-orange-400"
                  />
                  Personal photos and private documents
                </li>
                <li className="flex items-center gap-3">
                  <AnimatedIcon
                    icon={ShieldCheckIcon}
                    alt="Research Icon"
                    width={12}
                    height={12}
                    animationType="pulse"
                    colorClass="text-red-500 dark:text-red-400"
                  />
                  Research data and intellectual property
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Security */}
      <section id="security" className="py-16 px-8 sm:px-20 bg-white dark:bg-gray-900 animate-fade-in-up">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold animate-slide-in-bottom">
              Our <span className="text-blue-600 dark:text-blue-400">Security</span> Architecture
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mt-4 max-w-2xl mx-auto">
              SecureShare employs multiple layers of protection to ensure your files remain private and secure
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12 items-center mb-12">
            <div className="space-y-6 animate-fade-in-left">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <LockClosedIcon className="w-6 h-6 text-blue-600" />
                File Encryption Flow
              </h3>

              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
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

              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Files are encrypted client-side using AES-256 before being uploaded to our servers, ensuring true end-to-end encryption.
              </p>
            </div>

            <div className="space-y-6 animate-fade-in-right">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                Security Features
              </h3>

              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <LockClosedIcon className="w-3 h-3 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Client-Side Encryption</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Files are encrypted on your device before upload</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <LinkIcon className="w-3 h-3 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Self-Destructing Links</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Links automatically expire after download or time limit</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <ShieldExclamationIcon className="w-3 h-3 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white">Zero-Knowledge Architecture</h4>
                    <p className="text-sm text-gray-600 dark:text-gray-400">We never have access to your encryption keys or file contents</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Diagrams Carousel Section */}
          <div className="mt-16 animate-fade-in-up">
            <div className="text-center mb-8">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Security Flow Diagrams
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Interactive diagrams showing our security processes
              </p>
            </div>

            {/* Carousel Navigation */}
            <div className="flex justify-center mb-6">
              <div className="flex space-x-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setActiveDiagram('fileTransfer')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${activeDiagram === 'fileTransfer'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  File Transfer Flow
                </button>
                <button
                  onClick={() => setActiveDiagram('passwordReset')}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-all duration-300 ${activeDiagram === 'passwordReset'
                    ? 'bg-blue-600 text-white shadow-md'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                    }`}
                >
                  Password Reset Flow
                </button>
              </div>
            </div>

            {/* Carousel Content */}
            <div className="relative">
              {/* File Transfer Flow */}
              <div
                className={`transition-all duration-500 ease-in-out ${activeDiagram === 'fileTransfer'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 absolute translate-y-4 pointer-events-none'
                  }`}
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                      <span className="text-xl">🔄</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      File Transfer Flow
                    </h4>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-200 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                    <div className="flex justify-center">
                      <Image
                        src="/img/File-trans.svg"
                        alt="File Transfer Flow Diagram"
                        width={600}
                        height={400}
                        className="w-full max-w-2xl h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setIsModalOpen(true)}
                      />
                    </div>
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setIsModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <span>View Full Size</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
                    Secure file transfer process showing end-to-end encryption and verification steps
                  </p>
                </div>
              </div>

              {/* Password Reset Flow */}
              <div
                className={`transition-all duration-500 ease-in-out ${activeDiagram === 'passwordReset'
                  ? 'opacity-100 translate-y-0'
                  : 'opacity-0 absolute translate-y-4 pointer-events-none'
                  }`}
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                      <span className="text-xl">🗝️</span>
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Password Reset Flow
                    </h4>
                  </div>

                  <div className="bg-gray-100 dark:bg-gray-200 rounded-lg p-4 border border-gray-300 dark:border-gray-600">
                    <div className="flex justify-center">
                      <Image
                        src="/img/forget-pass.svg"
                        alt="Password Reset Flow Diagram"
                        width={600}
                        height={400}
                        className="w-full max-w-2xl h-auto rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setIsFPModalOpen(true)}
                      />
                    </div>
                    <div className="text-center mt-4">
                      <button
                        onClick={() => setIsFPModalOpen(true)}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                      >
                        <span>View Full Size</span>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <p className="text-gray-600 dark:text-gray-400 text-sm mt-4">
                    Secure password reset process with email verification and security checks
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Security Reference Link */}
          <div className="text-center mt-12 animate-fade-in-up">
            <Link
              href="/Support/Security"
              className="inline-flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors duration-300 group"
            >
              <span>Learn more about our security implementation</span>
              <svg
                className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </section>

      {/* Login */}
      <div className="text-center py-20 text-gray-800 bg-gray-300 dark:text-white dark:bg-gray-300 animate-slide-in-bottom">
        <div className="flex flex-col items-center gap-6">
          <h3 className="text-3xl font-semibold inline-flex items-center text-gray-800">
            <Typewriter text="Get Sharing" speed={100} loop={true} cursor={true} />
          </h3>
          <a
            href="/auth"
            className="relative overflow-hidden inline-block bg-blue-600 text-white  px-10 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:scale-105 animate-slide-in-bottom animation-delay-200 group"
          >
            <span className="relative z-10">Log In</span>
            <div className="absolute inset-0 bg-blue-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <Footer />
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

      {/* animations */}
      <style jsx>{`
        @keyframes fadeInLeft {
          from {
            opacity: 0;
            transform: translateX(-30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInRight {
          from {
            opacity: 0;
            transform: translateX(30px);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes slideInBottom {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        @keyframes float {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-10px);
          }
        }
        @keyframes gradientText {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-fade-in-left {
          animation: fadeInLeft 0.8s ease-out;
        }
        .animate-fade-in-right {
          animation: fadeInRight 0.8s ease-out;
        }
        .animate-fade-in-up {
          animation: fadeInUp 0.8s ease-out;
        }
        .animate-slide-in-bottom {
          animation: slideInBottom 0.6s ease-out;
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .animate-gradient-text {
          background: linear-gradient(-45deg, #3b82f6, #1d4ed8, #2563eb, #1e40af);
          background-size: 400% 400%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: gradientText 3s ease infinite;
        }
        .animation-delay-200 {
          animation-delay: 0.2s;
          animation-fill-mode: both;
        }
        .animation-delay-300 {
          animation-delay: 0.3s;
          animation-fill-mode: both;
        }
        .animation-delay-400 {
          animation-delay: 0.4s;
          animation-fill-mode: both;
        }
        .animation-delay-500 {
          animation-delay: 0.5s;
          animation-fill-mode: both;
        }
      `}</style>
    </div>
  );
}