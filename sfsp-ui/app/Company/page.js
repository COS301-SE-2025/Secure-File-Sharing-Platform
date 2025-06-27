'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Shield, Lock, Eye, Clock, Server, Cloud } from 'lucide-react';

export default function AboutUs() {
    const router = useRouter();
    const [activeSection, setActiveSection] = useState(0);

    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('animate-fade-in');
                }
                });
            },
            { threshold: 0.1 }
            );

        const elements = document.querySelectorAll('.animate-on-scroll');
        elements.forEach((el) => observer.observe(el));

        return () => observer.disconnect();
    }, []);

    const features = [
        {
            icon: <Lock className="w-8 h-8" />,
            title: "End-to-End Encryption (E2EE)",
            description: "All files are encrypted client-side. We use strong, modern cryptography to ensure data remains unreadable in transit and at rest—until it reaches the person it's meant for.",
            image: "/img/end-to-end.png"
        },
        {
            icon: <Eye className="w-8 h-8" />,
            title: "Scaled Access Control",
            description: "You decide who sees your files, for how long, and under what conditions. Whether it's time-based expiry, download limits, or restricted access logs—you're in control.",
            image: "/img/access-control-logs.png"
        },
        {
            icon: <Clock className="w-8 h-8" />,
            title: "One-Time Links & Expiry Settings",
            description: "Share files with confidence. Generate self-destructing links or one-time downloads for sensitive content to minimize risk exposure.",
            image: "/img/one-time.png"
        },
        {
            icon: <Shield className="w-8 h-8" />,
            title: "Access Logs & Audit Trails",
            description: "Every action is recorded. Track exactly who accessed what and when—so you stay informed and in control.",
            image: "/img/sharing.png"
        }
    ];

    const beliefs = [
        {
            title: "Zero Trust Architecture",
            description: "Trust no one by default. Our platform is built on the Zero Trust model, which means every access request is verified, authenticated, and authorized before it's allowed—even from within the system."
        },
        {
        title: "User-Controlled Encryption",
        description: "Files are encrypted before they leave your device and can only be decrypted by the intended recipient. Not even we can view your content."
        }
    ];

    const infrastructure = [
        {
            icon: <Server className="w-6 h-6" />,
            title: "Microservices Architecture",
            description: "Built with scalability, security, and resilience in mind. Each component of our platform operates independently, ensuring optimized performance and minimal downtime."
        },
        {
            icon: <Cloud className="w-6 h-6" />,
            title: "Cloud-Native & Containerized",
            description: "Our infrastructure is containerized and cloud-native, allowing us to scale quickly and isolate failures without compromising security."
        }
    ];

