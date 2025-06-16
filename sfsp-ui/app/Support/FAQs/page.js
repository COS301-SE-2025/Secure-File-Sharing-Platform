'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ChevronLeft, ChevronRight } from 'lucide-react';

export default function FAQsPage() {
    const [openFAQ, setOpenFAQ] = useState(null);
    const [currentPage, setCurrentPage] = useState(0);
    const itemsPerPage = 4;

    const toggleFAQ = (globalIndex) => {
        setOpenFAQ(openFAQ === globalIndex ? null : globalIndex);
    };

    const faqs = [
        {
            question: "What is the Secure File Sharing Platform?",
            answer: "It's a web-based system designed to allow users to securely share files with individuals or groups using end-to-end encryption, access control, and audit logging to ensure privacy and accountability."
        },
        {
            question: "How is my data protected?",
            answer: "Your files are encrypted both in transit and at rest using modern encryption standards. We use secure authentication mechanisms, generate access tokens for file sharing, and restrict file access based on permissions."
        },
        {
            question: "Who can access the files I upload?",
            answer: "Only users you explicitly share the files with can access them. You can choose to share with individuals or pre-defined groups, and set permissions like view-only or download access."
        },
        {
            question: "Can I revoke access after sharing a file?",
            answer: "Yes. You can revoke access to shared files at any time. The platform immediately enforces access changes across all users."
        },
        {
            question: "Does the platform support group sharing?",
            answer: "Yes. You can share files with user groups. These groups are managed through our group management feature, allowing bulk permissions and easier sharing for teams or organizations."
        },
        {
            question: "Is my file history tracked?",
            answer: "Yes. We maintain an activity log for each file, including uploads, downloads, shares, and access revocations. This ensures full traceability."
        },
        {
            question: "What happens if I accidentally delete a file?",
            answer: "Files deleted from the platform are moved to a recycle bin for a limited period, during which you can recover them. Permanent deletion is only performed after the retention window expires."
        },
        {
            question: "Do I need an account to access a shared file?",
            answer: "That depends on the sharing method. For private or group shares, a verified account is required. For public shares, links can be accessed without login if allowed by the file owner."
        },
        {
            question: "Is the platform free to use?",
            answer: "We offer a free tier with basic functionality suitable for individual use. Advanced features such as group management, audit trails, and extended storage are available in premium plans."
        },
        {
            question: "How do I report a security issue?",
            answer: "You can report any security concerns through our 'Contact Us' form or email the security team directly. We take all reports seriously and respond within 24 hours."
        }
    ];

    const totalPages = Math.ceil(faqs.length / itemsPerPage);
    const currentFAQs = faqs.slice(
        currentPage * itemsPerPage,
        (currentPage + 1) * itemsPerPage
    );

    const nextPage = () => {
        if (currentPage < totalPages - 1) {
            setCurrentPage(currentPage + 1);
            setOpenFAQ(null);
        }
    };

    const prevPage = () => {
        if (currentPage > 0) {
            setCurrentPage(currentPage - 1);
            setOpenFAQ(null);
        }
    };

    const goToPage = (pageIndex) => {
        setCurrentPage(pageIndex);
        setOpenFAQ(null);
    };

    return (
        <div className="relative">
            <div className="absolute top-4 left-4 sm:top-6 sm:left-6">
                <button onClick={() => router.back()} className="text-blue-600 hover:text-blue-800 font-medium">
                    ← Back
                </button>
            </div>
            <section className="min-h-[calc(100vh-64px)] pt-24 px-8 py-12 sm:px-20 flex flex-col lg:flex-row items-start justify-between gap-12 text-left dark:text-white dark:bg-gray-900">
                {/* Left: FAQs Content */}
                <div className="flex-1 max-w-3xl">
                    <div className="mb-12">
                        <h1 className="text-3xl font-extrabold tracking-tight text-blue-600 mb-4">
                            Frequently Asked Questions
                        </h1>
                        <p className="text-lg text-gray-600 dark:text-slate-300">
                            Find answers to common questions about our secure file sharing platform.
                        </p>
                    </div>

                    {/* FAQ Carousel */}
                    <div className="space-y-4 min-h-[300px]">
                        {currentFAQs.map((faq, localIndex) => {
                            const globalIndex = currentPage * itemsPerPage + localIndex;
                            return (
                                <div 
                                    key={globalIndex}
                                    className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700"
                                >
                                    <button
                                        onClick={() => toggleFAQ(globalIndex)}
                                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-lg"
                                    >
                                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                            {faq.question}
                                        </h3>
                                        <span className="text-blue-600 ml-4">
                                            {openFAQ === globalIndex ? (
                                                <ChevronUp size={20} />
                                            ) : (
                                                <ChevronDown size={20} />
                                            )}
                                        </span>
                                    </button>
                                    
                                    {openFAQ === globalIndex && (
                                        <div className="px-6 pb-4">
                                            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                                                <p className="text-gray-600 dark:text-slate-300 leading-relaxed">
                                                    {faq.answer}
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Navigation Controls */}
                    <div className="flex items-center justify-between mt-8">
                        <button
                            onClick={prevPage}
                            disabled={currentPage === 0}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
                                currentPage === 0
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            <ChevronLeft size={20} />
                            Previous
                        </button>

                        {/* Page Indicators */}
                        <div className="flex gap-2">
                            {Array.from({ length: totalPages }, (_, index) => (
                                <button
                                    key={index}
                                    onClick={() => goToPage(index)}
                                    className={`w-3 h-3 rounded-full transition-colors ${
                                        currentPage === index
                                            ? 'bg-blue-600'
                                            : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-400'
                                    }`}
                                    aria-label={`Go to page ${index + 1}`}
                                />
                            ))}
                        </div>

                        <button
                            onClick={nextPage}
                            disabled={currentPage === totalPages - 1}
                            className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${
                                currentPage === totalPages - 1
                                    ? 'text-gray-400 cursor-not-allowed'
                                    : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                            }`}
                        >
                            Next
                            <ChevronRight size={20} />
                        </button>
                    </div>

                    {/* Page Counter */}
                    <div className="text-center mt-4">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                            Page {currentPage + 1} of {totalPages} • Showing {currentFAQs.length} of {faqs.length} questions
                        </span>
                    </div>
                </div>

                {/* Right: Image and Contact Support */}
                <div className="flex-1 flex flex-col items-center gap-8">
                    <img
                        src="/img/FAQs.png"
                        alt="Frequently Asked Questions"
                        className="max-w-full h-auto w-full max-w-lg"
                    />
                    
                    <div className="w-full max-w-lg">
                        <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-6">
                            <h3 className="text-xl font-semibold text-blue-600 mb-2">
                                Still have questions?
                            </h3>
                            <p className="text-gray-600 dark:text-slate-300 mb-4">
                                Can't find what you're looking for? Get in touch with our support team.
                            </p>
                            <a 
                                href="/Support/contactPage"
                                className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium"
                            >
                                Contact Support
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}