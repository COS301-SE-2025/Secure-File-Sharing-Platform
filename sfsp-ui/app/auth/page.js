"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Loader from "@/app/dashboard/components/Loader";
import { getSodium } from "@/app/lib/sodium";
import { Eye, EyeOff } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
  useEncryptionStore,
  storeUserKeysSecurely,
  storeDerivedKeyEncrypted,
} from "../SecureKeyStorage";
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";
//import { get } from "cypress/types/lodash";

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
  const [showRecoveryCodeModal, setShowRecoveryCodeModal] = useState(false);
  const [recoveryCode, setRecoveryCode] = useState("");

  // Forgot Password States
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotUserId, setForgotUserId] = useState("");
  const emailInputRef = useRef(null);

  useEffect(() => {
    if (
      showForgotPassword &&
      forgotPasswordStep === 1 &&
      emailInputRef.current
    ) {
      emailInputRef.current.focus();
    }
  }, [showForgotPassword, forgotPasswordStep]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    if (error) {
      const errorMessages = {
        oauth_error:
          "Google authentication was cancelled or failed. Please try again.",
        oauth_cancelled: "Google authentication was cancelled.",
        missing_code:
          "Google authentication failed. Missing authorization code.",
        code_expired: "Authorization code has expired. Please try again.",
        code_reused:
          "This authorization code has already been used. Please try again.",
        invalid_state: "Invalid authentication state. Please try again.",
        authentication_failed:
          "Failed to authenticate with our servers. Please try again.",
        oauth_init_failed:
          "Failed to initiate Google authentication. Please check your internet connection.",
      };
      setMessage(
        errorMessages[error] ||
          "An error occurred during Google authentication. Please try again."
      );
      window.history.replaceState({}, "", window.location.pathname);
    }

    const authInProgress = localStorage.getItem("googleAuthInProgress");
    if (authInProgress) {
      localStorage.removeItem("googleAuthInProgress");
    }
  }, []);

  function handleChange(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({ ...prev, [name]: value }));
      if (name === "password" && setter === setSignupData) {
        checkPasswordRequirements(value);
      }
      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({ ...prev, [name]: "" }));
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

  const allPasswordRequirementsMet = Object.values(passwordRequirements).every(
    (req) => req
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoaderMessage("Signing you in...");
    setMessage(null);
    setFieldErrors({});

    try {
      const sodium = await getSodium();
      const loginUrl = getApiUrl("/users/login");
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

      const {
        id,
        salt,
        nonce,
        is_verified,
        ik_public,
        spk_public,
        signedPrekeySignature,
        opks_public,
      } = result.data.user;
      const { ik_private_key, opks_private, spk_private_key } =
        result.data.keyBundle;
      const { token } = result.data;

      setLoaderMessage("Sending verification code...");
      sessionStorage.setItem(
        "pendingLogin",
        JSON.stringify({
          email: loginData.email,
          password: loginData.password,
          userId: id,
        })
      );

      try {
        const sendCodeResponse = await fetch(`/api/auth/send-verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: loginData.email,
            userId: id,
            userName: result.data.user.username || "User",
            type: "login_verify",
          }),
        });

        if (!sendCodeResponse.ok) {
          const errorData = await sendCodeResponse.json();
          throw new Error(
            errorData.message || "Failed to send verification code"
          );
        }

        setLoaderMessage("Verification code sent! Redirecting...");
        setTimeout(() => {
          const redirectParam = searchParams.get("redirect");
          const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(
            loginData.email
          )}&userId=${id}${
            redirectParam
              ? `&redirect=${encodeURIComponent(redirectParam)}`
              : ""
          }`;
          router.push(verifyUrl);
        }, 1500);
      } catch (error) {
        console.error("Error sending verification code:", error);
        setMessage("Failed to send verification code. Please try again.");
      }
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
    setLoaderMessage("Creating your SecureShare account...");
    setMessage(null);
    setFieldErrors({});

    let errors = {};
    if (!name) errors.name = "Name is required.";
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
        recovery_ik_private_key,
        recovery_opks_private,
        recoveryCode: generatedRecoveryCode,
      } = await GenerateX3DHKeys(password);

      console.log("Generated Recovery Code: ", generatedRecoveryCode);

      const registerUrl = getApiUrl("/users/register");
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
          recovery_ik_private_key,
          recovery_opks_private,
        }),
      });

      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.message || "Registration failed");
      }

      const { token, user } = result.data;
      const derivedKey = sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

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

      await storeDerivedKeyEncrypted(derivedKey);
      sessionStorage.setItem("unlockToken", "session-unlock");
      await storeUserKeysSecurely(userKeys, derivedKey);

      useEncryptionStore.setState({
        encryptionKey: derivedKey,
        userId: user.id,
        userKeys: userKeys,
      });

      if (!user.is_verified) {
        setLoaderMessage(
          "Account created! Please check your email for verification..."
        );
        try {
          const addUserUrl = getFileApiUrl("/addUser");
          const addUserRes = await fetch(addUserUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: user.id }),
          });
          if (!addUserRes.ok) {
            console.error(
              "Failed to add user to PostgreSQL database:",
              await addUserRes.text()
            );
          }
        } catch (error) {
          console.error("Error adding user to PostgreSQL database:", error);
        }

        const rawToken = token.replace(/^Bearer\s/, "");
        localStorage.setItem("token", rawToken);
        sessionStorage.setItem("pendingVerification", "true");

        setTimeout(() => {
          const redirectParam = searchParams.get("redirect");
          const verifyUrl = `/auth/verify-email?email=${encodeURIComponent(
            user.email
          )}&userId=${user.id}${
            redirectParam
              ? `&redirect=${encodeURIComponent(redirectParam)}`
              : ""
          }`;
          router.push(verifyUrl);
        }, 1500);
        return;
      }

      const rawToken = token.replace(/^Bearer\s/, "");
      localStorage.setItem("token", rawToken);
      setMessage("User successfully registered!");

      try {
        const addUserUrl = getFileApiUrl("/addUser");
        const addUserRes = await fetch(addUserUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });
        if (!addUserRes.ok) {
          console.error(
            "Failed to add user to PostgreSQL database:",
            await addUserRes.text()
          );
        }
      } catch (error) {
        console.error("Error adding user to PostgreSQL database:", error);
      }

      setRecoveryCode(generatedRecoveryCode);
      setShowRecoveryCodeModal(true);

      setTimeout(() => {
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.push(redirectUrl);
      }, 1000);
    } catch (err) {
      console.error("Signup error:", err);
      setMessage(err.message || "Something went wrong. Please try again");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e) => {
    e.preventDefault();
    setForgotMessage("");
    if (!forgotEmail) {
      setForgotMessage("Please enter your email address.");
      return;
    }

    setIsLoading(true);
    setLoaderMessage("Sending verification code...");

    try {
      console.log("Sending password reset code to: ", forgotEmail);
      const userCheckUrl = getApiUrl("/users/email");
      const userCheckRes = await fetch(userCheckUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: forgotEmail }),
      });

      if (!userCheckRes.ok) {
        throw new Error("Email not found");
      }

      const userData = await userCheckRes.json();
      const userId = userData.data.id;
      setForgotUserId(userId);

      const sendCodeResponse = await fetch(`/api/auth/send-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          userId: userId,
          userName: userData.data.username || "User",
          type: "password_reset",
        }),
      });

      if (!sendCodeResponse.ok) {
        throw new Error("Failed to send verification code");
      }

      setForgotMessage("Verification code sent to your email!");
      setForgotPasswordStep(2);
    } catch (err) {
      setForgotMessage(err.message || "Error sending verification code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoverySubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoaderMessage("Verifying recovery...");
    setForgotMessage("");

    if (!forgotOtp || !recoveryCode || !newPassword || !confirmNewPassword) {
      setForgotMessage("Please fill in all fields.");
      setIsLoading(false);
      return;
    }

    if (newPassword !== confirmNewPassword) {
      setForgotMessage("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (
      !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/.test(newPassword)
    ) {
      setForgotMessage(
        "Password must be at least 8 characters and include uppercase, lowercase, number, and special character."
      );
      setIsLoading(false);
      return;
    }

    try {
      const verify = getApiUrl("/users/verify-otp");
      const verifyResponse = await fetch(verify, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: forgotEmail,
          otp: forgotOtp,
          type: "password_reset",
        }),
      });

      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok) {
        throw new Error(verifyData.message || "Invalid OTP");
      }

      const { userId } = verifyData.data;

      const userResponse = await fetch(getApiUrl(`/users/reset/${userId}/reset`), {
        headers: { "Content-Type": "application/json" },
      });

      const userData = await userResponse.json();

      if (!userResponse.ok || !userData.success) {
        throw new Error(userData.message || "Failed to fetch user data");
      }

      const { recovery_ik_private_key, recovery_opks_private, salt, nonce } =
        userData.data;

      const sodium = await getSodium();
      const recoveryDerivedKey = sodium.crypto_pwhash(
        32,
        recoveryCode,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(recovery_ik_private_key),
        sodium.from_base64(nonce),
        recoveryDerivedKey
      );
      
      if (!decryptedIkPrivateKey) {
        throw new Error("Invalid recovery code");
      }

      const decryptedOPKs = recovery_opks_private.map((opk) => ({
        opk_id: opk.opk_id,
        private_key: sodium.crypto_secretbox_open_easy(
          sodium.from_base64(opk.private_key),
          sodium.from_base64(nonce),
          recoveryDerivedKey
        ),
      }));

      const newDerivedKey = sodium.crypto_pwhash(
        32,
        newPassword,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      const newEncryptedIK = sodium.crypto_secretbox_easy(
        decryptedIkPrivateKey,
        sodium.from_base64(nonce),
        newDerivedKey
      );
      const newEncryptedOPKs = decryptedOPKs.map((opk) => ({
        opk_id: opk.opk_id,
        private_key: sodium.to_base64(
          sodium.crypto_secretbox_easy(
            opk.private_key,
            sodium.from_base64(nonce),
            newDerivedKey
          )
        ),
      }));

      const updateResponse = await fetch(
        getApiUrl(`/users/reset/${userId}/reset-password`),
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            newPassword,
            ik_private_key: sodium.to_base64(newEncryptedIK),
            opks_private: newEncryptedOPKs,
          }),
        }
      );

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        throw new Error(errorData.message || "Failed to update password");
      }

      setForgotMessage("Password reset successful! Redirecting to login...");
      setShowForgotPassword(false);
      setForgotPasswordStep(1);
      setForgotEmail("");
      setForgotOtp("");
      setRecoveryCode("");
      setNewPassword("");
      setConfirmNewPassword("");
      setTab("login");
    } catch (error) {
      console.error("Recovery error:", error);
      setForgotMessage(
        error.message || "Failed to reset password. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      setIsLoading(true);
      setLoaderMessage("Redirecting to Google...");
      const authInProgress = localStorage.getItem("googleAuthInProgress");
      if (authInProgress) {
        setMessage(
          "Google authentication is already in progress. Please wait..."
        );
        setIsLoading(false);
        return;
      }

      const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error(
          "Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID environment variable"
        );
        setMessage(
          "Configuration error. Please try again later or contact support."
        );
        setIsLoading(false);
        return;
      }

      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = "openid email profile";
      const stateArray = new Uint32Array(4);
      crypto.getRandomValues(stateArray);
      const state = Array.from(stateArray, (x) => x.toString(16)).join("");
      sessionStorage.setItem("googleOAuthState", state);

      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(clientId)}&` +
        `redirect_uri=${encodeURIComponent(redirectUri)}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent(scope)}&` +
        `state=${encodeURIComponent(state)}&` +
        `access_type=offline&` +
        `prompt=consent`;

      localStorage.setItem("googleAuthInProgress", "true");
      localStorage.removeItem("lastUsedGoogleCode");
      window.location.assign(authUrl);
    } catch (error) {
      console.error("Google OAuth error:", error);
      setMessage("Failed to initiate Google authentication. Please try again.");
      setIsLoading(false);
      localStorage.removeItem("googleAuthInProgress");
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

    const recoveryCode = sodium.to_base64(sodium.randombytes_buf(32));
    const recoveryDerivedKey = sodium.crypto_pwhash(
      32,
      recoveryCode,
      salt, 
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    const recoveryEncryptedIK = sodium.crypto_secretbox_easy(
      ik.privateKey,
      nonce,
      recoveryDerivedKey
    );
    const recoveryEncryptedOPKs = opks.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: sodium.to_base64(
        sodium.crypto_secretbox_easy(
          opk.keypair.privateKey,
          nonce,
          recoveryDerivedKey
        )
      ),
    }));

    const encryptedOPKs = opks.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: sodium.to_base64(
        sodium.crypto_secretbox_easy(opk.keypair.privateKey, nonce, derivedKey)
      ),
    }));

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
      recovery_ik_private_key: sodium.to_base64(recoveryEncryptedIK),
      recovery_opks_private: recoveryEncryptedOPKs,
      recoveryCode,
      salt: sodium.to_base64(salt),
      nonce: sodium.to_base64(nonce),
    };
  }

  return (
    <div className="min-h-screen bg-white flex" data-testid="auth-page">
      {isLoading && <Loader message={loaderMessage} />}

      {/* Recovery Code Modal */}
      <AnimatePresence>
        {showRecoveryCodeModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl"
            >
              <h2 className="text-2xl font-bold text-gray-800 mb-4">
                Save Your Recovery Code
              </h2>
              <p className="text-gray-600 mb-4">
                This recovery code is <strong>critical</strong> for resetting
                your password if you forget it. Store it securely (e.g., write
                it down or save in a password manager). Do <strong>not</strong>{" "}
                store it on this device.
              </p>
              <div className="bg-gray-100 p-4 rounded-md text-center font-mono text-sm break-all mb-4">
                {recoveryCode}
              </div>
              <button
                onClick={() => {
                  navigator.clipboard.write(recoveryCode);
                  setMessage("Recovery code copied to clipboard!");
                }}
                className="w-full bg-gray-200 text-Black-800 font-semibold py-2 rounded-md hover:bg-gray-300 transition mb-4"
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowRecoveryCodeModal(false)}
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
                disabled={isLoading}
              >
                I’ve Saved It
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Forgot Password Modal */}
      <AnimatePresence>
        {showForgotPassword && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-white rounded-lg p-8 max-w-md w-full shadow-xl"
            >
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800">
                  Reset Password
                </h2>
                <button
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotPasswordStep(1);
                    setForgotEmail("");
                    setForgotOtp("");
                    setRecoveryCode("");
                    setNewPassword("");
                    setConfirmNewPassword("");
                    setForgotMessage("");
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Close modal"
                >
                  ✕
                </button>
              </div>

              <div className="flex justify-between mb-6">
                <div
                  className={`flex-1 text-center ${
                    forgotPasswordStep >= 1
                      ? "text-blue-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block w-8 h-8 rounded-full ${
                      forgotPasswordStep >= 1
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    1
                  </span>
                  <p className="text-sm mt-1">Enter Email</p>
                </div>
                <div
                  className={`flex-1 text-center ${
                    forgotPasswordStep >= 2
                      ? "text-blue-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block w-8 h-8 rounded-full ${
                      forgotPasswordStep >= 2
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    2
                  </span>
                  <p className="text-sm mt-1">Verify OTP</p>
                </div>
                <div
                  className={`flex-1 text-center ${
                    forgotPasswordStep >= 3
                      ? "text-blue-600 font-semibold"
                      : "text-gray-400"
                  }`}
                >
                  <span
                    className={`inline-block w-8 h-8 rounded-full ${
                      forgotPasswordStep >= 3
                        ? "bg-blue-600 text-white"
                        : "bg-gray-200"
                    }`}
                  >
                    3
                  </span>
                  <p className="text-sm mt-1">Reset Password</p>
                </div>
              </div>

              {forgotMessage && (
                <div
                  className={`p-3 rounded-md text-sm mb-4 ${
                    forgotMessage.includes("successful") ||
                    forgotMessage.includes("sent")
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }`}
                  role="alert"
                >
                  {forgotMessage}
                </div>
              )}

              {forgotPasswordStep === 1 && (
                <form
                  onSubmit={handleForgotPasswordSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label
                      className="block mb-2 font-semibold text-gray-700 text-sm"
                      htmlFor="forgot-email"
                    >
                      Email Address
                    </label>
                    <input
                      id="forgot-email"
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter your email"
                      ref={emailInputRef}
                      aria-describedby="forgot-email-error"
                    />
                    {forgotMessage &&
                      forgotPasswordStep === 1 &&
                      !forgotMessage.includes("sent") && (
                        <p
                          id="forgot-email-error"
                          className="text-red-600 text-sm mt-1"
                        >
                          {forgotMessage}
                        </p>
                      )}
                  </div>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                  >
                    Send Verification Code
                  </button>
                </form>
              )}

              {forgotPasswordStep >= 2 && (
                <form onSubmit={handleRecoverySubmit} className="space-y-4">
                  <div>
                    <label
                      className="block mb-2 font-semibold text-gray-700 text-sm"
                      htmlFor="forgot-otp"
                    >
                      Verification Code
                    </label>
                    <input
                      id="forgot-otp"
                      type="text"
                      value={forgotOtp}
                      onChange={(e) => setForgotOtp(e.target.value)}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      placeholder="Enter 6-digit code"
                      maxLength={6}
                      aria-describedby="forgot-otp-error"
                    />
                  </div>
                  {forgotPasswordStep === 3 && (
                    <>
                      <div>
                        <label
                          className="block mb-2 font-semibold text-gray-700 text-sm"
                          htmlFor="recovery-code"
                        >
                          Recovery Code
                        </label>
                        <input
                          id="recovery-code"
                          type="text"
                          value={recoveryCode}
                          onChange={(e) => setRecoveryCode(e.target.value)}
                          required
                          className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                          placeholder="Enter your recovery code"
                          aria-describedby="recovery-code-info"
                        />
                        <p
                          id="recovery-code-info"
                          className="text-xs text-gray-500 mt-1"
                        >
                          This was provided when you created your account
                        </p>
                      </div>
                      <div>
                        <label
                          className="block mb-2 font-semibold text-gray-700 text-sm"
                          htmlFor="new-password"
                        >
                          New Password
                        </label>
                        <div className="relative">
                          <input
                            id="new-password"
                            type={showNewPassword ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            placeholder="Enter new password"
                            aria-describedby="new-password-error"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label={
                              showNewPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showNewPassword ? (
                              <Eye className="h-5 w-5 text-gray-500" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                      <div>
                        <label
                          className="block mb-2 font-semibold text-gray-700 text-sm"
                          htmlFor="confirm-new-password"
                        >
                          Confirm New Password
                        </label>
                        <div className="relative">
                          <input
                            id="confirm-new-password"
                            type={showConfirmNewPassword ? "text" : "password"}
                            value={confirmNewPassword}
                            onChange={(e) =>
                              setConfirmNewPassword(e.target.value)
                            }
                            required
                            className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                            placeholder="Confirm new password"
                            aria-describedby="confirm-new-password-error"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setShowConfirmNewPassword(!showConfirmNewPassword)
                            }
                            className="absolute inset-y-0 right-0 flex items-center pr-3"
                            aria-label={
                              showConfirmNewPassword
                                ? "Hide password"
                                : "Show password"
                            }
                          >
                            {showConfirmNewPassword ? (
                              <Eye className="h-5 w-5 text-gray-500" />
                            ) : (
                              <EyeOff className="h-5 w-5 text-gray-500" />
                            )}
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                  {forgotMessage &&
                    forgotPasswordStep >= 2 &&
                    !forgotMessage.includes("successful") && (
                      <p
                        id="forgot-otp-error"
                        className="text-red-600 text-sm mt-1"
                      >
                        {forgotMessage}
                      </p>
                    )}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                    onClick={() =>
                      forgotPasswordStep === 2 && setForgotPasswordStep(3)
                    }
                  >
                    {forgotPasswordStep === 2 ? "Verify OTP" : "Reset Password"}
                  </button>
                  {forgotPasswordStep === 2 && (
                    <button
                      type="button"
                      onClick={handleForgotPasswordSubmit}
                      className="w-full text-blue-600 font-semibold py-2 rounded-md hover:text-blue-700 transition"
                      disabled={isLoading}
                    >
                      Resend Verification Code
                    </button>
                  )}
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 relative overflow-hidden">
        <div className="absolute inset-0 bg-blue-600 bg-opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-white/10" />
        <div className="absolute top-20 left-20 w-32 h-32 bg-white/20 rounded-full animate-pulse" />
        <div className="absolute bottom-40 right-20 w-24 h-24 bg-white/10 rounded-full animate-bounce" />
        <div className="absolute top-1/2 right-40 w-16 h-16 bg-blue-400/40 rounded-full animate-ping" />
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          <div className="mb-8">
            <div className="flex items-center mb-6">
              <Image
                src="/img/shield-emp-white.png"
                alt="SecureShare Logo"
                width={50}
                height={50}
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
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-neutral-100">
        <div className="w-full max-w-md">
          <div className="grid grid-cols-2 mb-8 border-b border-gray-300">
            <button
              onClick={() => {
                setTab("login");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`text-center pb-2 font-medium transition-all ${
                tab === "login"
                  ? "text-blue-600 font-bold text-lg border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }`}
              aria-current={tab === "login" ? "page" : undefined}
            >
              Log In
            </button>
            <button
              onClick={() => {
                setTab("signup");
                setMessage(null);
                setFieldErrors({});
              }}
              className={`text-center pb-2 font-medium transition-all ${
                tab === "signup"
                  ? "text-blue-600 font-bold text-lg border-b-2 border-blue-600"
                  : "text-gray-500 hover:text-blue-600"
              }`}
              aria-current={tab === "signup" ? "page" : undefined}
            >
              Sign Up
            </button>
          </div>

          {message && (
            <div
              className={`p-3 rounded-md text-sm mb-4 ${
                message.includes("successful") || message.includes("copied")
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
              role="alert"
            >
              {message}
            </div>
          )}

          {tab === "login" && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Welcome back
                </h2>
                <p className="text-sm text-gray-600">
                  Enter your credentials to access your account.
                </p>
              </div>
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
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    aria-describedby="login-email-error"
                  />
                  {fieldErrors.email && (
                    <p
                      id="login-email-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
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
                      type={showLoginPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={handleChange(setLoginData)}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      aria-describedby="login-password-error"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label={
                        showLoginPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showLoginPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p
                      id="login-password-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                >
                  {isLoading ? "Signing in..." : "Log In"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">Or sign in with</p>
                <button
                  onClick={handleGoogleAuth}
                  className="mt-2 w-full bg-white border border-gray-300 text-gray-800 font-semibold py-2 rounded-md hover:bg-gray-50 transition flex items-center justify-center"
                  disabled={isLoading}
                >
                  <Image
                    src="/img/google-logo.png"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  Sign in with Google
                </button>
              </div>
            </motion.div>
          )}

          {tab === "signup" && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 text-center">
                <h2 className="text-2xl font-semibold text-gray-800">
                  Create an account
                </h2>
                <p className="text-sm text-gray-600">
                  Join SecureShare to start sharing files securely.
                </p>
              </div>
              <form onSubmit={handleSignupSubmit} className="space-y-6">
                <div>
                  <label
                    htmlFor="signup-name"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Name
                  </label>
                  <input
                    id="signup-name"
                    name="name"
                    type="text"
                    value={signupData.name}
                    onChange={handleChange(setSignupData)}
                    required
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    aria-describedby="signup-name-error"
                  />
                  {fieldErrors.name && (
                    <p
                      id="signup-name-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.name}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Email address
                  </label>
                  <input
                    id="signup-email"
                    name="email"
                    type="email"
                    value={signupData.email}
                    onChange={handleChange(setSignupData)}
                    required
                    className="w-full border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    aria-describedby="signup-email-error"
                  />
                  {fieldErrors.email && (
                    <p
                      id="signup-email-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.email}
                    </p>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? "text" : "password"}
                      value={signupData.password}
                      onChange={handleChange(setSignupData)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      aria-describedby="signup-password-error"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label={
                        showSignupPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showSignupPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.password && (
                    <p
                      id="signup-password-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.password}
                    </p>
                  )}
                  {isPasswordFocused && (
                    <div className="mt-2 text-sm text-gray-600">
                      <p>Password must include:</p>
                      <ul className="list-disc pl-5">
                        <li
                          className={
                            passwordRequirements.hasMinLength
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          At least 8 characters
                        </li>
                        <li
                          className={
                            passwordRequirements.hasUppercase
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          An uppercase letter
                        </li>
                        <li
                          className={
                            passwordRequirements.hasLowercase
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          A lowercase letter
                        </li>
                        <li
                          className={
                            passwordRequirements.hasNumber
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          A number
                        </li>
                        <li
                          className={
                            passwordRequirements.hasSpecialChar
                              ? "text-green-600"
                              : "text-red-600"
                          }
                        >
                          A special character (!@#$%^&*)
                        </li>
                      </ul>
                    </div>
                  )}
                </div>
                <div>
                  <label
                    htmlFor="signup-confirm-password"
                    className="block mb-1 font-semibold text-gray-700 text-sm"
                  >
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={handleChange(setSignupData)}
                      required
                      className="w-full border border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                      aria-describedby="signup-confirm-password-error"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      className="absolute inset-y-0 right-0 flex items-center pr-3"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeOff className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p
                      id="signup-confirm-password-error"
                      className="text-red-600 text-sm mt-1"
                    >
                      {fieldErrors.confirmPassword}
                    </p>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-blue-400"
                >
                  {isLoading ? "Creating account..." : "Sign Up"}
                </button>
              </form>
              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">Or sign up with</p>
                <button
                  onClick={handleGoogleAuth}
                  className="mt-2 w-full bg-white border border-gray-300 text-gray-800 font-semibold py-2 rounded-md hover:bg-gray-50 transition flex items-center justify-center"
                  disabled={isLoading}
                >
                  <Image
                    src="/img/google-logo.png"
                    alt="Google"
                    width={20}
                    height={20}
                    className="mr-2"
                  />
                  Sign up with Google
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
