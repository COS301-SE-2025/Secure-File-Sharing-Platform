"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase, getUserByEmail, getUserByGoogleId, createGoogleUser, updateUserGoogleId  } from '@/lib/supabaseClient';
import { getSodium } from "@/app/lib/sodium";
import { generateSecurePassword } from "@/lib/auth";
import { useEncryptionStore, storeUserKeysSecurely, storeDerivedKeyEncrypted,} from "../../../SecureKeyStorage";
import Loader from '@/app/dashboard/components/Loader';

export default function GoogleCallbackPage() {
    const router = useRouter();
    const [ setIsLoading] = useState(true);
    const [message, setMessage] = useState('Processing Google authentication...');
    const [isMounted, setIsMounted] = useState(false);    useEffect(() => { setIsMounted(true); }, []);


    useEffect(() => {
        if (!isMounted) return;
        
        const handleGoogleCallback = async () => {
        try {
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const error = urlParams.get('error');
            const state = urlParams.get('state');

            if (error === 'access_denied') {
            setMessage('Google authentication was cancelled.');
            setTimeout(() => {
                router.push('/auth?error=oauth_cancelled');
            }, 2000);
            return;
            }

            if (error) {
            console.error('Google OAuth error:', error);
            setMessage('Google authentication failed. Please try again.');
            setTimeout(() => {
                router.push('/auth?error=oauth_error');
            }, 2000);
            return;
            }

            if (!code) {
            setMessage('Missing authorization code. Please try again.');
            setTimeout(() => {
                router.push('/auth?error=missing_code');
            }, 2000);
            return;
            }

            const storedState = localStorage.getItem('googleAuthState');
            if (!storedState || storedState !== state) {
            setMessage('Invalid authentication state. Please try again.');
            setTimeout(() => {
                router.push('/auth?error=invalid_state');
            }, 2000);
            return;
            }

            const usedCode = localStorage.getItem('lastUsedGoogleCode');
            if (usedCode === code) {
            setMessage('This authorization code has already been used. Please try again.');
            setTimeout(() => {
                router.push('/auth?error=code_reused');
            }, 2000);
            return;
            }

            localStorage.setItem('lastUsedGoogleCode', code);
            
            setMessage('Exchanging authorization code...');

            const tokenResponse = await fetch('/api/auth/google/callback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
            });

            if (!tokenResponse.ok) {
            const errorData = await tokenResponse.json();
            console.error('Token exchange failed:', errorData);
            
            if (errorData.details?.error === 'invalid_grant') {
                setMessage('Authorization code has expired. Please try again.');
                setTimeout(() => {
                router.push('/auth?error=code_expired');
                }, 2000);
                return;
            }
            
            throw new Error(errorData.error || 'Failed to exchange authorization code for tokens');
            }

            const { user: googleUser, tokens } = await tokenResponse.json();
            console.log('Google user received:', googleUser);
            setMessage('Checking user account...');

            let { data: existingUser, error: fetchError } = await getUserByGoogleId(googleUser.id);
            console.log('getUserByGoogleId result:', { existingUser, fetchError });
            
            if (fetchError && fetchError.code !== 'PGRST116') {
            console.error('Error checking existing user by Google ID:', fetchError);
            }

            if (!existingUser) {
            console.log('User not found by Google ID, checking by email...');
            const emailResult = await getUserByEmail(googleUser.email);
            console.log('getUserByEmail result:', emailResult);
            if (emailResult.data && !emailResult.error) {
                existingUser = emailResult.data;
            }
            }

            let user;
            let isNewUser = false;
            console.log('Processing user, existingUser:', existingUser);

            if (existingUser) {
            if (!existingUser.google_id) {
                const { data: updatedUser, error: updateError } = await updateUserGoogleId(
                existingUser.id,
                googleUser.id,
                googleUser.picture,
                googleUser.verified_email
                );

                if (updateError) {
                console.error('Error updating user:', updateError);
                throw new Error('Failed to update user account');
                }
                user = updatedUser;
            } else {
                user = existingUser;
            }

            if (user.ik_public && user.salt && user.nonce) {
                setMessage('Loading your encryption keys...');
                
                const sodium = await getSodium();
                
                let opks_public_temp;
                try {
                opks_public_temp = JSON.parse(user.opks_public);
                } catch (e) {
                opks_public_temp = [];
                }

                const userKeys = {
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

                useEncryptionStore.setState({
                userId: user.id,
                userKeys: userKeys,
                });
            }
            } else {
            console.log('Creating new user for Google authentication');
            setMessage('Creating your account...');
            isNewUser = true;

            const defaultPassword = generateSecurePassword();
            
            console.log('Generating X3DH keys...');
            const keyData = await GenerateX3DHKeys(defaultPassword);
            console.log('X3DH keys generated successfully');

            const { data: newUser, error: insertError } = await createGoogleUser(googleUser, keyData);
            console.log('createGoogleUser result:', { newUser, insertError });

            if (insertError) {
                console.error('Error creating user:', insertError);
                if (insertError.code === '23505') {
                throw new Error('An account with this email already exists');
                }
                throw new Error('Failed to create user account');
            }

            user = newUser;

            const sodium = await getSodium();
            const derivedKey = sodium.crypto_pwhash(
                32,
                defaultPassword,
                sodium.from_base64(keyData.salt),
                sodium.crypto_pwhash_OPSLIMIT_MODERATE,
                sodium.crypto_pwhash_MEMLIMIT_MODERATE,
                sodium.crypto_pwhash_ALG_DEFAULT
            );

            const decryptedIkPrivateKey = sodium.crypto_secretbox_open_easy(
                sodium.from_base64(keyData.ik_private_key),
                sodium.from_base64(keyData.nonce),
                derivedKey
            );

            const userKeys = {
                identity_private_key: decryptedIkPrivateKey,
                signedpk_private_key: sodium.from_base64(keyData.spk_private_key),
                oneTimepks_private: keyData.opks_private.map((opk) => ({
                opk_id: opk.opk_id,
                private_key: sodium.from_base64(opk.private_key),
                })),
                identity_public_key: sodium.from_base64(keyData.ik_public),
                signedpk_public_key: sodium.from_base64(keyData.spk_public),
                oneTimepks_public: keyData.opks_public.map((opk) => ({
                opk_id: opk.opk_id,
                publicKey: sodium.from_base64(opk.publicKey),
                })),
                signedPrekeySignature: sodium.from_base64(keyData.signedPrekeySignature),
                salt: sodium.from_base64(keyData.salt),
                nonce: sodium.from_base64(keyData.nonce),
            };

            await storeDerivedKeyEncrypted(derivedKey);
            sessionStorage.setItem("unlockToken", "session-unlock");
            await storeUserKeysSecurely(userKeys, derivedKey);

            useEncryptionStore.setState({
                encryptionKey: derivedKey,
                userId: user.id,
                userKeys: userKeys,
            });
            }

        setMessage('Finalizing sign-in...');

        console.log('Sending MFA verification email...');
        const verificationResponse = await fetch('/api/auth/send-verification', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
            email: user.email, 
            userId: user.id, 
            userName: user.username || user.email 
        }),
        });

        if (!verificationResponse.ok) {
        const errorData = await verificationResponse.json();
        console.error('MFA verification email failed:', errorData);
        throw new Error('Failed to send verification email. Please try again.');
        }

        console.log('MFA verification email sent successfully');
        
        useEncryptionStore.getState().setUserId(user.id);

        localStorage.removeItem('googleAuthInProgress');
        localStorage.removeItem('googleAuthState');
        localStorage.removeItem('lastUsedGoogleCode');

        setMessage('Verification email sent! Check your inbox.');
        setTimeout(() => {
            router.push(`/auth/verify-email?email=${encodeURIComponent(user.email)}&userId=${user.id}`);
        }, 2000);        } catch (error) {
            console.error('Google authentication error:', error);
            console.error('Error stack:', error.stack);
            setMessage(error.message || 'Authentication failed. Please try again.');
            
            localStorage.removeItem('googleAuthInProgress');
            localStorage.removeItem('googleAuthState');
            localStorage.removeItem('lastUsedGoogleCode');
            
            setTimeout(() => {
            router.push('/auth?error=authentication_failed');
            }, 3000);
        } finally {
            setIsLoading(false);
        }
        };

        handleGoogleCallback();
    }, [router, isMounted]);

    async function GenerateX3DHKeys(password) {
        const sodium = await getSodium();

        const ik = sodium.crypto_sign_keypair();
        const spk = sodium.crypto_sign_keypair();

        const spkSignature = sodium.crypto_sign_detached(spk.publicKey, ik.privateKey);

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
        const encryptedIK = sodium.crypto_secretbox_easy(ik.privateKey, nonce, derivedKey);

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
        {!isMounted ? (
            <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading...</p>
            </div>
        ) : (
            <div className="text-center">
            <Loader message={message} />
            </div>
        )}
        </div>
    );
}
