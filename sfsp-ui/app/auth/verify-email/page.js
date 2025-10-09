"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/app/dashboard/components/Loader";
import Image from "next/image";

function VerifyEmailInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [mounted, setMounted] = useState(false);
    const [isLoginVerification, setIsLoginVerification] = useState(false);
    const [redirectUrl, setRedirectUrl] = useState('/dashboard');
    const [toast, setToast] = useState({ message: "", type: "" });

    useEffect(() => {
        setMounted(true);
        const emailParam = searchParams.get("email");
        const userIdParam = searchParams.get("userId");
        const redirectParam = searchParams.get("redirect");

        if (!emailParam || !userIdParam) {
            router.push("/auth?error=missing_verification_params");
            return;
        }

        setEmail(emailParam);
        setUserId(userIdParam);
        setRedirectUrl(redirectParam || '/dashboard');

        // Check if this is a login verification
        const pendingLogin = sessionStorage.getItem("pendingLogin");
        setIsLoginVerification(!!pendingLogin);
    }, [searchParams, router]);

    const showToast = (message, type = "error", duration = 3000) => {
        setToast({ message, type });
        setTimeout(() => setToast({ message: "", type: "" }), duration);
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
            const response = await fetch("/api/auth/verify-code", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ userId, code }),
            });

            const data = await response.json();

            if (response.ok) {
                setMessage("Verification successful! Setting up your account...");
                showToast("Verification successful!", "success");
                await setupUserAuthentication();
            } else {
                // setMessage(data.error || "Verification failed");
                showToast(data.error || "Verification failed", "error");
            }
        } catch (error) {
            console.error("Verification error:", error);
            setMessage("Verification failed. Please try again.");
            showToast("Verification failed. Please try again.", "error");
        } finally {
            setIsLoading(false);
        }
    };

    const setupUserAuthentication = async () => {
        try {
            // Check if this is a login verification
            const pendingLogin = sessionStorage.getItem("pendingLogin");

            if (pendingLogin) {
                // This is a login verification - complete the login process
                await completeLoginAuthentication(JSON.parse(pendingLogin));
            } else {
                // This is a signup verification - generate JWT and proceed
                const jwtResponse = await fetch("/api/auth/generate-jwt", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({ userId, email }),
                });

                if (jwtResponse.ok) {
                    const { token } = await jwtResponse.json();
                    localStorage.setItem("token", token.replace(/^Bearer\s/, ""));

                    // Clear the pending verification flag
                    sessionStorage.removeItem("pendingVerification");

                    // Check if encryption keys already exist from registration
                    const unlockToken = sessionStorage.getItem("unlockToken");
                    const hasKeys = localStorage.getItem("encryption-store");

                    if (unlockToken && hasKeys) {
                        router.push(redirectUrl);
                    } else {
                        router.push("/auth");
                    }
                } else {
                    throw new Error("Failed to complete authentication");
                }
            }
        } catch (error) {
            console.error("Authentication setup error:", error);
            // setMessage("Failed to complete authentication. Please try signing in again." );
            showToast("Failed to complete authentication. Please try signing in again.", "error");
        }
    };

    const completeLoginAuthentication = async (loginData) => {
        try {
            const sodium = await import("@/app/lib/sodium").then(m => m.getSodium());
            const { getApiUrl } = await import("@/lib/api-config");
            const {
                useEncryptionStore,
                storeUserKeysSecurely,
                storeDerivedKeyEncrypted
            } = await import("@/app/SecureKeyStorage");

            setMessage("Completing authentication...");

            // Re-authenticate to get user data
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
                throw new Error(result.message || "Authentication failed");
            }

            const {
                id,
                salt,
                nonce,
                ik_public,
                spk_public,
                signedPrekeySignature,
                opks_public,
            } = result.data.user;

            const { ik_private_key, opks_private, spk_private_key } = result.data.keyBundle;
            const { token } = result.data;

            // Derive key and decrypt user keys
            const derivedKey = sodium.crypto_pwhash(
                32,
                loginData.password,
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

            let decryptedSpkPrivateKey;
            try {
                decryptedSpkPrivateKey = sodium.crypto_secretbox_open_easy(
                    sodium.from_base64(spk_private_key),
                    sodium.from_base64(nonce),
                    derivedKey
                );
            } catch (spkError) {
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
                    opks_public_temp = opks_public.replace(/\\+/g, "").slice(1, -1).split(",");
                }
            } else {
                opks_public_temp = opks_public;
            }

            const userKeys = {
                identity_private_key: decryptedIkPrivateKey,
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

            // Store keys and tokens
            await storeDerivedKeyEncrypted(derivedKey);
            sessionStorage.setItem("unlockToken", "session-unlock");
            await storeUserKeysSecurely(userKeys, derivedKey);

            useEncryptionStore.setState({
                encryptionKey: derivedKey,
                userId: id,
                userKeys: userKeys,
            });

            const rawToken = token.replace(/^Bearer\s/, "");
            localStorage.setItem("token", rawToken);

            // Clean up pending login data
            sessionStorage.removeItem("pendingLogin");

            setMessage("Login successful! Redirecting...");
            showToast("Login successful! ", "success");

            setTimeout(() => {
                router.push(redirectUrl);
            }, 1000);

        } catch (error) {
            console.error("Login completion error:", error);
            setMessage("Failed to complete login. Please try again.");
            showToast("Failed to complete login. Please try again.", "error");
        }
    };

    const handleResendCode = async () => {
        setIsLoading(true);
        setMessage("");

        try {
            // Check if this is a login verification
            const pendingLogin = sessionStorage.getItem("pendingLogin");
            const type = pendingLogin ? "login_verify" : "email_verification";

            const response = await fetch("/api/auth/send-verification", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ email, userId, userName: "User", type }),
            });

            const data = await response.json();

            if (response.ok) {
                // setMessage("New verification code sent to your email");
                showToast("New verification code sent to your email", "success");
            } else {
                // setMessage(data.error || "Failed to resend code");
                showToast(data.error || "Failed to resend code", "error");
            }
        } catch (error) {
            console.error("Resend error:", error);
            // setMessage("Failed to resend code. Please try again.");
            showToast("Failed to resend code. Please try again.", "error");
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
        <div className="min-h-screen bg-white flex">
            {/* <div className="min-h-screen bg-white flex items-center justify-center"> */}

            {/* left panel */}
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

            {/* right panel */}
            {/* <div className="max-w-md w-full space-y-8 p-8"> */}
            <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-neutral-100 dark:bg-gray-300">
                <div>
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">
                            {isLoginVerification ? "Verify Your Sign-In" : "Verify Your Email"}
                        </h2>
                        <p className="mt-2 text-gray-600">
                            {isLoginVerification
                                ? "For your security, we've sent a verification code to:"
                                : "We've sent a 6-digit verification code to:"
                            }
                        </p>
                        <p className="font-semibold text-blue-600 pb-4">{email}</p>
                    </div>

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
                                className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm text-black text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
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