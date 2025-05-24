'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { loginUser } from "@/lib/auth/login";
import Link from "next/link";


export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [message, setMessage] = useState(null);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { data, error } = await loginUser(formData);

    if (error) {
      setMessage(error);
    } else {
      setMessage('Login successful!');
      router.push('/dashboard'); // *** TO DO: Redirect to dashboard or home page after it has been implemented ***
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-lg shadow-lg">
        <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Log in to your account</h2>

        <form className="space-y-6" onSubmit={handleSubmit}>
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Email address
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1 block w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Forgot */}
          <div className="flex items-center justify-between">
            <Link href="/requestReset" className="text-sm text-blue-600 hover:underline dark:text-blue-400">
              Forgot password?
            </Link>
          </div>

          {/* Submit */}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-md transition-colors"
          >
            Sign In
          </button>
        </form>

        {/* Divider */}
        <div className="mt-6 text-sm text-center text-gray-600 dark:text-gray-300">
          Don’t have an account?{" "}
          <Link href="/signup" className="text-blue-600 hover:underline dark:text-blue-400">
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
}
