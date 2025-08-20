"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Loader from "@/app/dashboard/components/Loader";

function VerifyEmailInner() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [code, setCode] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [email, setEmail] = useState("");
    const [userId, setUserId] = useState("");
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const emailParam = searchParams.get("email");
        const userIdParam = searchParams.get("userId");

        if (!emailParam || !userIdParam) {
            router.push("/auth?error=missing_verification_params");
            return;
        }

        setEmail(emailParam);
        setUserId(userIdParam);
    }, [searchParams, router]);

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
            const response = await fetch("/api/auth/send-verification", {
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
                    <h2 className="text-3xl font-bold text-gray-900">Verify Your Email</h2>
                    <p className="mt-2 text-gray-600">
                        We&apos;ve sent a 6-digit verification code to:
                    </p>
                    <p className="font-semibold text-blue-600">{email}</p>
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

// "use client";

// import { useState, useEffect } from 'react';
// import { useRouter, useSearchParams } from 'next/navigation';
// import Loader from '@/app/dashboard/components/Loader';

// export default function VerifyEmailPage() {
//     const router = useRouter();
//     const searchParams = useSearchParams();
//     const [code, setCode] = useState('');
//     const [isLoading, setIsLoading] = useState(false);
//     const [message, setMessage] = useState('');
//     const [email, setEmail] = useState('');
//     const [userId, setUserId] = useState('');
//     const [mounted, setMounted] = useState(false);

//     useEffect(() => {
//         setMounted(true);
//         const emailParam = searchParams.get('email');
//         const userIdParam = searchParams.get('userId');
        
//         if (!emailParam || !userIdParam) {
//             router.push('/auth?error=missing_verification_params');
//             return;
//         }
        
//         setEmail(emailParam);
//         setUserId(userIdParam);
//     }, [searchParams, router]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
        
//         if (!code || code.length !== 6) {
//             setMessage('Please enter a valid 6-digit code');
//             return;
//         }

//         setIsLoading(true);
//         setMessage('');

//         try {
//             const response = await fetch('/api/auth/verify-code', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ userId, code }),
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 setMessage('Verification successful! Setting up your account...');
                
//                 await setupUserAuthentication();
                
//             } else {
//                 setMessage(data.error || 'Verification failed');
//             }
//         } catch (error) {
//             console.error('Verification error:', error);
//             setMessage('Verification failed. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const setupUserAuthentication = async () => {
//         try {
//             const jwtResponse = await fetch('/api/auth/generate-jwt', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ userId, email }),
//             });

//             if (jwtResponse.ok) {
//                 const { token } = await jwtResponse.json();
//                 localStorage.setItem('token', token.replace(/^Bearer\s/, ''));
//                 router.push('/dashboard');
//             } else {
//                 throw new Error('Failed to complete authentication');
//             }

//         } catch (error) {
//             console.error('Authentication setup error:', error);
//             setMessage('Failed to complete authentication. Please try signing in again.');
//         }
//     };

//     const handleResendCode = async () => {
//         setIsLoading(true);
//         setMessage('');

//         try {
//             const response = await fetch('/api/auth/send-verification', {
//                 method: 'POST',
//                 headers: {
//                     'Content-Type': 'application/json',
//                 },
//                 body: JSON.stringify({ email, userId, userName: 'User' }),
//             });

//             const data = await response.json();

//             if (response.ok) {
//                 setMessage('New verification code sent to your email');
//             } else {
//                 setMessage(data.error || 'Failed to resend code');
//             }
//         } catch (error) {
//             console.error('Resend error:', error);
//             setMessage('Failed to resend code. Please try again.');
//         } finally {
//             setIsLoading(false);
//         }
//     };

//     const handleCodeChange = (e) => {
//         const value = e.target.value.replace(/\D/g, '');
//         if (value.length <= 6) {
//             setCode(value);
//         }
//     };

//     if (!mounted) {
//         return (
//             <div className="min-h-screen bg-white flex items-center justify-center">
//                 <Loader message="Loading..." />
//             </div>
//         );
//     }

//     return (
//         <div className="min-h-screen bg-white flex items-center justify-center">
//             <div className="max-w-md w-full space-y-8 p-8">
//                 <div className="text-center">
//                     <h2 className="text-3xl font-bold text-gray-900">Verify Your Email</h2>
//                     <p className="mt-2 text-gray-600">
//                         We've sent a 6-digit verification code to:
//                     </p>
//                     <p className="font-semibold text-blue-600">{email}</p>
//                 </div>

//                 <form onSubmit={handleSubmit} className="space-y-6">
//                     <div>
//                         <label htmlFor="code" className="block text-sm font-medium text-gray-700">
//                             Verification Code
//                         </label>
//                         <input
//                             id="code"
//                             type="text"
//                             value={code}
//                             onChange={handleCodeChange}
//                             placeholder="000000"
//                             className="mt-1 block w-full px-3 py-3 border border-gray-300 rounded-md shadow-sm text-black text-center text-2xl font-mono tracking-widest focus:outline-none focus:ring-blue-500 focus:border-blue-500"
//                             maxLength={6}
//                             autoComplete="one-time-code"
//                             disabled={isLoading}
//                         />
//                     </div>

//                     {message && (
//                         <div className={`text-center text-sm ${message.includes('successful') || message.includes('sent') ? 'text-green-600' : 'text-red-600'}`}>
//                             {message}
//                         </div>
//                     )}

//                     <button
//                         type="submit"
//                         disabled={isLoading || code.length !== 6}
//                         className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
//                     >
//                         {isLoading ? <Loader /> : 'Verify Code'}
//                     </button>

//                     <div className="text-center">
//                         <button
//                             type="button"
//                             onClick={handleResendCode}
//                             disabled={isLoading}
//                             className="text-blue-600 hover:text-blue-500 text-sm disabled:opacity-50"
//                         >
//                             Didn't receive the code? Resend
//                         </button>
//                     </div>
//                 </form>

//                 <div className="text-center">
//                     <button
//                         onClick={() => router.push('/auth')}
//                         className="text-gray-500 hover:text-gray-700 text-sm"
//                     >
//                         ← Back to sign in
//                     </button>
//                 </div>
//             </div>
//         </div>
//     );
// }
