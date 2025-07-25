'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Search,ChevronLeft,ChevronRight,MessageCircle,HelpCircle,ArrowRight,ChevronDown,ChevronUp,Star,Clock,Zap } from 'lucide-react';
import { helpSections } from './helpSections';

    const HelpCenter = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAutoPlaying, setIsAutoPlaying] = useState(true);
    const [openSections, setOpenSections] = useState({});
    const [openItems, setOpenItems] = useState({});

    const toggleSection = (section) => {
        setOpenSections((prev) => ({
        ...prev,
        [section]: !prev[section]
        }));
    };

    const filteredSections = helpSections.filter(
        (section) =>
        section.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        section.items.some((item) =>
            item.toLowerCase().includes(searchQuery.toLowerCase())
        )
    );

    const toggleItem = (sectionId, itemIndex) => {
        setOpenItems((prev) => ({
        ...prev,
        [`${sectionId}-${itemIndex}`]: !prev[`${sectionId}-${itemIndex}`],
        }));
    };

    useEffect(() => {
        if (isAutoPlaying && filteredSections.length > 0) {
        const interval = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % filteredSections.length);
        }, 6000);
        return () => clearInterval(interval);
        }
    }, [isAutoPlaying, filteredSections.length]);

    const nextSlide = () => {
        setCurrentSlide((prev) => (prev + 1) % filteredSections.length);
        setIsAutoPlaying(false);
    };

    const prevSlide = () => {
        setCurrentSlide((prev) => (prev - 1 + filteredSections.length) % filteredSections.length);
        setIsAutoPlaying(false);
    };

    const goToSlide = (index) => {
        setCurrentSlide(index);
        setIsAutoPlaying(false);
    };

    return (
        <section className="min-h-screen pt-24 px-8 py-12 sm:px-20 dark:text-white dark:bg-gray-900">
        {/* Header Section */}
        <div className="max-w-7xl mx-auto">
            <div className="flex flex-col lg:flex-row items-start justify-between gap-12 mb-16">
            {/* Left Content */}
            <div className="flex-1 max-w-3xl">
                <div className="mb-8">
                    <h1 className="text-3xl font-extrabold tracking-tight text-blue-600 dark:text-blue-400 mb-4">
                        Help Center
                    </h1>
                    <p className="text-lg text-gray-600 dark:text-slate-300 leading-relaxed">
                        Welcome to the Help Center. Here you&apos;ll find answers, guides, and
                        support for using the Secure File Sharing Platform effectively.
                    </p>
                </div>

                {/* enhanced Search Bar */}
                <div className="mb-8">
                    <div className="relative max-w-2xl">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                        type="text"
                        placeholder="Search for help articles, guides, or FAQs..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm"
                        />
                    </div>
                </div>

                {/* some Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <Star className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Popular</p>
                        <p className="font-semibold text-gray-900 dark:text-white">50+ Articles</p>
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
            </div>

            {/* Right Image - large and prominent */}
            <div className="flex-1 flex flex-col items-center gap-8">
                <div className="relative">
                <div className="absolute inset-0 bg-blue-100 dark:bg-blue-900/20 rounded-lg blur-lg opacity-50"></div>
                <Image
                    src="/img/helpCenter.png"
                    alt="Help Center Support"
                    width={800}
                    height={400}
                    className="relative max-w-full h-auto w-full max-w-lg rounded-lg shadow-lg"
                />
                </div>
            </div>
            </div>

            {/* Help Sections*/}
            <div className="mb-16">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Browse Help Topics
                </h2>
                <p className="text-gray-600 dark:text-slate-300">
                Explore our comprehensive help sections
                </p>
            </div>

            {/* Accordion Style (Desktop) */}
            <div className="hidden md:block">
                <div className="space-y-4">
                {filteredSections.map((section) => {
                    const IconComponent = section.icon;
                    const isOpen = openSections[section.id];

                    return (
                    <div
                        key={section.id}
                        className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-300 hover:shadow-md"
                    >
                        <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                        <div className="flex items-center space-x-4">
                            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <IconComponent className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                {section.title}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {section.description}
                            </p>
                            </div>
                        </div>
                        <span className="text-blue-600 ml-4">
                            {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </span>
                        </button>
                        {isOpen && (
                        <div className="px-6 pb-4">
                            <div className="border-t border-gray-200 dark:border-gray-600 pt-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {section.items.map((item, index) => (
                                <div key={index}>
                                    <div
                                    onClick={() => toggleItem(section.id, index)}
                                    className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                        toggleItem(section.id, index);
                                        }
                                    }}
                                    >
                                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                    </span>
                                    <span className="ml-auto text-blue-600">
                                        {openItems[`${section.id}-${index}`] ? (
                                        <ChevronUp size={16} />
                                        ) : (
                                        <ChevronDown size={16} />
                                        )}
                                    </span>
                                    </div>
                                    {openItems[`${section.id}-${index}`] && (
                                    <div className="ml-8 p-3 text-gray-600 dark:text-gray-300 text-sm transition-all duration-300">
                                        {item.details}
                                    </div>
                                    )}
                                </div>
                                ))}
                            </div>
                            </div>
                        </div>
                        )}
                    </div>
                    );
                })}
                </div>
            </div>

            {/* Carousel Style (Mobile Phone) */}
            <div className="block md:hidden">
                {filteredSections.length > 0 && (
                <div className="relative">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="relative min-h-[400px]">
                        {filteredSections.map((section, index) => {
                        const IconComponent = section.icon;
                        const isActive = index === currentSlide;

                        return (
                            <div
                            key={section.id}
                            className={`absolute inset-0 transition-all duration-500 ease-in-out ${
                                isActive ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'
                            }`}
                            >
                            <div className="p-6">
                                <div className="flex items-center space-x-4 mb-6">
                                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                    <IconComponent className="w-6 h-6 text-blue-600" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">{section.title}</h3>
                                    <p className="text-gray-600 dark:text-slate-300">{section.description}</p>
                                </div>
                                </div>
                                <div className="space-y-3">
                                {section.items.map((item, itemIndex) => (
                                    <div key={itemIndex}>
                                    <div
                                        onClick={() => toggleItem(section.id, itemIndex)}
                                        className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors group"
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                        if (e.key === 'Enter' || e.key === ' ') {
                                            toggleItem(section.id, itemIndex);
                                        }
                                        }}
                                    >
                                        <div className="w-2 h-2 bg-blue-600 rounded-full mt-2 flex-shrink-0"></div>
                                        <span className="text-gray-700 dark:text-gray-300 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                        {item.title}
                                        </span>
                                        <span className="ml-auto text-blue-600">
                                        {openItems[`${section.id}-${itemIndex}`] ? (
                                            <ChevronUp size={16} />
                                        ) : (
                                            <ChevronDown size={16} />
                                        )}
                                        </span>
                                    </div>
                                    {openItems[`${section.id}-${itemIndex}`] && (
                                        <div className="ml-8 p-3 text-gray-600 dark:text-gray-300 text-sm transition-all duration-300">
                                        {item.details}
                                        </div>
                                    )}
                                    </div>
                                ))}
                                </div>
                            </div>
                            </div>
                        );
                        })}
                    </div>

                    {/* Navigation Arrows */}
                    <button
                        onClick={prevSlide}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    <button
                        onClick={nextSlide}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                    >
                        <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                    </button>
                    </div>

                    {/* Carousel Indicators */}
                    <div className="flex justify-center space-x-2 mt-4">
                    {filteredSections.map((_, index) => (
                        <button
                        key={index}
                        onClick={() => goToSlide(index)}
                        className={`w-3 h-3 rounded-full transition-all duration-300 ${
                            index === currentSlide
                            ? 'bg-blue-600 scale-125'
                            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                        }`}
                        />
                    ))}
                    </div>
                </div>
                )}
            </div>
            </div>

            {/* FAQ and Contact Section - Matching FAQ Page Style */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* FAQ Section */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <HelpCircle className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                    <h3 className="text-xl font-semibold text-blue-600 dark:text-blue-400">
                    Frequently Asked Questions
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Quick answers to common questions</p>
                </div>
                </div>
                
                <p className="text-gray-600 dark:text-slate-300 mb-6 leading-relaxed">
                Browse our comprehensive list of frequently asked questions for
                quick answers to the most common issues and concerns.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                {['File Upload', 'Security', 'Sharing', 'Account'].map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-full text-sm">
                    {tag}
                    </span>
                ))}
                </div>
                
                <a
                href="/Support/FAQs"
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md font-medium transition-colors group"
                >
                <span>View FAQs</span>
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </a>
            </div>

            {/* Contact Support Section */}
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
                Can&apos;t find what you&apos;re looking for? Get in touch with our
                support team for personalized assistance and expert guidance.
                </p>
                
                <div className="flex flex-wrap gap-2 mb-6">
                {['24/7 Support', 'Live Chat', 'Email', 'Priority'].map((tag) => (
                    <span key={tag} className="px-3 py-1 bg-blue-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 rounded-full text-sm">
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
    );
};
export default HelpCenter;