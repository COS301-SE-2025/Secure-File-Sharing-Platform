# Software Requirements Specification Documentation

## Table of Contents 

| Section                   |Link                                |
|---------------------------|-------------------------------------|
|Introduction               |[Go to](#introduction)             | 
|Functional Requirements   | [Go to](#functional-requirements)   |
|Non-Functional Requirements |  [Go to](#non-functional-requirements) |
|User Stories /User Characteristics| [Go to](#user-stories)  |

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

## User Stories


| User Stories                                                                                                                                                                                                                                                                                     | Acceptance criteria                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ***File Upload***<br><br>**As a** secure file sharing platform user I want to be able to securely upload my documents onto the platform **So that** they can be securely store.                                                                                                                  | Given that I see the upload slot when I copy in or attach a file for upload, Then the system should encrypt the file and store it securely.                                                                                                                                                        |
| ***File download***<br><br>As a secure file sharing platform user I want to be able to securely download file sent by other users to me and files I stored on the platform So that I can have the information that is needed.                                                                    | Given that a user sees that files were sent to them by a peer or if they want to download previously stored files, when they click they choose the file to download, Then the file should be downloaded into there system.                                                                         |
| ***File sharing***<br><br>As a secure file sharing platform user I want to be able to securely share my files with other users So that I can send them information I need them to have.                                                                                                          | Given that a user has the username or email of the recipient when they click the send button, Then the recipient should be alerted that someone is trying to send over a file and  they can either accept the file then receive the file securely or deny the request then never receive the file. |
| ***File Viewing***<br><br>As a secure file sharing platform user I want the ability to view file on my device before I download them or upload them So that I know that they contain information I need.                                                                                         | Given that a user can see all the files they have on the platform they should be able to When they click a file, Then they should be able to see the contents of the file before they download or upload it.                                                                                       |
| ***File signing***<br><br>As a secure file sharing platform user I want to be able to sign a file So that I know when the contents of my file have been changed or tampered with.                                                                                                                | Given a user has uploaded a file, When they press a button to sign the document, Then the mathematical algorithms should be applied to the document so that it create a signature that is stored on the platform, with meta date such as when the signature was created.                           |
| ***Edit files***<br><br>As a secure file sharing platform user I want to be able to edit file in the platform before I upload them and after I download them So that I can easily change parts of the document before they are saved on the platform.                                            | Given a user has a file to upload or had just downloaded a file, When they press the the edit button they should have the ability to edit the file before they upload or download it.                                                                                                              |
| ***Access Control logs***<br><br>As a secure file sharing platform user I want the be able to see who downloaded my file, who I shared the file with, how many files I have uploaded or downloaded, So that I can be extra sure that my files are when they belong and I have not lost any files | Given that a user is on the platform, When they press the button to access the logs, Then they should be shown information about either specific files or general information about the files that have uploaded and downloaded.                                                                   |
| ***One time downloads***<br><br>As a secure fil sharing platform user I want to be able to create files that can be downloaded only once, So that I know that my files won't have unauthorized distribution.                                                                                     | Given that a sender sent files to me When they download the files, Then the file should be removed from ever being downloaded again by them.                                                                                                                                                       |
| ***Set expiration on file access***<br><br>As a secure file sharing platform user I want to be able to set a time limit for how long other users can download my file even if I sent it to them So that they do not have unlimited access to my file                                             | Given that a user is sending a file to someone When the click a button to add an expiration date, Then they should be prompted to add how long the file should be downloadable by the recipient for.                                                                                               |
| ***Group Sharing***<br><br>As a secure file sharing platform user I want to be able to share files with multiple people or an organization So that I don't have to send files individually one-by-one to every person                                                                            | Given a user want to share a file, When they press the send, Then they should be prompted on whether they want to send it to a single person or a group or organization of people and whether it should be a one-time download, whether they want to set file expirations.                         |
| ***Password Protected files***<br><br>As a secure file sharing platform user I want to be able to set a password for a public file so that only people who know the password can decrypt it.                                                                                                     | Given a user wants to add a password to a file, When they press the button to add a password to a file, The the system should prompt them to add a password, and send that file with the password protecting it.                                                                                   |
| ***Restore Access Logs on File Deletion***<br><br>As a secure file sharing platform user I want to be able to view who accessed my files even after I delete them This is for forensic or auditing reasons                                                                                       | Given a user has deleted a file, When they go to the deleted files tab and press on the delete file. Then they should be able to see how many people access that file before it was deleted.                                                                                                       |
|                                                                                                                                                                                                                                                                                                  |                                                                                                                                                                                                                                                                                                    |
