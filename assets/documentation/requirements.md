# Software Requirements Specification Documentation

## Table of Contents 

| Section                   |Link                                |
|---------------------------|-------------------------------------|
|Introduction               |[Go to](#introduction)             | 
|Functional Requirements   | [Go to](#functional-requirements)   |
|Non-Functional Requirements |  [Go to](#non-functional-requirements) |

## Introduction
This document outlines the requirements for the Secure File Sharing Platform system.

## Functional Requirements

The Secure File Sharing platform shall (Version 1):

**FR1. Allow User Authentication & Account Management**

1.1 Allow users to register an account with a secure password.  
1.2 Allow users to log in using registered credentials.  
1.3 Support multi-factor authentication.  
1.4 Support third-party authentication.  
1.5 Allow users to reset passwords securely.  
1.6 Enforce account lockout after multiple failed login attempts.

**FR2. Allow File Upload and Download**

2.1 Allow users to upload files to the platform.  
2.2 Allow users to download from the platform.
2.3 Display upload/download progress with cancel support.  

**FR3. Provide End-to-End File Encryption**

3.1 Encrypt files on the client side before upload.  
3.2 Decrypted files on the client side after download.  
3.3 Only allow the sender and intended recipient(s) shall have access to encryption keys.  

**FR4. Allow File Sharing and Access Control**

4.1 Allow users to share files with specific users.  
4.2 Allow the sender to set permissions:  
    • View-only (cannot download)  
    • Download-only (cannot preview online)  
    • Full access (view + download)  
4.3 Allow the sender to revoke access at any time.  

**FR5. Allow Digital Signing**

5.1 Allow users to digitally sign files.

**FR6. Have Access Logs and Audit Trails**

6.1 Log all file-related events: upload, view, share, download.  
6.2 Allow authorized users and admins to view access logs.  
6.3 Record time, user, and action type in each log entry.

**FR7. Provide Advanced Sharing Options**

7.1 Allow files to be shared with one-time download links.  
7.2 Allow users to set file expiration times.  
7.3 Allow sharing with multiple recipients simultaneously.

**FR8. Provide Administrative Controls**

8.1 Admins shall be able to monitor all user and file activity logs.  
8.2 Admins shall be able to manage user accounts:  
    8.2.1 Remove user accounts  
    8.2.2 Restrict accounts for policy violations  

**FR9. Provide Notifications for users**

9.1 The system shall send push/email notifications on key events:  

**FR10. Provide File Organization**

10.1 Allow users to create and organize folders.  
10.2 Support file renaming, moving, and deletion.

**FR11. Provide Error Handling/Detection**

11.1 Display/provide meaningful error messages for failed operations.  
11.2 Validate input fields.

**FR12. Provide Key Management**

12.1 Generate key pairs for each user.  
12.2 Store only public keys on the server.

**FR13. Provide Cloud Storage Integration**

13.1 Use open-source cloud infrastructure for backend file management.


## Non-Functional Requirements