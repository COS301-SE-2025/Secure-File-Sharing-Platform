//app/signup

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from "next/image";

export default function SignupPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const router = useRouter();
  const [message, setMessage] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const validateEmail = (email) => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { name, email, password, confirmPassword } = formData;

    setIsLoading(true);
    setMessage(null);

    if (!name || !email || !password || !confirmPassword) {
      setMessage('All fields are required.');
      setIsLoading(false);
      return;
    }

    if (!validateEmail(email)) {
      setMessage('Please enter a valid email address.');
      setIsLoading(false);
      return;
    }

    if (password.length < 6) {
      setMessage('Password must be at least 6 characters long.');
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Passwords don't match.");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('http://localhost:5000/api/users/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: name,
          email,
          password
        })
      });

      const result = await res.json();

      if (!res.ok || !result.success) {
        throw new Error(result.message || 'Registration failed');
      }

      const token = result.data.token?.replace(/^Bearer\s+/, '');
      localStorage.setItem('token', token);

      setMessage('User successfully registered!');
      router.push('/dashboard');
    } catch (err) {
      console.error(err);
      setMessage(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-sky-800 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-neutral-200/95 dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <div className="flex justify-center items-center">
          <Image src="/img/shield-emp-black.png" alt="SecureShare Logo Light" width={50} height={50} className="block dark:hidden" />
          <Image src="/img/shield-emp-white.png" alt="SecureShare Logo Dark" width={50} height={50} className="hidden dark:block" />
        </div>
        <h2 className="text-2xl font-bold mb-6 text-center text-gray-800 dark:text-white">
          Sign Up
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Username
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Email Address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={isLoading}
              className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Confirm Password
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 mt-1 border rounded-md dark:bg-gray-700 dark:text-white dark:border-gray-600"
            />
          </div>

          {message && (
            <div className="text-sm text-red-600 dark:text-red-400">{message}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-md font-medium flex items-center justify-center min-h-[42px]"
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
                Signing Up...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>
        <p className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
          Already have an account?{' '}
          <a
            href="/login"
            className="text-blue-600 hover:underline dark:text-blue-400"
          >
            Log In
          </a>
        </p>
      </div>
    </div>
  );
}