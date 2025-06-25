'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { Search, ChevronLeft, ChevronRight, MessageCircle, ArrowRight, Star, Clock, Zap } from 'lucide-react';

export default function FAQsPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const router = useRouter();

  const faqs = [
    {
      question: 'What is the Secure File Sharing Platform?',
      answer: 'It’s a web-based system designed to allow users to securely share files with individuals or groups using end-to-end encryption, access control, and audit logging to ensure privacy and accountability.',
      tags: ['Platform', 'Security'],
    },
    {
      question: 'How is my data protected?',
      answer: 'Your files are encrypted both in transit and at rest using modern encryption standards. We use secure authentication mechanisms, generate access tokens for file sharing, and restrict file access based on permissions.',
      tags: ['Security', 'Encryption'],
    },
    {
      question: 'Who can access the files I upload?',
      answer: 'Only users you explicitly share the files with can access them. You can choose to share with individuals or pre-defined groups, and set permissions like view-only or download access.',
      tags: ['Access', 'Sharing'],
    },
    {
      question: 'Can I revoke access after sharing a file?',
      answer: 'Yes. You can revoke access to shared files at any time. The platform immediately enforces access changes across all users.',
      tags: ['Access', 'Permissions'],
    },
    {
      question: 'Does the platform support group sharing?',
      answer: 'Yes. You can share files with user groups. These groups are managed through our group management feature, allowing bulk permissions and easier sharing for teams or organizations.',
      tags: ['Sharing', 'Groups'],
    },
    {
      question: 'Is my file history tracked?',
      answer: 'Yes. We maintain an activity log for each file, including uploads, downloads, shares, and access revocations. This ensures full traceability.',
      tags: ['Activity', 'Tracking'],
    },
    {
      question: 'What happens if I accidentally delete a file?',
      answer: 'Files deleted from the platform are moved to a recycle bin for a limited period, during which you can recover them. Permanent deletion is only performed after the retention window expires.',
      tags: ['Recovery', 'Deletion'],
    },
    {
      question: 'Do I need an account to access a shared file?',
      answer: 'That depends on the sharing method. For private or group shares, a verified account is required. For public shares, links can be accessed without login if allowed by the file owner.',
      tags: ['Access', 'Sharing'],
    },
    {
      question: 'Is the platform free to use?',
      answer: 'We offer a free tier with basic functionality suitable for individual use. Advanced features such as group management, audit trails, and extended storage are available in premium plans.',
      tags: ['Pricing', 'Features'],
    },
    {
      question: 'How do I report a security issue?',
      answer: 'You can report any security concerns through our "Contact Us" form or email the security team directly. We take all reports seriously and respond within 24 hours.',
      tags: ['Security', 'Support'],
    },
  ];

  const filteredFAQs = faqs.filter(
    (faq) =>
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  useEffect(() => {
    if (isAutoPlaying && filteredFAQs.length > 0) {
      const interval = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % filteredFAQs.length);
      }, 6000);
      return () => clearInterval(interval);
    }
  }, [isAutoPlaying, filteredFAQs.length]);

  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % filteredFAQs.length);
    setIsAutoPlaying(false);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + filteredFAQs.length) % filteredFAQs.length);
    setIsAutoPlaying(false);
  };

  const goToSlide = (index) => {
    setCurrentSlide(index);
    setIsAutoPlaying(false);
  };

  return (
    <div className="relative bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gray-50 dark:bg-gray-900 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400">
              Frequently Asked Questions
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
        {/* Left: FAQs Content */}
        <div className="flex-1 max-w-3xl">
          {/* Search Bar */}
          <div className="mb-8">
            <div className="relative max-w-2xl">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search FAQs by question, answer, or tag..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
              />
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <Star className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total FAQs</p>
                  <p className="font-semibold text-gray-900 dark:text-white">{faqs.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <Clock className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Response</p>
                  <p className="font-semibold text-gray-900 dark:text-white">2 hours</p>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                  <Zap className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Success Rate</p>
                  <p className="font-semibold text-gray-900 dark:text-white">98.5%</p>
                </div>
              </div>
            </div>
          </div>

          {/* FAQ Carousel */}
          <div className="mt-20 mb-16">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Browse FAQs
              </h2>
              <p className="text-gray-600 dark:text-slate-300">
                Find quick answers to common questions
              </p>
            </div>

            <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="relative min-h-[230px]">
                {filteredFAQs.length > 0 ? (
                  filteredFAQs.map((faq, index) => (
                    <div
                      key={index}
                      className={`absolute inset-0 transition-all duration-500 ease-in-out ${index === currentSlide ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                        }`}
                    >
                      <div className="p-6">
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">
                          {faq.question}
                        </h3>
                        <p className="text-gray-600 dark:text-slate-300 mb-4 leading-relaxed">
                          {faq.answer}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {faq.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-3 py-1 bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-full text-sm"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-6 text-gray-600 dark:text-slate-300">
                    No FAQs match your search.
                  </div>
                )}
              </div>
            </div>

            {/* Navigation Controls */}
            {filteredFAQs.length > 1 && (
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={prevSlide}
                  disabled={currentSlide === 0}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${currentSlide === 0
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                >
                  <ChevronLeft size={20} />
                  Previous
                </button>

                {/* Carousel Indicators */}
                <div className="flex gap-2">
                  {filteredFAQs.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => goToSlide(index)}
                      className={`w-3 h-3 rounded-full transition-colors ${currentSlide === index
                          ? 'bg-blue-600'
                          : 'bg-gray-300 dark:bg-gray-600 hover:bg-blue-400'
                        }`}
                      aria-label={`Go to slide ${index + 1}`}
                    />
                  ))}
                </div>

                <button
                  onClick={nextSlide}
                  disabled={currentSlide === filteredFAQs.length - 1}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium ${currentSlide === filteredFAQs.length - 1
                      ? 'text-gray-400 cursor-not-allowed'
                      : 'text-blue-600 hover:text-blue-800 hover:bg-blue-50 dark:hover:bg-gray-700'
                    }`}
                >
                  Next
                  <ChevronRight size={20} />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Right: Image and Contact Support */}
        <div className="flex-1 flex flex-col items-center gap-8">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-lg blur-lg opacity-50"></div>
            <Image
              src="/img/FAQs.png"
              alt="Frequently Asked Questions"
              width={1000}     
              height={700}
              className="relative max-w-full h-auto w-full max-w-lg rounded-lg shadow-lg"
            />
          </div>

          <div className="w-full max-w-lg">
            <div className="bg-blue-50 dark:bg-gray-800 rounded-lg p-6 border border-blue-200 dark:border-blue-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                  <MessageCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    Still have questions?
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Get personalized help from our team</p>
                </div>
              </div>
              <p className="text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">
                Can’t find what you’re looking for? Get in touch with our support team for personalized assistance and expert guidance.
              </p>
              <div className="flex flex-wrap gap-2 mb-6">
                {['24/7 Support', 'Live Chat', 'Email', 'Priority'].map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-full text-sm"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <a
                href="/Support/contactPage"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors group"
              >
                <span>Contact Support</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}