return (
    <div className="relative bg-gray-50 dark:bg-gray-900 min-h-screen">
        <style jsx>{`
            @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
            }

        @keyframes float {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-10px);
            }
        }

        @keyframes pulse-slow {
            0%, 100% {
                opacity: 1;
            }
            50% {
                opacity: 0.8;
            }
        }

        .animate-fade-in {
            animation: fadeInUp 0.8s ease-out forwards;
        }

        .animate-float {
            animation: float 3s ease-in-out infinite;
        }

        .animate-pulse-slow {
            animation: pulse-slow 2s ease-in-out infinite;
        }

        .gradient-text {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }

        .glass-effect {
            backdrop-filter: blur(10px);
            background: rgba(255, 255, 255, 0.1);
            border: 1px solid rgba(255, 255, 255, 0.2);
        }

        .dark .glass-effect {
            background: rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
    `}</style>

      {/* Header */}
    <div className="bg-gray-50 dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
                    About Us
                </h1>
                <button
                    onClick={() => router.back()}
                    className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-2 transition-colors duration-200"
                >
                <ChevronLeft size={20} />
                    Back
                </button>
            </div>
        </div>
    </div>

      {/* Hero Section */}
    <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-blue-900/20"></div>
            <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    <div className="animate-on-scroll space-y-8">
                        <div className="flex items-center gap-4">
                            <Image
                            src="/img/shield-emp-dark.png"
                            alt="Logo"
                            width={60}
                            height={60}
                            className="dark:hidden animate-pulse-slow"
                            />
                            <Image
                            src="/img/shield-emp-white.png"
                            alt="Logo"
                            width={60}
                            height={60}
                            className="hidden dark:block animate-pulse-slow"
                            />
                            <h2 className="text-4xl lg:text-5xl font-bold gradient-text">
                                Who We Are
                            </h2>
                        </div>
                        <p className="text-xl text-gray-600 dark:text-gray-300 leading-relaxed">
                            We are a privacy-first team driven by the mission to redefine secure file sharing. 
                            In a world where data breaches are far too common, we&apos;ve built a platform where{' '}
                            <span className="font-bold text-blue-600 dark:text-blue-400">
                            privacy is not a feature—it&apos;s the foundation
                            </span>. 
                            Our system ensures that your files are seen only by you and the people you choose. 
                            No third-party access. Ever.
                        </p>
                    </div>
                <div className="animate-on-scroll">
                    <div className="relative">
                        <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-2xl blur-2xl opacity-50 animate-pulse-slow"></div>
                            <Image
                            src="/img/cloud-computing-security-abstract-concept-illustration.png"
                            alt="Security Illustration"
                            width={600}
                            height={500}
                            className="relative max-w-full h-auto rounded-2xl shadow-2xl animate-float"
                            />
                    </div>
                </div>
            </div>
        </div>
    </section>

      {/* What We Believe */}
    <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll text-center mb-16">
                <h2 className="text-4xl font-bold gradient-text mb-6">What We Believe</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                {beliefs.map((belief, index) => (
                <div
                key={index}
                className="animate-on-scroll glass-effect rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300"
                style={{ animationDelay: `${index * 200}ms` }}
                >
                    <h3 className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-4">
                        {belief.title}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {belief.description}
                    </p>
                </div>
                ))}
            </div>
        </div>
    </section>

      {/* How It Works */}
    <section className="py-20 bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll text-center mb-16">
                <h2 className="text-4xl font-bold gradient-text mb-6">How It Works</h2>
            </div>
            <div className="grid lg:grid-cols-2 gap-12">
                {features.map((feature, index) => (
                <div
                    key={index}
                    className="animate-on-scroll group"
                    style={{ animationDelay: `${index * 150}ms` }}
                >
                <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-2">
                    <div className="flex items-start gap-6">
                        <div className="bg-blue-100 dark:bg-blue-900/30 p-4 rounded-xl text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-200">
                        {feature.icon}
                        </div>
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                                {feature.title}
                            </h3>
                            <p className="text-gray-600 dark:text-gray-300 leading-relaxed mb-6">
                                {feature.description}
                            </p>
                            <div className="relative">
                                <div className="absolute inset-0 bg-blue-50 dark:bg-blue-900/10 rounded-xl blur-sm opacity-50"></div>
                                <Image
                                src={feature.image}
                                alt={feature.title}
                                width={400}
                                height={250}
                                className="relative w-full h-48 object-cover rounded-xl"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            ))}
        </div>
        </div>
    </section>

      {/* Modern Infrastructure */}
    <section className="py-20 bg-white dark:bg-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-on-scroll text-center mb-16">
                <h2 className="text-4xl font-bold gradient-text mb-6">Modern Infrastructure</h2>
            </div>
            <div className="grid md:grid-cols-2 gap-8">
                {infrastructure.map((item, index) => (
                <div
                    key={index}
                    className="animate-on-scroll group"
                    style={{ animationDelay: `${index * 200}ms` }}
                >
                    <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-700 dark:to-gray-600 rounded-2xl p-8 hover:transform hover:scale-105 transition-all duration-300">
                    <div className="flex items-center gap-4 mb-4">
                        <div className="bg-blue-600 dark:bg-blue-500 p-3 rounded-xl text-white group-hover:rotate-12 transition-transform duration-200">
                        {item.icon}
                        </div>
                        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                        {item.title}
                        </h3>
                    </div>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
                        {item.description}
                    </p>
                    </div>
                </div>
                ))}
            </div>
        </div>
    </section>

      {/* Call to Action */}
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="animate-on-scroll">
                <h2 className="text-4xl font-bold text-white mb-6">
                Ready to Experience True Privacy?
                </h2>
                <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                Join thousands of users who trust us with their most sensitive files. 
                Experience the future of secure file sharing today.
                </p>
                <a
                    href="/auth"
                    className="bg-white text-blue-600 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-100 transform hover:scale-105 transition-all duration-200 shadow-lg inline-block"
                    >
                    Get Started Now
                </a>
            </div>
        </div>
    </section>
    </div>
);
}