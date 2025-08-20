import { FileText, Shield, Users, Settings, BookOpen } from 'lucide-react';

export const helpSections = [
    {
        id: 'file-management',
        title: 'File Management',
        icon: FileText,
        description: 'Master your files with powerful management tools',
        items: [
            {
                title: 'How to upload files securely',
                details: 'To upload files securely, navigate to the dashboard, click the "Upload" button, and select your files. Ensure you’re using a secure connection (HTTPS).'
            },
            {
                title: 'Downloading files and folders',
                details: 'To download files, go to the file list, select the desired file or folder, and click the "Download" button. Ensure you have sufficient permissions.'
            },
            {
                title: 'Sharing files with individuals or groups',
                details: 'Share files by selecting the file, clicking "Share," and entering the recipient’s email or group. Set permissions and expiration dates as needed.'
            },
            {
                title: 'Setting file expiration dates',
                details: 'When sharing a file, select an expiration date from the sharing options to automatically revoke access after a specified period.'
            },
            {
                title: 'Revoking file access permissions',
                details: 'Go to the shared files section, locate the file, and click "Revoke Access" to remove permissions for specific users or groups.'
            },
            {
                title: 'Recovering deleted files',
                details: 'Visit the "Trash" section in your dashboard to restore deleted files within the retention period.'
            },
            {
                title: 'Organizing files with folders',
                details: 'Create folders in the dashboard to organize files. Drag and drop files into folders or use the "Move" option.'
            },
        ],
    },
    {
        id: 'security-privacy',
        title: 'Security & Privacy',
        icon: Shield,
        description: 'Keep your data safe with enterprise-grade security',
        items: [
            {
                title: 'How your data is secured (AES-256 encryption)',
                details: 'All files are encrypted using AES-256 encryption at rest and in transit to ensure maximum security.'
            },
            {
                title: 'Setting up Two-Factor Authentication (2FA)',
                details: 'Enable 2FA in your account settings by linking an authenticator app or SMS for an extra layer of security.'
            },
            {
                "title": "Creating your secure account",
                "details": "Visit our signup page and provide required information including a valid email. You'll need to create a strong password and verify your email address to activate your account."
            },
            {
                title: 'Understanding file access permissions',
                details: 'File access permissions can be set to "View", "Edit", or "Admin". Admins can manage sharing settings, while Viewers can only view files.'
            },
            {
                title: 'Best practices for secure file sharing',
                details: 'Always use secure links, set expiration dates, and limit access to trusted users. Regularly review shared files and permissions.'
            },
            {
                title: 'Reporting security incidents',
                details: 'If you suspect a security breach, immediately contact our support team via the help center or email us.'
            },
        ]
    },
    {
        id: 'account-access',
        title: 'Account & Access',
        icon: Users,
        description: 'Manage your account and user permissions effortlessly',
        items: [
            {
                title: 'Creating your secure account',
                details: 'Sign up with your email and a strong password.'
            },
            {
                title: "Updating profile information",
                details: "Go to Account Settings > MY ACCOUNT to update personal details. Some changes may require verification. Profile pictures should be under 2MB in JPG/PNG format."
            },
            {
            "title": "Account deactivation process",
            "details": "Request deactivation in Account Settings. All data will be permanently deleted after 30 days. Download important files first as recovery isn't possible."
        },
            {
                title: 'Managing user roles and permissions',
                details: 'Admins can assign roles (Viewer, Editor, Admin) to users. Go to the Users section, select a user, and adjust their role as needed.'
            },
            {
                title: 'Resetting your password',
                details: 'If you forget your password, click "Forgot Password" on the login page. Follow the instructions in the email to reset it.'
            },
            {
                title: 'Enabling Two-Factor Authentication (2FA)',
                details: 'Enhance security by enabling 2FA in Account Settings. Use an authenticator app or SMS verification.'
            },
        ],
    },
    {
        id: 'troubleshooting',
        title: 'Troubleshooting',
        icon: Settings,
        description: 'Quick solutions to common issues and problems',
        items: [
            {
                title: "Can't upload files? Check file size limits",
                details: 'Ensure your file is within the allowed size limit (e.g., 2GB for free accounts). Try compressing large files or upgrading your plan.'
            },
            {
                title: "Network connectivity issues",
                details: "Check your internet connection first. If problems persist, try switching networks, restarting your router, or contacting your IT department about firewall settings."
            },
            {
                title: "Browser compatibility problems",
                details: "For best results, use latest Chrome, Firefox, Edge or Safari. Clear cache/cookies if experiencing issues. Enable JavaScript and disable conflicting extensions."
            },
            {
                title: "Why is my file download slow?",
                details: "Slow downloads may result from network congestion, large file sizes, or distance from our servers. Try pausing other downloads or using a wired connection."
            },
            {
                title: "Resolving 'Access denied' errors",
                details: "This typically indicates permission issues. Verify you have proper access rights. If problem persists, contact your administrator or check the file's sharing settings."
            },
        ],
    },
    {
        id: 'policies',
        title: 'Policies & Legal',
        icon: BookOpen,
        description: 'Understand our terms, policies, and compliance',
        items: [
            {
                title: 'Terms of Service',
                details: 'Our Terms of Service outline the rules and guidelines for using our platform. Review them to understand your responsibilities.'
            },
            {
                title: "POPIA compliance information",
                details: "We comply with South Africa's POPIA regulations regarding personal information processing. Users have right to access, correct, or delete their personal data."
            },
            {
                title: "Data retention and deletion policy",
                details: "Active data is retained while your account exists. Deleted files are purged after 30 days. Account data is completely erased after deactivation."
            },
            {
                title: "Privacy Policy",
                details: "The Privacy Policy details how we collect, use, and protect your personal information. We never sell your data and limit sharing to necessary service operations."
            },
        ],
    },
];