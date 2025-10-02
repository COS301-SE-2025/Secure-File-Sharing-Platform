'use client';
import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import { ChevronLeft } from 'lucide-react';
import { getApiUrl, getFileApiUrl } from "@/lib/api-config";

export default function ContactUs() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: '',
  });

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const apiUrl = getApiUrl('/contact');
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.success) {
        toast.success('Message sent successfully!');
        setFormData({ name: '', email: '', message: '' });
      } else {
        toast.error('Failed to send message. Please try again.');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message.');
    }
  };

return (
    <div className="relative bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
              Contact Us
            </h1>
            <button
              onClick={() => router.back()}
              className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2"
            >
              <ChevronLeft size={20} />
              Back
            </button>
          </div>
        </div>
      </div>

      <section className="min-h-[calc(100vh-64px)] px-8 py-12 sm:px-20 flex flex-col lg:flex-row items-start justify-between gap-12 dark:text-white">
        {/* Left: Form */}
        <div className="flex-1 max-w-3xl space-y-12">
          {/* Form */}
          <div className="space-y-6">
            <h2 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
              Get in Touch
            </h2>
            <p className="text-lg text-gray-600 dark:text-slate-300">
              Got questions, feedback, or issues? Reach out via the form below, and we’ll respond as soon as possible.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange('email', e.target.value)}
                  required
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Message</label>
                <textarea
                  value={formData.message}
                  onChange={(e) => handleChange('message', e.target.value)}
                  rows={5}
                  required
                  className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>

        {/* Right: Image */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-lg blur-lg opacity-50"></div>
            <Image
              src="/img/cloud-computing-security-abstract-concept-illustration.png"
              alt="Contact Us"
              width={600}
              height={500}
              className="relative max-w-full h-auto rounded-lg shadow-lg"
            />
          </div>
          </div>
      </section>
      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}