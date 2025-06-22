"use client";

import Image from "next/image";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import sodium from "libsodium-wrappers";
import { a } from "framer-motion/dist/types.d-B_QPEvFK";

//importing the SecureKeyStorage functions
import { storeUserKeysSecurely, deleteUserKeysSecurely, getUserKeysSecurely, useEncryptionStore } from "@/app/SecureKeyStorage";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    try {
      await sodium.ready;
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
        user
      } = result.data;

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
        oneTimepks_private: sodium.from_base64(opks_private),
        identity_public_key: sodium.from_base64(ik_public_key),
        signedpk_public_key: sodium.from_base64(spk_public_key),
        oneTimepks_public: sodium.from_base64(opks_public),
        signedPreKeySignature: sodium.from_base64(signedPreKeySignature),
        salt: sodium.from_base64(salt),
        nonce: sodium.from_base64(nonce),
      };

      //store the user keys and derived key securely
      useEncryptionStore.getState().setEncryptionKey(derivedKey);
      await storeUserKeysSecurely(userKeys, derivedKey);

      console.log("User keys stored successfully:", userKeys);
      // localStorage.setItem('token', result.token);
      const bearerToken = result.data?.token;

      if (!bearerToken) {
        throw new Error("No token returned from server");
      }

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-800 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-neutral-200/95 dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex justify-center items-center">
          <Image
            src="/img/shield-emp-black.png"
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
        </div>

        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">
          Log in to your account
        </h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Error/Success Message */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm ${
                message.includes("successful")
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {message}
            </div>
          )}

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Email address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-700 dark:text-gray-200"
            >
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Forgot */}
          <div className="flex items-center justify-between">
            <Link
              href="/requestReset"
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed text-white font-medium py-2 px-4 rounded-md transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
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
                Signing In...
              </>
            ) : (
              "Sign In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 text-sm text-center text-gray-600 dark:text-gray-300">
          Don’t have an account?{" "}
          <Link
            href="/signup"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
