'use client';
import Image from 'next/image';
import Typewriter from './Typewriter';
import HomeRotator from './home_features';
import Footer from './Footer/footer';
import Link from 'next/link';
import AnimatedIcon from './AnimatedIcon';
import {ShieldCheckIcon, ShieldExclamationIcon, EyeIcon, LinkIcon, ArrowUpOnSquareIcon, LockClosedIcon, DevicePhoneMobileIcon, UserGroupIcon, RocketLaunchIcon,} from '@heroicons/react/24/solid';

export default function Home() {
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
              <h3 className="font-semibold mb-2">3. Share Link</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Get a secure, time-limited link to share with your recipient</p>
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

      {/* Login */}
      <div className="text-center py-20 bg-gray-100 dark:bg-gray-900 animate-slide-in-bottom">
        <div className="flex flex-col items-center gap-6">
          <h3 className="text-3xl font-semibold inline-flex items-center">
            <Typewriter text="Get Sharing" speed={100} loop={true} cursor={true} />
          </h3>
          <a
            href="/auth"
            className="relative overflow-hidden inline-block bg-blue-600 text-white px-10 py-3 rounded-full font-medium transition-all duration-300 hover:shadow-xl hover:scale-105 animate-slide-in-bottom animation-delay-200 group"
          >
            <span className="relative z-10">Log In</span>
            <div className="absolute inset-0 bg-blue-800 transform translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
          </a>
        </div>
      </div>

      {/* Footer */}
      <Footer />

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