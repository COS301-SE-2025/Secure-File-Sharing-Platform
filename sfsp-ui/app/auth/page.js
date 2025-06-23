"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { getSodium } from "@/app/lib/sodium";
import { v4 as uuidv4 } from "uuid";
//import * as sodium from 'libsodium-wrappers-sumo';
import { generateLinearEasing } from "framer-motion";
import { useEncryptionStore, storeUserKeysSecurely, storeDerivedKeyEncrypted } from "../SecureKeyStorage";

//await sodium.ready;
//sodium.init && sodium.init();

export default function AuthPage() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  function handleChange(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({
        ...prev,
        [name]: value,
      }));
    };
  }

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    try {
      const sodium = await getSodium();
      const res = await fetch("http://localhost:5000/api/users/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Invalid login credentials");
      }

      //New E2EE stuff
      const {
        salt,
        nonce,
        //private keys
        ik_private_key,
        spk_private_key,
        opks_private,
        //public keys
        ik_public_key,
        spk_public_key,
        signedPreKeySignature,
        opks_public,

        token,
        user,
      } = result.data;

      console.log("Salt is: ", salt);
      console.log("Nonce is: ", nonce);
      console.log("ik_private is: ", ik_private_key);
      console.log("spk_private is: ", spk_private_key);
      console.log("ik_public is: ", ik_public_key);
      console.log("spk_public is: ", spk_public);
      console.log("signedPreKeySignature", signedPreKeySignature);
      console.log("user", user.id);

      //we don't need to securely store the user ID but I will store it in the Zustand store for easy access
      useEncryptionStore.getState().setUserId(user.id);

      //derived key from password and salt
      const derivedKey = sodium.crypto_pwhash(
        32, // key length
        formData.password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      //Try decrypting the private keys
      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ik_private_key),
        sodium.from_base64(nonce),
        derivedKey
      );

      if (!decryptedIkPrivateKey) {
        throw new Error("Failed to decrypt identity key private key");
      }

      //Store the decrypted private keys in localStorage or secure storage
      //if you guys know of a better way to store these securely, please let me know or just change this portion of the code
      const userKeys = {
        identity_private_key: decryptedIkPrivateKey,
        signedpk_private_key: sodium.from_base64(spk_private_key),
        oneTimepks_private: opks_private.map((opk) => ({
          opk_id: opk.opk_id,
          private_key: sodium.from_base64(opk.private_key),
        })),
        identity_public_key: sodium.from_base64(ik_public_key),
        signedpk_public_key: sodium.from_base64(spk_public_key),
        oneTimepks_public: opks_public.map((opk) => ({
          opk_id: opk.opk_id,
          publicKey: sodium.from_base64(opk.publicKey),
        })),
        signedPreKeySignature: sodium.from_base64(signedPreKeySignature),
        salt: sodium.from_base64(salt),
        nonce: sodium.from_base64(nonce),
      };

      await storeDerivedKeyEncrypted(derivedKey); // stores with unlockToken
      sessionStorage.setItem("unlockToken", "session-unlock");
      await storeUserKeysSecurely(userKeys, derivedKey); // your existing function

      useEncryptionStore.setState({
        encryptionKey: derivedKey,
        userId: user.id,
        userKeys: userKeys,
      });

      console.log("User keys stored successfully:", userKeys);
      // localStorage.setItem('token', result.token);
      const bearerToken = result.data?.token;

      if (!bearerToken) {
        throw new Error("No token returned from server");
      }

      //const unlockToken = sessionStorage.getItem("unlockToken");

      const rawToken = bearerToken.replace(/^Bearer\s/, "");
      localStorage.setItem("token", rawToken);
      setMessage("Login successful!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch (err) {
      console.error("Login error:", err);
      setMessage(
        err.message || "An unexpected error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = signupData;
    setIsLoading(true);
    setMessage(null);

    // Basic validations
    if (!name || !email || !password || !confirmPassword) {
      setMessage("All fields are required.");
      setIsLoading(false);
      return;
    }

    const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (!validateEmail(email)) {
      setMessage("Please enter a valid email address.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords don't match.");
      setIsLoading(false);
      return;
    }

    try {
      const sodium = await getSodium();

      // Generate X3DH key bundle
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
      } = await GenerateX3DHKeys(password);

      // Send keys + user info to backend
      const res = await fetch("http://localhost:5000/api/users/register", {
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
        }),
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }

      // Get token and user info
      const token = result.data.token?.replace(/^Bearer\s+/, "");
      const user = result.data.user;
      localStorage.setItem("token", token);

      // Derive encryption key from password + salt
      const derivedKey = sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      // Decrypt identity key private key
      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ik_private_key),
        sodium.from_base64(nonce),
        derivedKey
      );

      if (!decryptedIkPrivateKey) {
        throw new Error("Failed to decrypt identity key private key");
      }

      // Store keys in secure format
      const userKeys = {
        identity_private_key: decryptedIkPrivateKey,
        signedpk_private_key: sodium.from_base64(spk_private_key),
        oneTimepks_private: opks_private.map((opk) => ({
          opk_id: opk.opk_id,
          private_key: sodium.from_base64(opk.private_key),
        })),
        identity_public_key: sodium.from_base64(ik_public),
        signedpk_public_key: sodium.from_base64(spk_public),
        oneTimepks_public: opks_public.map((opk) => ({
          opk_id: opk.opk_id,
          publicKey: sodium.from_base64(opk.publicKey),
        })),
        signedPreKeySignature: sodium.from_base64(signedPrekeySignature),
        salt: sodium.from_base64(salt),
        nonce: sodium.from_base64(nonce),
      };
      //const unlockToken = sessionStorage.getItem("unlockToken");

      // Save to Zustand and secure IndexedDB
      await storeDerivedKeyEncrypted(derivedKey); // stores with unlockToken
      sessionStorage.setItem("unlockToken", "session-unlock");
      await storeUserKeysSecurely(userKeys, derivedKey); // your existing function

      useEncryptionStore.setState({
        encryptionKey: derivedKey,
        userId: user.id,
        userKeys: userKeys,
      });
      setMessage("User successfully registered!");
      router.push("/dashboard");
    } catch (err) {
      console.error(err);
      setMessage(err.message || "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  async function GenerateX3DHKeys(password) {
    const sodium = await getSodium();

    // Identity and Signed PreKey
    const ik = sodium.crypto_sign_keypair();
    const spk = sodium.crypto_box_keypair();
    const spkSignature = sodium.crypto_sign_detached(
      spk.publicKey,
      ik.privateKey
    );

    // One-Time PreKeys (OPKs)
    const opks = Array.from({ length: 10 }, () => ({
      id: uuidv4(),
      keypair: sodium.crypto_box_keypair(),
    }));

    // Derive encryption key from password
    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    const derivedKey = sodium.crypto_pwhash(
      32,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    // Encrypt Identity Private Key
    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    const encryptedIK = sodium.crypto_secretbox_easy(
      ik.privateKey,
      nonce,
      derivedKey
    );

    //test if the keys are as expected
    console.log("ENCRYPTED IK PRIVATE is: ", encryptedIK);
    console.log("spk private is: ", spk.privateKey);
    console.log("nonce is: ", nonce);
    console.log("Salt is: ", salt);
    console.log("ik public is: ", ik.publicKey);
    console.log("spk public is: ", spk.publicKey);
    console.log("signedPreKeySignature is:", spkSignature);

    return {
      // Public-side keys
      ik_public: sodium.to_base64(ik.publicKey),
      spk_public: sodium.to_base64(spk.publicKey),
      signedPrekeySignature: sodium.to_base64(spkSignature),
      opks_public: opks.map((opk) => ({
        opk_id: opk.id,
        publicKey: sodium.to_base64(opk.keypair.publicKey),
      })),

      // Encrypted/Private-side
      ik_private_key: sodium.to_base64(encryptedIK),
      spk_private_key: sodium.to_base64(spk.privateKey),
      opks_private: opks.map((opk) => ({
        opk_id: opk.id,
        private_key: sodium.to_base64(opk.keypair.privateKey),
      })),

      // Crypto parameters
      nonce: sodium.to_base64(nonce),
      salt: sodium.to_base64(salt),
    };
  }

  return (
    <div className="min-h-screen bg-white flex">
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
              }}
              className={`cursor-pointer text-center pb-2 font-medium transition-all ${
                tab === "login"
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
              }}
              className={`cursor-pointer text-center pb-2 font-medium transition-all ${
                tab === "signup"
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
              className={`p-3 rounded-md text-sm mb-4 ${
                message.includes("successful")
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
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    value={loginData.password}
                    onChange={handleChange(setLoginData)}
                    required
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Link
                    href="/requestReset"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
                >
                  {isLoading ? "Signing in..." : "Log In"}
                </button>

                {/* Or separator */}
                <div className="flex items-center my-4">
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                  <span className="mx-2 text-gray-500 text-sm">or</span>
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                </div>

                {/* Google login button */}
                <button
                  type="button"
                  onClick={() => {
                    //Replace this with Google OAuth logic
                    window.location.href = "/api/auth/google";
                  }}
                  className="w-full flex items-center justify-center space-x-2 border dark:border-gray-400 border-gray-300 rounded-md py-2 hover:bg-gray-100 transition"
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
                </button>
              </form>
            </>
          )}

          {/* Signup Form */}
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
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 "
                  />
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
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900  "
                  />
                </div>
                <div>
                  <label
                    htmlFor="password"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    value={signupData.password}
                    onChange={handleChange(setSignupData)}
                    required
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900  "
                  />
                </div>
                <div>
                  <label
                    htmlFor="confirmPassword"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={signupData.confirmPassword}
                    onChange={handleChange(setSignupData)}
                    required
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900  "
                  />
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
                <div className="flex items-center my-4">
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                  <span className="mx-2 text-gray-500 text-sm">or</span>
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                </div>

                {/* Google Sign Up button */}
                <button
                  type="button"
                  onClick={() => {
                    // Replace with your actual Google signup route
                    window.location.href = "/api/auth/google";
                  }}
                  className="w-full flex items-center justify-center space-x-2 border dark:border-gray-400 border-gray-300 rounded-md py-2 hover:bg-gray-100 transition"
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
                </button>
              </form>
            </>
          )}
        </div>
      </div>
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
