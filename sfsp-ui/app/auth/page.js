"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Loader from '@/app/dashboard/components/Loader';
import { getSodium } from "@/app/lib/sodium";
import { EyeClosed, Eye, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";
//import * as sodium from 'libsodium-wrappers-sumo';
import { generateLinearEasing } from "framer-motion";
import {
  useEncryptionStore,
  storeUserKeysSecurely,
  storeDerivedKeyEncrypted,
} from "../SecureKeyStorage";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
import {logout} from "../lib/auth";


export default function AuthPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Loading...");
  const [message, setMessage] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [toast, setToast] = useState({ message: "", type: "" });
  const [showRecoveryKeyModal, setShowRecoveryKeyModal] = useState(false);
  const [recoveryKey, setRecoveryKey] = useState("");

  useEffect(() => {
    logout(); 
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');

    if (error) {
      switch (error) {
        case 'oauth_error':
          setMessage('Google authentication was cancelled or failed. Please try again.');
          break;
        case 'oauth_cancelled':
          setMessage('Google authentication was cancelled.');
          break;
        case 'missing_code':
          setMessage('Google authentication failed. Missing authorization code.');
          break;
        case 'code_expired':
          setMessage('Authorization code has expired. Please try again.');
          break;
        case 'code_reused':
          setMessage('This authorization code has already been used. Please try again.');
          break;
        case 'invalid_state':
          setMessage('Invalid authentication state. Please try again.');
          break;
        case 'authentication_failed':
          setMessage('Failed to authenticate with our servers. Please try again.');
          break;
        case 'oauth_init_failed':
          setMessage('Failed to initiate Google authentication. Please check your internet connection.');
          break;
        default:
          setMessage('An error occurred during Google authentication. Please try again.');
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, '', newUrl);
    }

    // Clean up any pending Google auth state
    const authInProgress = localStorage.getItem('googleAuthInProgress');
    if (authInProgress) {
      localStorage.removeItem('googleAuthInProgress');
    }
  }, []);

  const showToast = (message, type = "error", duration = 3000) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: "" }), duration);
  };

  function handleChange(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (name === 'password' && setter === setSignupData) {
        checkPasswordRequirements(value);
      }

      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: '',
        }));
      }
    };
  }

  const checkPasswordRequirements = (password) => {
    setPasswordRequirements({
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*]/.test(password),
    });
  };

  const allPasswordRequirementsMet = Object.values(passwordRequirements).every(req => req);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoaderMessage("Signing you in...");
    setMessage(null);

    try {
      const sodium = await getSodium();
      const loginUrl = getApiUrl('/users/login');

      const res = await fetch(loginUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Invalid login credentials");
      }

      //New E2EE stuff
      const {
        id,
        salt,
        nonce,
        is_verified,
        //private keys
        //public keys
        ik_public,
        spk_public,
        signedPrekeySignature,
        opks_public,
      } = result.data.user;

      const { ik_private_key, opks_private, spk_private_key } = result.data.keyBundle;
      const { token } = result.data;

      // Always send verification code for login security
      setLoaderMessage("Sending verification code...");

      // Store login data temporarily for verification
      sessionStorage.setItem("pendingLogin", JSON.stringify({
        email: loginData.email,
        password: loginData.password,
        userId: id
      }));

      // Send verification code before redirecting
      try {
        const sendCodeResponse = await fetch(`/api/auth/send-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginData.email,
            userId: id,
            userName: result.data.user.username || "User",
            type: "login_verify"
          }),
        });

        if (!sendCodeResponse.ok) {
          const errorData = await sendCodeResponse.json();
          console.error("Failed to send verification code:", errorData);
          setMessage("Failed to send verification code. Please try again.");
          showToast("Failed to send verification code. Please try again.", "error");
          setIsLoading(false);
          return;
        }

        setLoaderMessage("Verification code sent! Redirecting...");
        setTimeout(() => {
          const redirectParam = searchParams.get('redirect');
          const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(loginData.email)}&userId=${id}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`;
          router.push(verifyUrl);
        }, 1500);

      } catch (error) {
        console.error("Error sending verification code:", error);
        setMessage("Failed to send verification code. Please try again.");
        showToast("Failed to send verification code. Please try again.", "error");
        setIsLoading(false);
        return;
      }

      // Store login data temporarily for verification completion
      // The verification page will handle the final authentication setup

    } catch (err) {
      console.error("Login error:", err);
      // setMessage(
      //   err.message || "An unexpected error occurred. Please try again."
      // );
      showToast(err.message || "An unexpected error occurred. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = signupData;
    setIsLoading(true);
    setLoaderMessage("Creating your SecureShare account...");
    setMessage(null);

    setFieldErrors({});

    let errors = {};

    if (!name) {
      errors.name = "Name is required.";
    }

    if (!email) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!allPasswordRequirementsMet) {
      errors.password = "Please meet all password requirements.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Please confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setIsLoading(false);
      return;
    }

    try {
      const sodium = await getSodium();
      const {
        ik_private_key,
        spk_private_key,
        opks_private,
        ik_public,
        spk_public,
        opks_public,
        nonce,
        signedPrekeySignature,
        salt,
        recoveryKeyWords,
        recovery_key_encrypted,
        recovery_key_nonce,
        recovery_salt,
      } = await GenerateX3DHKeys(password);

      const registerUrl = getApiUrl('/users/register');

      const res = await fetch(registerUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: name,
          email,
          password,
          ik_private_key,
          spk_private_key,
          opks_private,
          ik_public,
          spk_public,
          opks_public,
          nonce,
          signedPrekeySignature,
          salt,
          recovery_key_encrypted,
          recovery_key_nonce,
          recovery_salt,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }

      const { token, user } = result.data;

      // Generate derived key and prepare user keys regardless of verification status
      const derivedKey = sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      // Decrypt identity key for storage
      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ik_private_key),
        sodium.from_base64(nonce),
        derivedKey
      );
      if (!decryptedIkPrivateKey) {
        throw new Error("Failed to decrypt identity key private key");
      }

      const userKeys = {
        identity_private_key: decryptedIkPrivateKey,
        signedpk_private_key: sodium.from_base64(spk_private_key),
        oneTimepks_private: opks_private.map((opk) => ({
          opk_id: opk.opk_id,
          private_key: sodium.crypto_secretbox_open_easy(
            sodium.from_base64(opk.private_key),
            sodium.from_base64(nonce),
            derivedKey
          ),
        })),
        identity_public_key: sodium.from_base64(ik_public),
        signedpk_public_key: sodium.from_base64(spk_public),
        oneTimepks_public: opks_public.map((opk) => ({
          opk_id: opk.opk_id,
          publicKey: sodium.from_base64(opk.publicKey),
        })),
        signedPrekeySignature: sodium.from_base64(signedPrekeySignature),
        salt: sodium.from_base64(salt),
        nonce: sodium.from_base64(nonce),
      };

      // Store encryption keys regardless of verification status
      await storeDerivedKeyEncrypted(derivedKey);
      sessionStorage.setItem("unlockToken", "session-unlock");
      await storeUserKeysSecurely(userKeys, derivedKey);

      useEncryptionStore.setState({
        encryptionKey: derivedKey,
        userId: user.id,
        userKeys: userKeys,
      });

      // 🔑 Show recovery key to user BEFORE proceeding
      setRecoveryKey(recoveryKeyWords);
      setShowRecoveryKeyModal(true);
      setIsLoading(false);

      // Store verification state to continue after modal is closed
      sessionStorage.setItem('pendingVerificationEmail', user.email);
      sessionStorage.setItem('pendingVerificationUserId', user.id);
      sessionStorage.setItem('pendingVerificationToken', token);
      sessionStorage.setItem('needsVerification', user.is_verified ? 'false' : 'true');

      return; // Wait for user to save recovery key

      // Check if user needs email verification
      if (!user.is_verified) {
        setLoaderMessage("Account created! Please check your email for verification...");

        // Add user to PostgreSQL database before redirecting to verification
        try {
          const addUserUrl = getFileApiUrl('/addUser');

          const addUserRes = await fetch(addUserUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: user.id,
            }),
          });

          if (!addUserRes.ok) {
            const errorText = await addUserRes.text();
            console.error("Failed to add user to PostgreSQL database:", errorText);
          } else {
            console.log("User successfully added to PostgreSQL database");
          }
        } catch (error) {
          console.error("Error adding user to PostgreSQL database:", error);
        }

        // Store token for unverified users too
        const rawToken = token.replace(/^Bearer\s/, "");
        localStorage.setItem("token", rawToken);

        // Set flag to prevent AuthGuard from redirecting during verification
        sessionStorage.setItem("pendingVerification", "true");

        setTimeout(() => {
          const redirectParam = searchParams.get('redirect');
          const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(user.email)}&userId=${user.id}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`;
          router.push(verifyUrl);
        }, 1500);
        return;
      }

      // For verified users, proceed with normal flow
      const rawToken = token.replace(/^Bearer\s/, "");
      localStorage.setItem("token", rawToken);
      setMessage("User successfully registered!");
      showToast("User successfully registered!", "success");

      // Add user to PostgreSQL database (for verified users)
      try {
        const addUserUrl = getFileApiUrl('/addUser');

        const addUserRes = await fetch(addUserUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
          }),
        });

        if (!addUserRes.ok) {
          const errorText = await addUserRes.text();
          console.error("Failed to add user to PostgreSQL database:", errorText);
        } else {
          console.log("User successfully added to PostgreSQL database");
        }
      } catch (error) {
        console.error("Error adding user to PostgreSQL database:", error);
      }

      setTimeout(() => {
        const redirectUrl = searchParams.get('redirect') || '/dashboard';
        router.push(redirectUrl);
      }, 1000);
    } catch (err) {
      console.error("Signup error:", err);
      setMessage(err.message || "Something went wrong. Please try again.");
      showToast(err.message || "Something went wrong. Please try again.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setLoaderMessage("Redirecting to Google...");

      const authInProgress = localStorage.getItem('googleAuthInProgress');
      if (authInProgress) {
        setMessage('Google authentication is already in progress. Please wait...');
        setIsLoading(false);
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable');
        setMessage('Configuration error. Please try again later or contact support.');
        setIsLoading(false);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'openid email profile';

      // Generate state parameter for security
      const stateArray = new Uint32Array(4);
      crypto.getRandomValues(stateArray);
      const state = Array.from(stateArray, x => x.toString(16)).join('');
      sessionStorage.setItem('googleOAuthState', state);

      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${encodeURIComponent(state)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      localStorage.setItem('googleAuthInProgress', 'true');

      localStorage.removeItem('lastUsedGoogleCode');

      // Use simple location redirect instead of dynamic script injection
      window.location.assign(authUrl);

    } catch (error) {
      console.error('Google OAuth error:', error);
      setMessage('Failed to initiate Google authentication. Please try again.');
      setIsLoading(false);
      localStorage.removeItem('googleAuthInProgress');
    }
  };

  function setError(msg) {
    setMessage(msg);
    setIsLoading(false);
  }

  // 🔑 Handle recovery key modal confirmation
  const handleRecoveryKeyConfirmed = async () => {
    setShowRecoveryKeyModal(false);
    setIsLoading(true);

    const email = sessionStorage.getItem('pendingVerificationEmail');
    const userId = sessionStorage.getItem('pendingVerificationUserId');
    const token = sessionStorage.getItem('pendingVerificationToken');
    const needsVerification = sessionStorage.getItem('needsVerification') === 'true';

    // Clean up session storage
    sessionStorage.removeItem('pendingVerificationEmail');
    sessionStorage.removeItem('pendingVerificationUserId');
    sessionStorage.removeItem('pendingVerificationToken');
    sessionStorage.removeItem('needsVerification');

    // Add user to PostgreSQL database
    try {
      const addUserUrl = getFileApiUrl('/addUser');
      await fetch(addUserUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
    } catch (error) {
      console.error("Error adding user to PostgreSQL database:", error);
    }

    const rawToken = token.replace(/^Bearer\s/, "");
    localStorage.setItem("token", rawToken);

    if (needsVerification) {
      setLoaderMessage("Account created! Please check your email for verification...");
      sessionStorage.setItem("pendingVerification", "true");

      setTimeout(() => {
        const redirectParam = searchParams.get('redirect');
        const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(email)}&userId=${userId}${redirectParam ? `&redirect=${encodeURIComponent(redirectParam)}` : ''}`;
        router.push(verifyUrl);
      }, 1500);
    } else {
      setMessage("User successfully registered!");
      showToast("User successfully registered!", "success");

      setTimeout(() => {
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.push(redirectUrl);
      }, 1500);
    }
  };

  async function GenerateX3DHKeys(password) {
    const sodium = await getSodium();

    const ik = sodium.crypto_sign_keypair();
    const spk = sodium.crypto_sign_keypair();

    const spkSignature = sodium.crypto_sign_detached(
      spk.publicKey,
      ik.privateKey
    );

    const opks = Array.from({ length: 10 }, () => ({
      opk_id: crypto.randomUUID(),
      keypair: sodium.crypto_box_keypair(),
    }));

    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const derivedKey = sodium.crypto_pwhash(
      32,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedIK = sodium.crypto_secretbox_easy(
      ik.privateKey,
      nonce,
      derivedKey
    );

    const encryptedOPKs = opks.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: sodium.to_base64(
        sodium.crypto_secretbox_easy(opk.keypair.privateKey, nonce, derivedKey)
      ),
    }));

    // 🔑 NEW: Generate recovery key for password reset
    const recoveryKey = sodium.randombytes_buf(32);
    const recoveryKeyBase64 = sodium.to_base64(recoveryKey);

    // Encrypt the derived key with recovery key for backup
    const recoveryNonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedDerivedKeyBackup = sodium.crypto_secretbox_easy(
      derivedKey,
      recoveryNonce,
      recoveryKey
    );

    const recoverySalt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

    return {
      ik_public: sodium.to_base64(ik.publicKey),
      spk_public: sodium.to_base64(spk.publicKey),
      signedPrekeySignature: sodium.to_base64(spkSignature),
      opks_public: opks.map((opk) => ({
        opk_id: opk.opk_id,
        publicKey: sodium.to_base64(opk.keypair.publicKey),
      })),

      ik_private_key: sodium.to_base64(encryptedIK),
      spk_private_key: sodium.to_base64(spk.privateKey),
      opks_private: encryptedOPKs,

      salt: sodium.to_base64(salt),
      nonce: sodium.to_base64(nonce),

      // 🔑 Recovery key data (NEW)
      recoveryKeyWords: recoveryKeyBase64, // Show this to user ONCE
      recovery_key_encrypted: sodium.to_base64(encryptedDerivedKeyBackup),
      recovery_key_nonce: sodium.to_base64(recoveryNonce),
      recovery_salt: sodium.to_base64(recoverySalt),
    };
  }

  return (
    <div className="min-h-screen bg-white flex" data-testid="auth-page">
      {isLoading && <Loader message={loaderMessage} />}
      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600 bg-opacity-10 dark:bg-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-white/10 rounded-full animate-bounce" />
        <div className="absolute top-1/2 right-40 w-16 h-16 bg-blue-400/40 rounded-full animate-ping" />
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Image
                src="/img/shield-emp-white.png"
                alt="SecureShare Logo Light"
                width={50}
                height={50}
                className="block dark:hidden"
              />

              <Image
                src="/img/shield-emp-white.png"
                alt="SecureShare Logo Dark"
                width={50}
                height={50}
                className="hidden dark:block"
              />

              <h1 className="text-3xl font-bold">SecureShare</h1>
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Secure file sharing made simple
            </h2>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              Share files with confidence. End-to-end encryption, access
              controls, and more.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-neutral-100 dark:bg-gray-300">
        <div className="w-full max-w-md">
          {/* Tabs */}
          <div className="grid grid-cols-2 mb-8 border-b border-gray-300">
            <div
              onClick={() => {
                setTab("login");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`cursor-pointer text-center pb-2 font-medium transition-all ${tab === "login"
                ? "text-blue-600 font-bold text-lg border-b-2 border-blue-600"
                : "text-gray-500 hover:text-blue-600"
                }`}
            >
              Log In
            </div>
            <div
              onClick={() => {
                setTab("signup");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`cursor-pointer text-center pb-2 font-medium transition-all ${tab === "signup"
                ? "text-blue-600 font-bold text-lg border-b-2 border-blue-600"
                : "text-gray-500 hover:text-blue-600"
                }`}
            >
              Sign Up
            </div>
          </div>

          {/* Messages */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm mb-4 ${message.includes("successful")
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              {message}
            </div>
          )}

          {/* Login Form */}
          {tab === "login" && (
            <>
              {/* Greetings */}
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Welcome back
                </h2>
                <p className="text-sm text-gray-600">
                  Enter your credentials to access your account.
                </p>
              </div>

              {/* Form */}
              <form onSubmit={handleLoginSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Email address
                  </label>
                  <input
                    id="login-email"
                    name="email"
                    type="email"
                    value={loginData.email}
                    onChange={handleChange(setLoginData)}
                    required
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? 'text' : 'password'}
                      value={loginData.password}
                      onChange={handleChange(setLoginData)}
                      required
                      className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label={showLoginPassword ? 'Hide password' : 'Show password'}
                    >
                      {showLoginPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
                >
                  {isLoading ? "Signing in..." : "Log In"}
                </button>

                {/* Forgot Password Link */}
                <div className="text-center">
                  <Link
                    href="/reset-password"
                    className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
                  >
                    Forgot your password?
                  </Link>
                </div>
              </form>
            </>
          )}

          {tab === "signup" && (
            <>
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Create your account{" "}
                </h2>
                <p className="text-sm text-gray-600">
                  Join SecureShare and take control of your privacy.
                </p>
              </div>
              <form onSubmit={handleSignupSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="name"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Username
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    value={signupData.name}
                    onChange={handleChange(setSignupData)}
                    required
                    className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${fieldErrors.name ? 'border-red-500' : ''
                      }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.name}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="email"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={signupData.email}
                    onChange={handleChange(setSignupData)}
                    required
                    className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${fieldErrors.email ? 'border-red-500' : ''
                      }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.email}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <input
                      id="password"
                      name="password"
                      type={showSignupPassword ? 'text' : 'password'}
                      value={signupData.password}
                      onChange={handleChange(setSignupData)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      required
                      className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${fieldErrors.password ? 'border-red-500' : ''
                        }`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label={showSignupPassword ? 'Hide password' : 'Show password'}
                    >
                      {showSignupPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements Checklist */}
                  {isPasswordFocused && signupData.password && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-100 rounded-md border">
                      <p className="text-sm font-medium text-gray-700 mb-2">Password Requirements:</p>
                      <div className="space-y-1">
                        <div className={`flex items-center text-sm ${passwordRequirements.hasMinLength ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.hasMinLength ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {passwordRequirements.hasMinLength && <span className="text-white text-xs">✓</span>}
                          </div>
                          At least 8 characters
                        </div>
                        <div className={`flex items-center text-sm ${passwordRequirements.hasUppercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.hasUppercase ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {passwordRequirements.hasUppercase && <span className="text-white text-xs">✓</span>}
                          </div>
                          At least one uppercase letter
                        </div>
                        <div className={`flex items-center text-sm ${passwordRequirements.hasLowercase ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.hasLowercase ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {passwordRequirements.hasLowercase && <span className="text-white text-xs">✓</span>}
                          </div>
                          At least lowercase letter
                        </div>
                        <div className={`flex items-center text-sm ${passwordRequirements.hasNumber ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.hasNumber ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {passwordRequirements.hasNumber && <span className="text-white text-xs">✓</span>}
                          </div>
                          At least one number
                        </div>
                        <div className={`flex items-center text-sm ${passwordRequirements.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                          <div className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${passwordRequirements.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`}>
                            {passwordRequirements.hasSpecialChar && <span className="text-white text-xs">✓</span>}
                          </div>
                          At least one special character (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  )}

                  {fieldErrors.password && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.password}</p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={signupData.confirmPassword}
                      onChange={handleChange(setSignupData)}
                      disabled={!allPasswordRequirementsMet}
                      required
                      className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${fieldErrors.confirmPassword ? 'border-red-500' : ''
                        } ${!allPasswordRequirementsMet ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''}`}
                      placeholder={!allPasswordRequirementsMet ? 'Enter password' : ''}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      disabled={!allPasswordRequirementsMet}
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 ${!allPasswordRequirementsMet ? 'opacity-50 cursor-not-allowed' : ''}`}
                      aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                    >
                      {showConfirmPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>

                {message && (
                  <div className="text-sm text-red-600">{message}</div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-semibold flex items-center justify-center min-h-[42px]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating account...
                    </>
                  ) : (
                    "Create account"
                  )}
                </button>
                {/* <div className="flex items-center my-4">
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                  <span className="mx-2 text-gray-500 text-sm">or</span>
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                </div> */}

                {/* Google Sign Up button */}
                {/* <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center space-x-2 border dark:border-gray-400 border-gray-300 rounded-md py-2 hover:bg-gray-100 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  data-testid="google-oauth-button"
                >
                  <svg
                    className="w-5 h-5"
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 533.5 544.3"
                  >
                    <path
                      fill="#4285f4"
                      d="M533.5 278.4c0-17.6-1.5-34.6-4.4-51.1H272v96.9h146.7c-6.3 34.3-25 63.4-53.6 82.9v68h86.7c50.7-46.7 79.7-115.7 79.7-196.7z"
                    />
                    <path
                      fill="#34a853"
                      d="M272 544.3c72.9 0 134.1-24.1 178.7-65.3l-86.7-68c-24.1 16.1-55 25.7-91.9 25.7-70.7 0-130.6-47.7-152.1-111.9h-90.3v70.4c44.8 88.2 136.5 149.1 242.4 149.1z"
                    />
                    <path
                      fill="#fbbc04"
                      d="M119.9 322.8c-10.4-30.8-10.4-64.3 0-95.1v-70.4h-90.3c-37.8 74.8-37.8 164.7 0 239.5l90.3-73.9z"
                    />
                    <path
                      fill="#ea4335"
                      d="M272 107.7c39.4-.6 77.2 14 106 40.4l79.3-79.3C402.1 22.2 344.4-1.6 272 0 166.1 0 74.4 60.9 29.6 149.1l90.3 70.4c21.6-64.2 81.5-111.9 152.1-111.9z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-gray-700">
                    Continue with Google
                  </span>
                </button> */}
              </form>
            </>
          )}
        </div>
      </div>

      {toast.message && (
        <div
          className={`
      fixed top-6 right-6 px-6 py-3 rounded-lg shadow-lg z-[9999]
      text-sm font-medium transition-all duration-300
      animate-slide-in-out
      ${toast.type === "success" ? "bg-green-400 text-white" : ""}
      ${toast.type === "error" ? "bg-red-400 text-white" : ""}
      ${toast.type === "default" ? "bg-blue-400 text-white" : ""}
    `}
        >
          {toast.message}
        </div>
      )}

      {/* 🔑 Recovery Key Modal */}
      {showRecoveryKeyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-2xl w-full p-8 animate-fade-in">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Save Your Recovery Key</h2>
              <p className="text-gray-600">
                This is your only chance to save your recovery key. You&apos;ll need it to reset your password if you forget it.
              </p>
            </div>

            <div className="bg-gray-50 border-2 border-yellow-300 rounded-lg p-4 mb-6">
              <div className="flex items-start mb-2">
                <svg className="w-5 h-5 text-yellow-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-gray-800">Important: Store this key securely!</p>
              </div>
              <div className="bg-white p-4 rounded border border-gray-200 mb-3 font-mono text-sm break-all select-all">
                {recoveryKey}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(recoveryKey);
                  showToast("Recovery key copied to clipboard!", "success");
                }}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy Recovery Key
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-700">Save this key in a secure password manager</p>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-sm text-gray-700">Write it down and store it in a safe place</p>
              </div>
              <div className="flex items-start">
                <svg className="w-5 h-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
                <p className="text-sm text-gray-700">Never share this key with anyone</p>
              </div>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-red-800">
                <strong>Warning:</strong> Without this recovery key, you will not be able to reset your password or access your files if you forget your password.
              </p>
            </div>

            <button
              onClick={handleRecoveryKeyConfirmed}
              className="w-full bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              I&apos;ve Saved My Recovery Key - Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Feature({ icon, title, desc }) {
  return (
    <div className="flex items-center animate-fade-in">
      <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center mr-4">
        <div className="w-4 h-4 bg-white rounded-full" />
      </div>
      <div>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-blue-100 text-sm">{desc}</p>
      </div>
    </div>
  );
}