"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/app/dashboard/components/Loader";
import { getSodium } from "@/app/lib/sodium";
import { storeDerivedKeyEncrypted, storeUserKeysSecurely, useEncryptionStore } from "../../SecureKeyStorage";

function VerifyEmailInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [verificationType, setVerificationType] = useState("");
    const [mounted, setMounted] = useState(false);
    const [showMnemonicRecovery, setShowMnemonicRecovery] = useState(false);
    const [currentPassword, setCurrentPassword] = useState("");
    const [mnemonicWords, setMnemonicWords] = useState(Array(10).fill(""));

    useEffect(() => {
        setMounted(true);
        const emailParam = searchParams.get("email");
        const userIdParam = searchParams.get("userId");
        const typeParam = searchParams.get("type") || "signup";

        if (!emailParam || !userIdParam) {
            router.push("/auth?error=missing_verification_params");
            return;
        }

        setEmail(emailParam);
        setUserId(userIdParam);
        setVerificationType(typeParam);
    }, [searchParams, router]);

    const handleMnemonicRecovery = async () => {
        if (mnemonicWords.some(word => !word.trim())) {
            setMessage("Please fill in all 10 mnemonic words");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const token = localStorage.getItem("token");
            if (!token) {
                throw new Error("No authentication token found");
            }

            let newPassword = currentPassword;
            
            const googleLoginData = sessionStorage.getItem("pendingGoogleLogin");
            if (googleLoginData) {
                const { googleUser } = JSON.parse(googleLoginData);
                newPassword = googleUser.id + googleUser.email;
            }

            const response = await fetch("http://localhost:5000/api/users/re-encrypt-vault-keys", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({
                    mnemonicWords: mnemonicWords.map(word => word.trim()),
                    newPassword: newPassword
                })
            });

            const result = await response.json();
            if (!response.ok || !result.success) {
                throw new Error(result.error || "Failed to re-encrypt vault keys");
            }

            setShowMnemonicRecovery(false);
            
            const googleLoginRetry = sessionStorage.getItem("pendingGoogleLogin");
            const loginRetry = sessionStorage.getItem("pendingLogin");
            
            if (googleLoginRetry) {
                await setupUserAuthentication();
            } else if (loginRetry) {
                await handleSubmit({ preventDefault: () => {} });
            }

        } catch (error) {
            console.error("Mnemonic recovery error:", error);
            setMessage(error.message || "Failed to recover vault keys");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!code || code.length !== 6) {
            setMessage("Please enter a valid 6-digit code");
            return;
        }

        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/proxy/auth/verify-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, code }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("Verification successful! Setting up your account...");
                await setupUserAuthentication();
            } else {
                setMessage(data.error || "Verification failed");
            }
        } catch (error) {
            console.error("Verification error:", error);
            setMessage("Verification failed. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const setupUserAuthentication = async () => {
        try {
            if (verificationType === "login") {
                const pendingGoogleLogin = sessionStorage.getItem("pendingGoogleLogin");
                const pendingLogin = sessionStorage.getItem("pendingLogin");
                
                if (pendingGoogleLogin) {
                    const { googleUser, user, keyBundle, token } = JSON.parse(pendingGoogleLogin);
                    
                    if (user.needs_key_reencryption) {
                        console.log("Google login: Vault keys need re-encryption, showing mnemonic recovery");
                        setShowMnemonicRecovery(true);
                        setIsLoading(false);
                        return;
                    }
                    
                    const sodium = await getSodium();
                    
                    const googlePassword = googleUser.id + googleUser.email;
                    const derivedKey = sodium.crypto_pwhash(
                        32,
                        googlePassword,
                        sodium.from_base64(user.salt),
                        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                        sodium.crypto_pwhash_ALG_DEFAULT
                    );

                    const decryptedIkPrivateKeyRaw = sodium.crypto_secretbox_open_easy(
                        sodium.from_base64(keyBundle.ik_private_key),
                        sodium.from_base64(user.nonce),
                        derivedKey
                    );

                    if (!decryptedIkPrivateKeyRaw) {
                        throw new Error("Failed to decrypt identity key private key");
                    }

                    let opks_public_temp;
                    if (typeof user.opks_public === "string") {
                        try {
                            opks_public_temp = JSON.parse(user.opks_public.replace(/\\+/g, ""));
                        } catch (e) {
                            opks_public_temp = user.opks_public.replace(/\\+/g, "").slice(1, -1).split(",");
                        }
                    } else {
                        opks_public_temp = user.opks_public;
                    }

                    const userKeys = {
                        identity_private_key: decryptedIkPrivateKeyRaw,
                        signedpk_private_key: sodium.from_base64(keyBundle.spk_private_key),
                        oneTimepks_private: keyBundle.opks_private.map((opk) => ({
                            opk_id: opk.opk_id,
                            private_key: sodium.from_base64(opk.private_key),
                        })),
                        identity_public_key: sodium.from_base64(user.ik_public),
                        signedpk_public_key: sodium.from_base64(user.spk_public),
                        oneTimepks_public: opks_public_temp.map((opk) => ({
                            opk_id: opk.opk_id,
                            publicKey: sodium.from_base64(opk.publicKey),
                        })),
                        signedPrekeySignature: sodium.from_base64(user.signedPrekeySignature),
                        salt: sodium.from_base64(user.salt),
                        nonce: sodium.from_base64(user.nonce),
                    };

                    // Store keys and session data
                    await storeDerivedKeyEncrypted(derivedKey);
                    sessionStorage.setItem("unlockToken", "session-unlock");
                    await storeUserKeysSecurely(userKeys, derivedKey);

                    useEncryptionStore.getState().setUserId(user.id);
                    useEncryptionStore.setState({
                        encryptionKey: derivedKey,
                        userId: user.id,
                        userKeys: userKeys,
                    });

                    const rawToken = token.replace(/^Bearer\s/, "");
                    localStorage.setItem("token", rawToken);

                    // Clear stored Google login data
                    sessionStorage.removeItem("pendingGoogleLogin");

                    router.push("/dashboard");
                } else if (pendingLogin) {
                    // Handle regular login verification
                    const { email: loginEmail, password } = JSON.parse(pendingLogin);
                    
                    // Store the current password for mnemonic recovery
                    setCurrentPassword(password);

                    // Call login API to get user data and keyBundle
                    const loginResponse = await fetch("/proxy/auth/login", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            email: loginEmail,
                            password: password,
                        }),
                    });

                    const loginResult = await loginResponse.json();
                    if (!loginResponse.ok || !loginResult.success) {
                        throw new Error(loginResult.message || "Login failed");
                    }

                    const {
                        id,
                        salt,
                        nonce,
                        ik_public,
                        spk_public,
                        signedPrekeySignature,
                        opks_public,
                        needs_key_reencryption,
                    } = loginResult.data.user;

                    const { ik_private_key, opks_private, spk_private_key } = loginResult.data.keyBundle;
                    const { token } = loginResult.data;

                    // Set up encryption keys
                    const sodium = await getSodium();

                    // Derived key from password and salt
                    const derivedKey = sodium.crypto_pwhash(
                        32,
                        password,
                        sodium.from_base64(salt),
                        sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                        sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                        sodium.crypto_pwhash_ALG_DEFAULT
                    );

                    // Decrypt identity key
                    let decryptedIkPrivateKeyRaw;
                    try {
                        decryptedIkPrivateKeyRaw = sodium.crypto_secretbox_open_easy(
                            sodium.from_base64(ik_private_key),
                            sodium.from_base64(nonce),
                            derivedKey
                        );
                    } catch (decryptError) {
                        if (needs_key_reencryption) {
                            // Keys are encrypted with old password, need re-encryption
                            console.log("Vault keys need re-encryption, showing mnemonic recovery");
                            setShowMnemonicRecovery(true);
                            setIsLoading(false);
                            return; // Don't proceed with login, show recovery UI
                        } else {
                            throw new Error("Failed to decrypt identity key private key");
                        }
                    }

                    if (!decryptedIkPrivateKeyRaw) {
                        throw new Error("Failed to decrypt identity key private key");
                    }

                    // Decrypt signed prekey
                    let decryptedSpkPrivateKey;
                    try {
                        decryptedSpkPrivateKey = sodium.crypto_secretbox_open_easy(
                            sodium.from_base64(spk_private_key),
                            sodium.from_base64(nonce),
                            derivedKey
                        );
                    } catch (spkDecryptError) {
                        // If SPK decryption fails, assume it's not encrypted (for backward compatibility)
                        console.log("SPK decryption failed, assuming unencrypted:", spkDecryptError.message);
                        decryptedSpkPrivateKey = sodium.from_base64(spk_private_key);
                    }

                    // Decrypt one-time prekeys
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
                            opks_public_temp = opks_public.replace(/\\+/g, "").slice(1, -1).split(",");
                        }
                    } else {
                        opks_public_temp = opks_public;
                    }

                    const userKeys = {
                        identity_private_key: decryptedIkPrivateKeyRaw,
                        signedpk_private_key: decryptedSpkPrivateKey,
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

                    // Store keys and session data
                    await storeDerivedKeyEncrypted(derivedKey);
                    sessionStorage.setItem("unlockToken", "session-unlock");
                    await storeUserKeysSecurely(userKeys, derivedKey);

                    useEncryptionStore.getState().setUserId(id);
                    useEncryptionStore.setState({
                        encryptionKey: derivedKey,
                        userId: id,
                        userKeys: userKeys,
                    });

                    const rawToken = token.replace(/^Bearer\s/, "");
                    localStorage.setItem("token", rawToken);

                    // Clear stored login data
                    sessionStorage.removeItem("pendingLogin");

                    router.push("/dashboard");
                } else {
                    throw new Error("Login data not found. Please try logging in again.");
                }
            } else {
                // Handle signup verification (existing logic)
                const jwtResponse = await fetch("/proxy/auth/generate-jwt", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userId, email }),
                });

                if (jwtResponse.ok) {
                    const { token } = await jwtResponse.json();
                    localStorage.setItem("token", token.replace(/^Bearer\s/, ""));
                    
                    // Check if encryption keys already exist from registration
                    const unlockToken = sessionStorage.getItem("unlockToken");
                    const hasKeys = localStorage.getItem("encryption-store");
                    
                    if (unlockToken && hasKeys) {
                        router.push("/dashboard");
                    } else {
                        router.push("/auth");
                    }
                } else {
                    throw new Error("Failed to complete authentication");
                }
            }
        } catch (error) {
            console.error("Authentication setup error:", error);
            setMessage(
                "Failed to complete authentication. Please try signing in again."
            );
        }
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setMessage("");

        try {
            const response = await fetch("/proxy/auth/send-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, userId, userName: "User" }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("New verification code sent to your email");
            } else {
                setMessage(data.error || "Failed to resend code");
            }
        } catch (error) {
            console.error("Resend error:", error);
            setMessage("Failed to resend code. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleCodeChange = (e) => {
        const value = e.target.value.replace(/\D/g, "");
        if (value.length <= 6) {
            setCode(value);
        }
    };

    if (!mounted) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <Loader message="Loading..." />
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
            <div className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <h2 className="text-3xl font-bold text-gray-900">
                        {showMnemonicRecovery ? "Recover Your Vault Keys" : "Verify Your Email"}
                    </h2>
                    <p className="mt-2 text-gray-600">
                        {showMnemonicRecovery ? 
                            "Your password was changed, but your vault keys are still encrypted with the old password. Please enter your recovery mnemonic words to re-encrypt your keys:" :
                            "We've sent a 6-digit verification code to:"
                        }
                    </p>
                    {!showMnemonicRecovery && <p className="font-semibold text-blue-600">{email}</p>}
                </div>

                {showMnemonicRecovery ? (
                    // Mnemonic Recovery UI
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            {mnemonicWords.map((word, index) => (
                                <div key={index}>
                                    <label className="block text-xs font-medium text-gray-700 mb-1">
                                        Word {index + 1}
                                    </label>
                                    <input
                                        type="text"
                                        value={word}
                                        onChange={(e) => {
                                            const newWords = [...mnemonicWords];
                                            newWords[index] = e.target.value;
                                            setMnemonicWords(newWords);
                                        }}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                        placeholder={`Word ${index + 1}`}
                                        disabled={isLoading}
                                    />
                                </div>
                            ))}
                        </div>

                        {message && (
                            <div className="text-center text-sm text-red-600">
                                {message}
                            </div>
                        )}

                        <button
                            onClick={handleMnemonicRecovery}
                            disabled={isLoading || mnemonicWords.some(word => !word.trim())}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader /> : "Recover Keys"}
                        </button>

                        <div className="text-center">
                            <button
                                onClick={() => setShowMnemonicRecovery(false)}
                                className="text-gray-500 hover:text-gray-700 text-sm"
                            >
                                ← Back to verification
                            </button>
                        </div>
                    </div>
                ) : (
                    // Original Verification Form
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label
                                htmlFor="code"
                                className="block text-sm font-medium text-gray-700"
                            >
                                Verification Code
                            </label>
                            <input
                                id="code"
                                type="text"
                                value={code}
                                onChange={handleCodeChange}
                                placeholder="000000"
                                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm text-black text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                                maxLength={6}
                                autoComplete="one-time-code"
                                disabled={isLoading}
                            />
                        </div>

                        {message && (
                            <div
                                className={`text-center text-sm ${message.includes("successful") || message.includes("sent")
                                        ? "text-green-600"
                                        : "text-red-600"
                                    }`}
                            >
                                {message}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading || code.length !== 6}
                            className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? <Loader /> : "Verify Code"}
                        </button>

                        <div className="text-center">
                            <button
                                type="button"
                                onClick={handleResendCode}
                                disabled={isLoading}
                                className="text-blue-600 hover:text-blue-500 text-sm disabled:opacity-50"
                            >
                                Didn&apos;t receive the code? Resend
                            </button>
                        </div>
                    </form>
                )}

                <div className="text-center">
                    <button
                        onClick={() => router.push("/auth")}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                    >
                        ← Back to sign in
                    </button>
                </div>
            </div>
        </div>
    );
}

export default function VerifyEmailPage() {
    return (
        <Suspense fallback={<Loader message="Loading verification page..." />}>
            <VerifyEmailInner />
        </Suspense>
    );
}