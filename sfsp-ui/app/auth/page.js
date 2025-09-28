"use client";

import React, { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Loader from "@/app/dashboard/components/Loader";
import { getSodium } from "@/app/lib/sodium";
import { EyeClosed, Eye, X, Info, CheckCircle, EyeOff } from 'lucide-react';
import { v4 as uuidv4 } from "uuid";
//import * as sodium from 'libsodium-wrappers-sumo';
import { generateLinearEasing } from "framer-motion";
import {
  useEncryptionStore,
  storeUserKeysSecurely,
  storeDerivedKeyEncrypted,
} from "../SecureKeyStorage";

function getCookie(name) {
  if (typeof window === 'undefined') return '';
  return document.cookie.split("; ").find(c => c.startsWith(name + "="))?.split("=")[1];
}

const csrf = getCookie("csrf_token");


function AuthContent() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [isLoading, setIsLoading] = useState(false);
  const [loaderMessage, setLoaderMessage] = useState("Loading...");
  const [message, setMessage] = useState(null);
  const searchParams = useSearchParams();
  const [fieldErrors, setFieldErrors] = useState({});
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showRecoveryNewPassword, setShowRecoveryNewPassword] = useState(false);
  const [showRecoveryConfirmPassword, setShowRecoveryConfirmPassword] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);
  const [passwordRequirements, setPasswordRequirements] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });
  const [recoveryPasswordRequirements, setRecoveryPasswordRequirements] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  const [loginData, setLoginData] = useState({ email: "", password: "" });
  const [signupData, setSignupData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    agreeToTerms: false,
  });

  // Mnemonic recovery state
  const [showMnemonicRecovery, setShowMnemonicRecovery] = useState(false);
  const [recoveryStep, setRecoveryStep] = useState('email'); // 'email', 'verify', 'change'
  const [recoveryEmail, setRecoveryEmail] = useState('');
  const [recoveryErrors, setRecoveryErrors] = useState({});
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryPasswordData, setRecoveryPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [mnemonicWords, setMnemonicWords] = useState(Array(10).fill(''));
  const [mnemonicErrors, setMnemonicErrors] = useState(Array(10).fill(''));

  // Handle Google OAuth errors from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error) {
      switch (error) {
        case "oauth_error":
          setMessage(
            "Google authentication was cancelled or failed. Please try again."
          );
          break;
        case "oauth_cancelled":
          setMessage("Google authentication was cancelled.");
          break;
        case "missing_code":
          setMessage(
            "Google authentication failed. Missing authorization code."
          );
          break;
        case "code_expired":
          setMessage("Authorization code has expired. Please try again.");
          break;
        case "code_reused":
          setMessage(
            "This authorization code has already been used. Please try again."
          );
          break;
        case "invalid_state":
          setMessage("Invalid authentication state. Please try again.");
          break;
        case "authentication_failed":
          setMessage(
            "Failed to authenticate with our servers. Please try again."
          );
          break;
        case "oauth_init_failed":
          setMessage(
            "Failed to initiate Google authentication. Please check your internet connection."
          );
          break;
        default:
          setMessage(
            "An error occurred during Google authentication. Please try again."
          );
      }

      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, "", newUrl);
    }

    // Clean up any pending Google auth state
    const authInProgress = localStorage.getItem("googleAuthInProgress");
    if (authInProgress) {
      localStorage.removeItem("googleAuthInProgress");
    }
  }, []);

  function handleChange(setter) {
    return (event) => {
      const { name, value } = event.target;
      setter((prev) => ({
        ...prev,
        [name]: value,
      }));

      if (name === "password" && setter === setSignupData) {
        checkPasswordRequirements(value);
      }

      if (fieldErrors[name]) {
        setFieldErrors((prev) => ({
          ...prev,
          [name]: "",
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

  const allPasswordRequirementsMet = Object.values(passwordRequirements).every(
    (req) => req
  );

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setLoaderMessage("Signing you in...");
    setMessage(null);

    console.log(loginData.email);
    console.log(loginData.password);

    try {
      const sodium = await getSodium();
      const res = await fetch("/proxy/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginData.email,
          password: loginData.password,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Login failed: ${res.status} - ${errorText}`);
        throw new Error(`Login failed: ${res.status}`);
      }

      const result = await res.json();
      console.log(result);
      if (!result.success) {
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
        const sendCodeResponse = await fetch("http://localhost:3000/proxy/auth/send-verification", {
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
          console.error("Failed to send verification code");
        }
      } catch (error) {
        console.error("Error sending verification code:", error);
      }
      
      setTimeout(() => {
        router.push(`/auth/verify-email?email=${encodeURIComponent(loginData.email)}&userId=${id}&type=login`);
      }, 1500);

      //we don't need to securely store the user ID but I will store it in the Zustand store for easy access
      useEncryptionStore.getState().setUserId(id);

      //derived key from password and salt
      const derivedKey = sodium.crypto_pwhash(
        32, // key length
        loginData.password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );

      // Decrypt vault keys (they are encrypted with the password-derived key)
      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ik_private_key),
        sodium.from_base64(nonce),
        derivedKey
      );

      let decryptedSpkPrivateKey;
      try {
        decryptedSpkPrivateKey = sodium.crypto_secretbox_open_easy(
          sodium.from_base64(spk_private_key),
          sodium.from_base64(nonce),
          derivedKey
        );
      } catch (spkError) {
        // If SPK decryption fails, assume it's not encrypted (for backward compatibility)
        console.log("SPK decryption failed, assuming unencrypted:", spkError.message);
        decryptedSpkPrivateKey = sodium.from_base64(spk_private_key);
      }

      const decryptedOpksPrivate = opks_private.map((opk) => ({
        opk_id: opk.opk_id,
        private_key: sodium.crypto_secretbox_open_easy(
          sodium.from_base64(opk.private_key),
          sodium.from_base64(nonce),
          derivedKey
        ),
      }));

      let opks_public_temp;
      if (typeof opks_public === "string") {
        try {
          opks_public_temp = JSON.parse(opks_public.replace(/\\+/g, ""));
        } catch (e) {
          opks_public_temp = opks_public
            .replace(/\\+/g, "")
            .slice(1, -1)
            .split(",");
        }
      } else {
        opks_public_temp = opks_public;
      }

      const userKeys = {
        identity_private_key: decryptedIkPrivateKey,
        signedpk_private_key: sodium.from_base64(spk_private_key),
        oneTimepks_private: decryptedOpksPrivate,
        identity_public_key: sodium.from_base64(ik_public),
        signedpk_public_key: sodium.from_base64(spk_public),
        oneTimepks_public: opks_public_temp.map((opk) => ({
          opk_id: opk.opk_id,
          publicKey: sodium.from_base64(opk.publicKey),
        })),
        signedPrekeySignature: sodium.from_base64(signedPrekeySignature),
        salt: sodium.from_base64(salt),
        nonce: sodium.from_base64(nonce),
      };

      console.log("User keys decrypted from vault successfully:", userKeys);

      await storeDerivedKeyEncrypted(derivedKey); 
      sessionStorage.setItem("unlockToken", "session-unlock");
      await storeUserKeysSecurely(userKeys, derivedKey);

      useEncryptionStore.setState({
        encryptionKey: derivedKey,
        userId: id,
        userKeys: userKeys,
      });

      console.log("User keys stored successfully:", userKeys);
      
      const nextPath = searchParams.get('next') || '/dashboard';
      const safeNext = nextPath.startsWith('/') ? nextPath : '/dashboard';

      console.log('Next parameter:', nextPath);
      console.log('Decoded:', decodeURIComponent(nextPath || ''));
      console.log('About to redirect to:', safeNext);
      setMessage("Login successful!");
      setTimeout(() => {
        console.log('Executing redirect now...');
        router.push(safeNext);
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
      } = await GenerateX3DHKeys(password);

      const res = await fetch("/proxy/auth/register", {
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

      if (!res.ok) {
        const errorText = await res.text();
        console.error(`Registration failed: ${res.status} - ${errorText}`);
        throw new Error(`Registration failed: ${res.status}`);
      }

      const result = await res.json();
      if (!result.success) {
        throw new Error(result.message || "Registration failed");
      }

      const {user } = result.data;

      // Generate derived key and prepare user keys regardless of verification status
      const derivedKey = sodium.crypto_pwhash(
        32,
        password,
        sodium.from_base64(salt),
        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
        sodium.crypto_pwhash_ALG_DEFAULT
      );
      console.log("Start signup");
      console.log("Derived key is: ", derivedKey);

      // Decrypt identity key for storage
      const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
        sodium.from_base64(ik_private_key),
        sodium.from_base64(nonce),
        derivedKey
      );
      if (!decryptedIkPrivateKey) {
        throw new Error("Failed to decrypt identity key private key");
      }

      console.log("Decrypted ik private is: ", decryptedIkPrivateKey);

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

      console.log("User keys stored successfully:", userKeys);

      if (!user.is_verified) {
        setLoaderMessage(
          "Account created! Please check your email for verification..."
        );

        // Add user to PostgreSQL database before redirecting to verification
        try {
          const addUserRes = await fetch(
            "/proxy/user/addUser",
            {
              method: "POST",
              headers: { "Content-Type": "application/json"},
              body: JSON.stringify({
                userId: user.id,
              }),
            }
          );

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
          router.push(
            `/auth/verify-email?email=${encodeURIComponent(
              user.email
            )}&userId=${user.id}`
          );
        }, 1500);
        return;
      }

    
      try {
        const addUserRes = await fetch(
          "/proxy/user/addUser",
          {
            method: "POST",
            headers: { "Content-Type": "application/json"},
            body: JSON.stringify({
              userId: user.id,
            }),
          }
        );

        if (!addUserRes.ok) {
          const errorText = await addUserRes.text();
          console.error("Failed to add user to PostgreSQL database:", errorText);
        } else {
          console.log("User successfully added to PostgreSQL database");
        }
      } catch (error) {
        console.error("Error adding user to PostgreSQL database:", error);
      }

      const nextPath = searchParams.get('next') || '/dashboard';
      const safeNext = nextPath.startsWith('/') ? nextPath : '/dashboard';

      setTimeout(() => {
        router.push(safeNext);
      }, 1000);
    } catch (err) {
      console.error("Signup error:", err);
      setMessage(err.message || "Something went wrong. Please try again.");
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
      const redirectUri = `${window.location.origin}/auth/google/callback`;
      const scope = 'openid email profile';
      
      const state = crypto.randomUUID();
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

      window.location.href = authUrl;
    } catch (error) {
      console.error("Google OAuth error:", error);
      setMessage("Failed to initiate Google authentication. Please try again.");
      setIsLoading(false);
      localStorage.removeItem("googleAuthInProgress");
    }
  };

  const handleRecoveryEmailSubmit = async () => {
    if (!recoveryEmail.trim()) {
      setRecoveryErrors({ email: 'Email is required' });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recoveryEmail)) {
      setRecoveryErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);
    setRecoveryMessage('');
    setRecoveryErrors({});

    try {
      // First check if this is a Google account
      const checkResponse = await fetch(`${API_BASE_URL}/check-google-account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: recoveryEmail }),
      });
      
      if (checkResponse.ok) {
        const checkData = await checkResponse.json();
        
        if (checkData.isGoogleAccount) {
          setRecoveryMessage(
            'This email is linked to a Google account. Please use Google\'s account recovery to reset your password. ' +
            'You can visit Google account recovery by clicking ' +
            '<a href="https://accounts.google.com/signin/recovery" target="_blank" rel="noopener noreferrer" class="text-blue-500 underline">here</a>.'
          );
          setIsLoading(false);
          return;
        }
      }
      
      // Continue with regular password recovery if not a Google account
      const response = await fetch(`${API_BASE_URL}/getUserId/${encodeURIComponent(recoveryEmail)}`, {
        method: 'GET',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data && data.data.userId) {
          setRecoveryStep('verify');
          setRecoveryMessage('Email verified successfully. Please enter your recovery words.');
        } else {
          setRecoveryErrors({ email: 'No account found with this email address' });
        }
      } else {
        setRecoveryErrors({ email: 'Failed to verify email. Please try again.' });
      }
    } catch (error) {
      console.error('Email verification error:', error);
      setRecoveryErrors({ email: 'Failed to verify email. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMnemonicWordChange = (index, value) => {
    const newWords = [...mnemonicWords];
    newWords[index] = value.trim();
    setMnemonicWords(newWords);

    if (mnemonicErrors[index]) {
      const newErrors = [...mnemonicErrors];
      newErrors[index] = '';
      setMnemonicErrors(newErrors);
    }
  };

  const handleVerifyMnemonic = async () => {
    const errors = Array(10).fill('');
    let hasErrors = false;

    mnemonicWords.forEach((word, index) => {
      if (!word.trim()) {
        errors[index] = 'Required';
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setMnemonicErrors(errors);
      return;
    }

    setIsLoading(true);
    setRecoveryMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/verify-mnemonic-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recoveryEmail,
          mnemonicWords: mnemonicWords,
        }),
      });

      if (response.ok) {
        setRecoveryStep('change');
        setRecoveryMessage('Mnemonic verified successfully! Please set your new password.');
      } else {
        const errorData = await response.json();
        setRecoveryMessage(errorData.message || 'Invalid mnemonic words. Please try again.');
      }
    } catch (error) {
      console.error('Mnemonic verification error:', error);
      setRecoveryMessage('Failed to verify mnemonic. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRecoveryPasswordInputChange = (field, value) => {
    setRecoveryPasswordData((prev) => ({ ...prev, [field]: value }));
    if (recoveryErrors[field]) {
      setRecoveryErrors((prev) => ({ ...prev, [field]: '' }));
    }
    
    if (field === 'newPassword') {
      const requirements = {
        hasMinLength: value.length >= 8,
        hasUppercase: /[A-Z]/.test(value),
        hasLowercase: /[a-z]/.test(value),
        hasNumber: /\d/.test(value),
        hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value),
      };
      setRecoveryPasswordRequirements(requirements);
    }
  };

  const handleRecoveryPasswordChange = async () => {
    if (!recoveryPasswordData.newPassword) {
      setRecoveryErrors({ newPassword: 'New password is required' });
      return;
    }

    if (!recoveryPasswordData.confirmPassword) {
      setRecoveryErrors({ confirmPassword: 'Please confirm your password' });
      return;
    }

    if (recoveryPasswordData.newPassword !== recoveryPasswordData.confirmPassword) {
      setRecoveryErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);
    setRecoveryMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/change-password-with-mnemonic-recovery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: recoveryEmail,
          mnemonicWords: mnemonicWords,
          newPassword: recoveryPasswordData.newPassword,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setRecoveryMessage(`Password changed successfully! Your new recovery mnemonic is: ${data.newMnemonicWords.join(' ')}`);
        
        setTimeout(() => {
          setShowMnemonicRecovery(false);
          setRecoveryStep('verify');
          setMnemonicWords(Array(10).fill(''));
          setMnemonicErrors(Array(10).fill(''));
          setRecoveryPasswordData({ newPassword: '', confirmPassword: '' });
        }, 5000);
      } else {
        const errorData = await response.json();
        setRecoveryMessage(errorData.message || 'Failed to change password. Please try again.');
      }
    } catch (error) {
      console.error('Password change error:', error);
      setRecoveryMessage('Failed to change password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  function setError(msg) {
    setMessage(msg);
    setIsLoading(false);
  }

  async function GenerateX3DHKeys(password) {
    const sodium = await getSodium();

    const ik = sodium.crypto_sign_keypair();
    const spk = sodium.crypto_sign_keypair();

    console.log("Start key generation");
    console.log("IK private", ik.privateKey);
    console.log("IK public", ik.publicKey);
    console.log("SPK private", spk.privateKey);
    console.log("SPK public", spk.publicKey);

    const spkSignature = sodium.crypto_sign_detached(
      spk.publicKey,
      ik.privateKey
    );

    const opks = Array.from({ length: 10 }, () => ({
      opk_id: crypto.randomUUID(),
      keypair: sodium.crypto_box_keypair(),
    }));

    const salt = sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);
    console.log("Salt is: ", salt);
    const derivedKey = sodium.crypto_pwhash(
      32,
      password,
      salt,
      sodium.crypto_pwhash_OPSLIMIT_MODERATE,
      sodium.crypto_pwhash_MEMLIMIT_MODERATE,
      sodium.crypto_pwhash_ALG_DEFAULT
    );

    console.log("Derivedkey is: ", derivedKey);

    const nonce = sodium.randombytes_buf(sodium.crypto_secretbox_NONCEBYTES);
    console.log("Nonce is:", nonce);
    const encryptedIK = sodium.crypto_secretbox_easy(
      ik.privateKey,
      nonce,
      derivedKey
    );

    console.log("encrypted ik is: ", encryptedIK);

    const encryptedOPKs = opks.map((opk) => ({
      opk_id: opk.opk_id,
      private_key: sodium.to_base64(
        sodium.crypto_secretbox_easy(opk.keypair.privateKey, nonce, derivedKey)
      ),
    }));

    console.log("encrypted opks are: ", encryptedOPKs);

    console.log("SPK pub (raw):", spk.publicKey);
    console.log("IK pub (Ed25519):", ik.publicKey);
    console.log("SPK Signature:", spkSignature);
    console.log("End key generation");

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
                setFieldErrors({});
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
                  <div className="relative">
                    <input
                      id="login-password"
                      name="password"
                      type={showLoginPassword ? "text" : "password"}
                      value={loginData.password}
                      onChange={handleChange(setLoginData)}
                      required
                      className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMnemonicRecovery(true);
                      setRecoveryStep('email');
                      setRecoveryEmail('');
                      setRecoveryErrors({});
                      setRecoveryMessage('');
                      setMnemonicWords(Array(10).fill(''));
                      setMnemonicErrors(Array(10).fill(''));
                      setRecoveryPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    Forgot password?
                  </button>
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
                    className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      fieldErrors.name ? "border-red-500" : ""
                    }`}
                  />
                  {fieldErrors.name && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.name}
                    </p>
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
                    className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                      fieldErrors.email ? "border-red-500" : ""
                    }`}
                  />
                  {fieldErrors.email && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.email}
                    </p>
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
                      type={showSignupPassword ? "text" : "password"}
                      value={signupData.password}
                      onChange={handleChange(setSignupData)}
                      onFocus={() => setIsPasswordFocused(true)}
                      onBlur={() => setIsPasswordFocused(false)}
                      required
                      className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        fieldErrors.password ? "border-red-500" : ""
                      }`}
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
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>

                  {/* Password Requirements Checklist */}
                  {isPasswordFocused && signupData.password && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-100 rounded-md border">
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Password Requirements:
                      </p>
                      <div className="space-y-1">
                        <div
                          className={`flex items-center text-sm ${
                            passwordRequirements.hasMinLength
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              passwordRequirements.hasMinLength
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {passwordRequirements.hasMinLength && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          At least 8 characters
                        </div>
                        <div
                          className={`flex items-center text-sm ${
                            passwordRequirements.hasUppercase
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              passwordRequirements.hasUppercase
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {passwordRequirements.hasUppercase && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          At least one uppercase letter
                        </div>
                        <div
                          className={`flex items-center text-sm ${
                            passwordRequirements.hasLowercase
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              passwordRequirements.hasLowercase
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {passwordRequirements.hasLowercase && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          At least lowercase letter
                        </div>
                        <div
                          className={`flex items-center text-sm ${
                            passwordRequirements.hasNumber
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              passwordRequirements.hasNumber
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {passwordRequirements.hasNumber && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          At least one number
                        </div>
                        <div
                          className={`flex items-center text-sm ${
                            passwordRequirements.hasSpecialChar
                              ? "text-green-600"
                              : "text-gray-500"
                          }`}
                        >
                          <div
                            className={`w-4 h-4 rounded-full mr-2 flex items-center justify-center ${
                              passwordRequirements.hasSpecialChar
                                ? "bg-green-500"
                                : "bg-gray-300"
                            }`}
                          >
                            {passwordRequirements.hasSpecialChar && (
                              <span className="text-white text-xs">✓</span>
                            )}
                          </div>
                          At least one special character (!@#$%^&*)
                        </div>
                      </div>
                    </div>
                  )}

                  {fieldErrors.password && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.password}
                    </p>
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
                      type={showConfirmPassword ? "text" : "password"}
                      value={signupData.confirmPassword}
                      onChange={handleChange(setSignupData)}
                      disabled={!allPasswordRequirementsMet}
                      required
                      className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${
                        fieldErrors.confirmPassword ? "border-red-500" : ""
                      } ${
                        !allPasswordRequirementsMet
                          ? "bg-gray-100 cursor-not-allowed opacity-50"
                          : ""
                      }`}
                      placeholder={
                        !allPasswordRequirementsMet ? "Enter password" : ""
                      }
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(!showConfirmPassword)
                      }
                      disabled={!allPasswordRequirementsMet}
                      className={`absolute inset-y-0 right-0 flex items-center pr-3 ${
                        !allPasswordRequirementsMet
                          ? "opacity-50 cursor-not-allowed"
                          : ""
                      }`}
                      aria-label={
                        showConfirmPassword
                          ? "Hide confirm password"
                          : "Show confirm password"
                      }
                    >
                      {showConfirmPassword ? (
                        <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      ) : (
                        <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                      )}
                    </button>
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-red-500 text-sm mt-1">
                      {fieldErrors.confirmPassword}
                    </p>
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
                <div className="flex items-center my-4">
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                  <span className="mx-2 text-gray-500 text-sm">or</span>
                  <hr className="flex-grow border-t dark:border-gray-400 border-gray-300" />
                </div>

                {/* Google Sign Up button */}
                <button
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
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Mnemonic Recovery Modal */}
      {showMnemonicRecovery && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-20 backdrop-blur-lg flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {recoveryStep === 'email' ? 'Reset Password' : 
                 recoveryStep === 'verify' ? 'Verify Recovery Words' : 'Set New Password'}
              </h3>
              <button
                onClick={() => setShowMnemonicRecovery(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X size={24} />
              </button>
            </div>

            {recoveryMessage && (
              <div className={`p-3 rounded-md text-sm mb-4 ${
                recoveryMessage.includes('successfully')
                  ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
                  : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
              }`}
              dangerouslySetInnerHTML={{ __html: recoveryMessage }}>
              </div>
            )}

            {recoveryStep === 'email' ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter your email address to start the password recovery process.
                </p>
                <div className="space-y-3">
                  <div>
                    <input
                      type="email"
                      value={recoveryEmail}
                      onChange={(e) => setRecoveryEmail(e.target.value)}
                      placeholder="Enter your email address"
                      className={`w-full border rounded-md px-3 py-2 ${
                        recoveryErrors.email
                          ? 'border-red-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    {recoveryErrors.email && (
                      <p className="text-red-500 text-xs mt-1">{recoveryErrors.email}</p>
                    )}
                  </div>
                </div>
                <button
                  onClick={handleRecoveryEmailSubmit}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-4"
                >
                  {isLoading ? 'Verifying Email...' : 'Continue'}
                </button>
              </div>
            ) : recoveryStep === 'verify' ? (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Enter your 10 recovery words in order to reset your password.
                </p>
                <div className="grid grid-cols-2 gap-2 mb-4">
                  {mnemonicWords.map((word, index) => (
                    <div key={index}>
                      <input
                        type="text"
                        value={word}
                        onChange={(e) => handleMnemonicWordChange(index, e.target.value)}
                        placeholder={`Word ${index + 1}`}
                        className={`w-full border rounded-md px-3 py-2 text-sm ${
                          mnemonicErrors[index]
                            ? 'border-red-500'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {mnemonicErrors[index] && (
                        <p className="text-red-500 text-xs mt-1">{mnemonicErrors[index]}</p>
                      )}
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleVerifyMnemonic}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {isLoading ? 'Verifying...' : 'Verify Words'}
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                  Set your new password.
                </p>
                <div className="space-y-3">
                  <div>
                    <div className="relative">
                      <input
                        type={showRecoveryNewPassword ? "text" : "password"}
                        value={recoveryPasswordData.newPassword}
                        onChange={(e) => handleRecoveryPasswordInputChange('newPassword', e.target.value)}
                        placeholder="New password"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryNewPassword(!showRecoveryNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showRecoveryNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {recoveryErrors.newPassword && (
                      <p className="text-red-500 text-xs mt-1">{recoveryErrors.newPassword}</p>
                    )}
                  </div>
                  <div>
                    <div className="relative">
                      <input
                        type={showRecoveryConfirmPassword ? "text" : "password"}
                        value={recoveryPasswordData.confirmPassword}
                        onChange={(e) => handleRecoveryPasswordInputChange('confirmPassword', e.target.value)}
                        placeholder="Confirm new password"
                        className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRecoveryConfirmPassword(!showRecoveryConfirmPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        {showRecoveryConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                    {recoveryErrors.confirmPassword && (
                      <p className="text-red-500 text-xs mt-1">{recoveryErrors.confirmPassword}</p>
                    )}
                  </div>
                </div>
                
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
                  <div className="flex items-start space-x-2">
                    <Info size={16} className="text-blue-600 dark:text-blue-400 mt-0.5" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <span className="font-medium">Password Requirements:</span>
                      <ul className="mt-2 space-y-1">
                        <li className={`flex items-center space-x-2 ${recoveryPasswordRequirements.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CheckCircle size={14} className={recoveryPasswordRequirements.hasMinLength ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                          <span>At least 8 characters long</span>
                        </li>
                        <li className={`flex items-center space-x-2 ${recoveryPasswordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CheckCircle size={14} className={recoveryPasswordRequirements.hasUppercase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                          <span>Include uppercase letter</span>
                        </li>
                        <li className={`flex items-center space-x-2 ${recoveryPasswordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CheckCircle size={14} className={recoveryPasswordRequirements.hasLowercase ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                          <span>Include lowercase letter</span>
                        </li>
                        <li className={`flex items-center space-x-2 ${recoveryPasswordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CheckCircle size={14} className={recoveryPasswordRequirements.hasNumber ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                          <span>Include at least one number</span>
                        </li>
                        <li className={`flex items-center space-x-2 ${recoveryPasswordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-400'}`}>
                          <CheckCircle size={14} className={recoveryPasswordRequirements.hasSpecialChar ? 'text-green-600 dark:text-green-400' : 'text-gray-400'} />
                          <span>Include special character</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
                
                <button
                  onClick={handleRecoveryPasswordChange}
                  disabled={isLoading}
                  className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 mt-4"
                >
                  {isLoading ? 'Changing Password...' : 'Change Password'}
                </button>
              </div>
            )}
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

export default function AuthPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <AuthContent />
    </Suspense>
  );
}
