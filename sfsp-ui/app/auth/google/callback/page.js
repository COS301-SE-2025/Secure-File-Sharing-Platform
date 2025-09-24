"use client";

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSodium } from "@/app/lib/sodium";
import { useEncryptionStore, storeUserKeysSecurely, storeDerivedKeyEncrypted,} from "../../../SecureKeyStorage";
import Loader from '@/app/dashboard/components/Loader';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [loaderMessage, setLoaderMessage] = useState("Processing Google authentication...");

    useEffect(() => {
        const handleCallback = async () => {
        try {
            if (typeof window === "undefined") return;

            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get("code");
            const state = urlParams.get("state");
            const error = urlParams.get("error");
            const storedState = sessionStorage.getItem("googleOAuthState");

            if (error === "access_denied") {
            router.push("/auth?error=oauth_cancelled");
            return;
            }

            if (error) {
            router.push(`/auth?error=oauth_error`);
            return;
            }

            if (!code) {
            router.push("/auth?error=no_code");
            return;
            }

            if (state !== storedState) {
            router.push("/auth?error=invalid_state");
            return;
            }

            sessionStorage.removeItem("googleOAuthState");

            const response = await fetch(`/api/auth/google?code=${code}`);
            const data = await response.json();

            if (!response.ok) {
            router.push("/auth?error=google_auth_failed");
            return;
            }

            const googleUser = data.user;

            console.log('Checking if user exists for email:', googleUser.email);
            
            try {
            const userExistsResponse = await fetch(`/api/user/getUserId${googleUser.email}`);
            console.log('User existence check response status:', userExistsResponse.status);
            
            if (userExistsResponse.ok) {
                const userIdData = await userExistsResponse.json();
                console.log('User exists, handling login:', userIdData);
                await handleExistingUserLogin(googleUser, userIdData.data.userId);
            } else if (userExistsResponse.status === 404) {
                console.log('User does not exist, handling registration');
                await handleNewUserRegistration(googleUser);
            } else {
                const errorText = await userExistsResponse.text();
                console.error('Unexpected error checking user existence:', userExistsResponse.status, errorText);
                throw new Error(`Failed to check user existence: ${userExistsResponse.status} ${errorText}`);
            }
            } catch (fetchError) {
            console.error('Network error checking user existence:', fetchError);
            console.log('Backend seems unreachable, defaulting to registration flow');
            setLoaderMessage("Setting up your account...");
            await handleNewUserRegistration(googleUser);
            }
        } catch (error) {
            console.error("Google callback error:", error);
            router.push("/auth?error=callback_failed");
        }
        };

        handleCallback();
    }, [router]);

    const handleExistingUserLogin = async (googleUser, userId) => {
        try {
        setLoaderMessage("Signing you in...");

        const loginResponse = await fetch("http://localhost:5000/api/users/google-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            google_id: googleUser.id,
            }),
        });

        const loginResult = await loginResponse.json();

        if (!loginResponse.ok || !loginResult.success) {
            throw new Error(loginResult.message || "Login failed");
        }

        const { user, keyBundle, token, isNewUser } = loginResult.data;
        
        // For new users, verification email is already sent by backend
        // For existing users, we need to send it from the frontend
        if (isNewUser) {
            setLoaderMessage("Account created! Please check your email for verification...");
            
            // For new users, just redirect to verification page without sending another email
            // (Backend already sent the verification code)
            setTimeout(() => {
                router.push(`/auth/verify-email?email=${encodeURIComponent(googleUser.email)}&userId=${user.id}`);
            }, 1500);
            return;
        }
        
        // For existing users, send verification code
        setLoaderMessage("Sending verification code...");
        
        // Store Google login data temporarily for verification
        sessionStorage.setItem("pendingGoogleLogin", JSON.stringify({
            googleUser,
            user,
            keyBundle,
            token
        }));
        
        // Send verification code before redirecting
        try {
            const sendCodeResponse = await fetch("http://localhost:3000/api/auth/send-verification", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: googleUser.email,
                    userId: user.id,
                    userName: googleUser.name || "User",
                    type: "google_login"
                }),
            });
            
            if (!sendCodeResponse.ok) {
                console.error("Failed to send verification code");
            }
        } catch (error) {
            console.error("Error sending verification code:", error);
        }
        
        setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(googleUser.email)}&userId=${user.id}&type=login`);
        }, 1500);
        return;

        if (!token) {
            throw new Error("No authentication token received");
        }
        
        if (!keyBundle || !keyBundle.ik_private_key) {
            throw new Error("Failed to retrieve user keys from vault");
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

        await storeDerivedKeyEncrypted(derivedKey);
        sessionStorage.setItem("unlockToken", "session-unlock");
        await storeUserKeysSecurely(userKeys, derivedKey);

        useEncryptionStore.setState({
            encryptionKey: derivedKey,
            userId: user.id,
            userKeys: userKeys,
        });

        const rawToken = token.replace(/^Bearer\s/, "");
        localStorage.setItem("token", rawToken);

        // Add user to the PostgreSQL database using the route for addUser in file routes
        try {
            const addUserRes = await fetch("/api/user/addUser", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                userId: user.id,
                }),
            });

            if (!addUserRes.ok) {
                console.error("Failed to add user to PostgreSQL database");
            } else {
                console.log("User successfully added to PostgreSQL database");
            }
        } catch (error) {
            console.error("Error adding user to PostgreSQL database:", error);
        }

        router.push("/dashboard");
        } catch (error) {
        console.error("Existing user login error:", error);
        router.push(`/auth?error=authentication_failed`);
        }
    };

    const handleNewUserRegistration = async (googleUser) => {
        try {
        setLoaderMessage("Setting up your secure account...");

        const sodium = await getSodium();
        
        const googlePassword = googleUser.id + googleUser.email;
        
        const keyBundle = await GenerateX3DHKeys(googlePassword);

        setLoaderMessage("Registering your account...");

        const registrationResponse = await fetch("http://localhost:5000/api/users/google-auth", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
            email: googleUser.email,
            name: googleUser.name,
            picture: googleUser.picture,
            google_id: googleUser.id,
            keyBundle: keyBundle,
            }),
        });

        const registrationResult = await registrationResponse.json();

        if (!registrationResponse.ok || !registrationResult.success) {
            throw new Error(registrationResult.message || "Registration failed");
        }

        const { user, isNewUser } = registrationResult.data;

        if (isNewUser) {
            // Store encryption keys locally for new Google OAuth users
            const derivedKey = sodium.crypto_pwhash(
                32,
                googlePassword,
                sodium.from_base64(keyBundle.salt),
                sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                sodium.crypto_pwhash_ALG_DEFAULT
            );

            // Decrypt identity key for storage
            const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
                sodium.from_base64(keyBundle.ik_private_key),
                sodium.from_base64(keyBundle.nonce),
                derivedKey
            );

            if (!decryptedIkPrivateKey) {
                throw new Error("Failed to decrypt identity key private key");
            }

            const userKeys = {
                identity_private_key: decryptedIkPrivateKey,
                signedpk_private_key: sodium.from_base64(keyBundle.spk_private_key),
                oneTimepks_private: keyBundle.opks_private.map((opk) => ({
                    opk_id: opk.opk_id,
                    private_key: sodium.from_base64(opk.private_key),
                })),
                identity_public_key: sodium.from_base64(keyBundle.ik_public),
                signedpk_public_key: sodium.from_base64(keyBundle.spk_public),
                oneTimepks_public: keyBundle.opks_public.map((opk) => ({
                    opk_id: opk.opk_id,
                    publicKey: sodium.from_base64(opk.publicKey),
                })),
                signedPrekeySignature: sodium.from_base64(keyBundle.signedPrekeySignature),
                salt: sodium.from_base64(keyBundle.salt),
                nonce: sodium.from_base64(keyBundle.nonce),
            };

            // Store keys locally regardless of verification status
            await storeDerivedKeyEncrypted(derivedKey);
            sessionStorage.setItem("unlockToken", "session-unlock");
            await storeUserKeysSecurely(userKeys, derivedKey);

            useEncryptionStore.setState({
                encryptionKey: derivedKey,
                userId: user.id,
                userKeys: userKeys,
            });

            setLoaderMessage("Account created! Please check your email for verification...");
            
            // Add user to the PostgreSQL database using the route for addUser in file routes
            try {
                const addUserRes = await fetch("/api/user/addUser", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                    userId: user.id,
                    }),
                });

                if (!addUserRes.ok) {
                    console.error("Failed to add new Google user to PostgreSQL database");
                } else {
                    console.log("New Google user successfully added to PostgreSQL database");
                }
            } catch (error) {
                console.error("Error adding new Google user to PostgreSQL database:", error);
            }
            
            // Note: Verification code is already sent by the backend during registration
            // No need to send it again from the frontend
            
            setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(googleUser.email)}&userId=${user.id}`);
            }, 1500);
        } else {
            throw new Error("User already exists. Please use the login flow.");
        }

        } catch (error) {
        console.error("New user registration error:", error);
        router.push(`/auth?error=authentication_failed`);
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
        opks_private: opks.map((opk) => ({
            opk_id: opk.opk_id,
            private_key: sodium.to_base64(opk.keypair.privateKey),
        })),

        salt: sodium.to_base64(salt),
        nonce: sodium.to_base64(nonce),
        };
    }

    return (
        <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader message={loaderMessage} />
        </div>
    );
}