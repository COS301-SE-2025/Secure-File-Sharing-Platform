"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { resetPasswordWithRecovery } from "@/lib/auth/resetWithRecovery";
import Loader from "@/app/dashboard/components/Loader";
import { EyeClosed, Eye, EyeOff } from 'lucide-react';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Enter email, 2: Enter recovery key & new password
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [progressMessage, setProgressMessage] = useState("");
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [formData, setFormData] = useState({
    email: "",
    recoveryKey: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showRecoveryKey, setShowRecoveryKey] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [passwordRequirements, setPasswordRequirements] = useState({
    hasMinLength: false,
    hasUppercase: false,
    hasLowercase: false,
    hasNumber: false,
    hasSpecialChar: false,
  });

  // Password validation
  const validatePassword = (password) => {
    const requirements = {
      hasMinLength: password.length >= 8,
      hasUppercase: /[A-Z]/.test(password),
      hasLowercase: /[a-z]/.test(password),
      hasNumber: /\d/.test(password),
      hasSpecialChar: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    };
    setPasswordRequirements(requirements);
    return Object.values(requirements).every((req) => req);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    if (name === "newPassword") {
      validatePassword(value);
    }
  };

  const handleEmailSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);

    if (!formData.email) {
      setMessage({ type: "error", text: "Please enter your email address." });
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setMessage({ type: "error", text: "Please enter a valid email address." });
      return;
    }

    setStep(2);
  };

  const handleResetSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setIsLoading(true);

    // Validation
    if (!formData.recoveryKey.trim()) {
      setMessage({ type: "error", text: "Please enter your recovery key." });
      setIsLoading(false);
      return;
    }

    if (!validatePassword(formData.newPassword)) {
      setMessage({ type: "error", text: "Password does not meet all requirements." });
      setIsLoading(false);
      return;
    }

    if (formData.newPassword !== formData.confirmPassword) {
      setMessage({ type: "error", text: "Passwords do not match." });
      setIsLoading(false);
      return;
    }

    try {
      const result = await resetPasswordWithRecovery(
        formData.email,
        formData.recoveryKey,
        formData.newPassword,
        (current, total, message) => {
          setProgress({ current, total });
          setProgressMessage(message);
        }
      );

      if (result.success) {
        setMessage({ type: "success", text: result.message });
        setProgressMessage("Complete!");
        setTimeout(() => {
          router.push("/auth");
        }, 2000);
      } else {
        setMessage({ type: "error", text: result.message });
      }
    } catch (error) {
      setMessage({ type: "error", text: "An unexpected error occurred. Please try again." });
    } finally {
      setIsLoading(false);
      setProgressMessage("");
      setProgress({ current: 0, total: 0 });
    }
  };

  const allPasswordRequirementsMet = Object.values(passwordRequirements).every((req) => req);

  return (
    <div className="min-h-screen bg-white flex">
      {isLoading && (
        <Loader
          message={progressMessage || "Resetting your password..."}
          progress={progress.total > 0 ? (progress.current / progress.total) * 100 : null}
        />
      )}

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
              Reset Your Password
            </h2>
            <p className="text-blue-100 text-lg mb-8 leading-relaxed">
              USe your recovery key to securely rest your password and get back your access to your files.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 lg:w-1/2 flex items-center justify-center p-8 bg-neutral-100 dark:bg-gray-300">
        <div className="w-full max-w-md">
          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-center space-x-4">
              <div className={`flex items-center ${step >= 1 ? "text-blue-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 1 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>
                  1
                </div>
                <span className="ml-2 font-medium">Email</span>
              </div>
              <div className="w-12 h-0.5 bg-gray-300"></div>
              <div className={`flex items-center ${step >= 2 ? "text-blue-600" : "text-gray-400"}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${step >= 2 ? "bg-blue-600 text-white" : "bg-gray-300"}`}>
                  2
                </div>
                <span className="ml-2 font-medium">Reset</span>
              </div>
            </div>
          </div>

          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            {step === 1 ? "Enter Your Email" : "Reset Password"}
          </h2>
          <p className="text-gray-600 mb-6">
            {step === 1
              ? "Enter the email address associated with your account."
              : "Enter your recovery key and choose a new password."}
          </p>

          {/* Messages */}
          {message && (
            <div
              className={`p-3 rounded-md text-sm mb-4 ${message.type === "success"
                ? "bg-green-100 text-green-700"
                : "bg-red-100 text-red-700"
                }`}
            >
              {message.text}
            </div>
          )}

          {/* Step 1: Email */}
          {step === 1 && (
            <form onSubmit={handleEmailSubmit} className="space-y-6">
              <div>
                <label className="block mb-1 font-semibold text-gray-700 text-sm">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                  placeholder="email"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition"
              >
                Continue
              </button>

              <div className="text-center">
                <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* Step 2: Recovery Key & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetSubmit} className="space-y-4">
              <div>
                <label className="block mb-1 font-semibold text-gray-700 text-sm">
                  Recovery Key
                </label>
                <div className="relative">
                  <input
                    type={showRecoveryKey ? "text" : "password"}
                    name="recoveryKey"
                    value={formData.recoveryKey}
                    onChange={handleInputChange}
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 font-mono text-sm"
                    placeholder="Enter your recovery key"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowRecoveryKey(!showRecoveryKey)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    aria-label={showRecoveryKey ? 'Hide recovery key' : 'Show recovery key'}
                  >
                    {showRecoveryKey ? (
                      <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    ) : (
                      <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  This is the recovery key you saved when you created your account
                </p>
              </div>

              <div>
                <label className="block mb-1 font-semibold text-gray-700 text-sm">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? "text" : "password"}
                    name="newPassword"
                    value={formData.newPassword}
                    onChange={handleInputChange}
                    onFocus={() => setIsPasswordFocused(true)}
                    onBlur={() => setIsPasswordFocused(false)}
                    className="w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
                    placeholder="Enter new password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                  >
                    {showNewPassword ? (
                      <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    ) : (
                      <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>

              {/* Password Requirements Checklist */}
              {(formData.newPassword && !allPasswordRequirementsMet) && (
                <div className="p-3 bg-gray-50 dark:bg-gray-100 rounded-md border">
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
                      At least one lowercase letter
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

              <div>
                <label className="block mb-1 font-semibold text-gray-700 text-sm">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    disabled={!allPasswordRequirementsMet}
                    className={`w-full border dark:border-gray-400 border-gray-300 rounded-md px-4 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900 ${!allPasswordRequirementsMet ? 'bg-gray-100 cursor-not-allowed opacity-50' : ''
                      }`}
                    placeholder={!allPasswordRequirementsMet ? 'Complete password requirements first' : 'Confirm new password'}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    disabled={!allPasswordRequirementsMet}
                    className={`absolute inset-y-0 right-0 flex items-center pr-3 ${!allPasswordRequirementsMet ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    aria-label={showConfirmPassword ? 'Hide confirm password' : 'Show confirm password'}
                  >
                    {showConfirmPassword ? (
                      <Eye className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    ) : (
                      <EyeClosed className="h-5 w-5 text-gray-500 hover:text-gray-700" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 font-semibold py-2 rounded-md hover:bg-gray-300 transition"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={!allPasswordRequirementsMet || isLoading}
                  className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg
                        className="animate-spin -ml-1 mr-2 h-5 w-5 text-white inline"
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
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
                  )}
                </button>
              </div>

              <div className="text-center">
                <Link href="/auth" className="text-sm text-blue-600 hover:text-blue-700 hover:underline">
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* Help Section */}
          <div className="mt-8 p-4 bg-blue-200 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-blue-900">Don&apos;t have your recovery key?</p>
                <p className="text-xs text-blue-700 mt-1">
                  Unfortunately, without your recovery key, we cannot reset your password due to our zero-knowledge encryption. Please contact support for assistance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
