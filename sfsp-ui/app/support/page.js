'use client';
import React, { useState } from "react";
import Image from "next/image";
import { useRouter } from 'next/navigation';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

export default function ContactUs() {

    const router = useRouter();
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        message: "",
    });

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        console.log("Form submitted:", formData);

        try {
            const response = await fetch("http://localhost:5000/api/contact", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(formData),
            });

            const result = await response.json();

            if (result.success) {
                toast.success("Message sent successfully!");
                setFormData({ name: "", email: "", message: "" });
            } else {
                toast.error("Failed to send message. Please try again.");
            }
        } catch (error) {
            console.error("Error sending message:", error);
            toast.error("Failed to send message.");
        }
    };

    return (
        <div className="relative">
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 font-medium">
                    ← Back
                </button>
            </div>
            <section className="min-h-[calc(100vh-64px)] pt-24 px-8 py-12 sm:px-20 flex flex-col sm:flex-row items-center justify-between gap-12 text-left dark:text-white dark:bg-gray-900">
                {/* Left: Form */}
                <div className="flex-1 max-w-xl space-y-6">
                    <h2 className="text-3xl font-extrabold tracking-tight text-blue-600">Contact Us</h2>
                    <p className="text-lg text-gray-600 dark:text-slate-300">
                    Got questions, feedback, or issues? Reach out via email and we'll respond as soon as possible.
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Name</label>
                            <input type="text" value={formData.name} onChange={(e) => handleChange("name", e.target.value)} required
                                className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                                />
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Email</label>
                            <input type="email" value={formData.email} onChange={(e) => handleChange("email", e.target.value)} required className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"/>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-1">Message</label>
                            <textarea
                            value={formData.message}
                            onChange={(e) => handleChange("message", e.target.value)}
                            rows={5}
                            required
                            className="w-full px-4 py-2 border rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"             >
                            Send Message
                        </button>
                    </form>
                </div>

                <ToastContainer position="top-right" autoClose={3000} />

                {/* Right: Image */}
                <div className="flex-1 flex justify-center">
                    <Image
                    src="/img/cloud-computing-security-abstract-concept-illustration.png"
                    alt="Contact Us I Guess"
                    width={600}
                    height={500}
                    className="max-w-full h-auto"
                    />
                </div>
            </section>
        </div>
    );
}