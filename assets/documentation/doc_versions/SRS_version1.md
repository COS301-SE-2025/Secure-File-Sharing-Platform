# Software Requirements Specification Documentation

This is VERSION 1 of the software requirements specification document.


## Table of Contents

| Section                     | Link                           |
| :-------------------------- | :----------------------------- |
| Introduction                | [Go to](#introduction)         |
|User Stories / User Characteristics| [Go to](#user-stories--user-characteristics) |
|.........Use Case Diagram| [Go to](#use-case-diagram) |
| Functional Requirements     | [Go to](#functional-requirements) |
|Service Contracts|[Go to](#service-contracts)|
|Domain Model|[Go to](#domain-model)|
|Architectural Requirements|[Go to](#architectural-requirements)|
|.........Quality Requirements | [Go to](#non-functional-requirements) |
|.........Architectural Patterns|[Go to](#architectural-patterns)|
|.........Design Patterns|[Go to](#design-patterns)|
|.........Constraints|[Go to](#constraints)|
|Technology Requirements|[Go to](#technology-requirements)|
|Versions of SRS Documents|[Go to](#versions-of-srs-documents)|

-----

# Introduction

This document outlines the requirements for the Secure File Sharing Platform system.

-----

# User Stories / User Characteristics


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

## Use Case Diagram

![use-case-diagram](https://drive.google.com/uc?export=view&id=1yDBDS6etoqGUqMw_tXtFjdJhDdsCF2rS)

-----

# Functional Requirements

The Secure File Sharing platform shall (Version 1):

### FR1. User Authentication & Account Management
    
- **FR1.1** Users shall be able to register an account with a secure password.
- **FR1.2** Users shall be able to log in using registered credentials.
- **FR1.3** The system shall support multi-factor authentication.
- **FR1.4** The system shall support third-party authentication.
- **FR1.5** Users shall be able to reset passwords securely.
- **FR1.6** The system shall enforce account lockout after multiple failed login attempts.

### FR2. File Upload and Download

- **FR2.1** Users shall be able to upload files to the platform.
- **FR2.2** Users shall be able to download files from the platform.
- **FR2.3** The system shall display upload/download progress with cancel support.

### FR3. End-to-End File Encryption

- **FR3.1** Files shall be encrypted on the client side before upload.
- **FR3.2** Files shall be decrypted on the client side after download.
- **FR3.3** Only the sender and intended recipient(s) shall have access to encryption keys.

### FR4. File Sharing and Access Control

- **FR4.1** Users shall be able to share files with specific users.
- **FR4.2** The sender shall be able to set permissions:
     - view-only (cannot download)
     - Download-only (cannot preview online)
     - Full access (view + download)
- **FR4.3** The sender shall be able to revoke access at any time.

### FR5. Digital Signing

- **FR5.1** Users shall be able to digitally sign files.

### FR6. Access Logs and Audit Trails

- **FR6.1** All file-related events (upload, view, share, download) shall be logged.
- **FR6.2** Authorized users and administrators shall be able to view access logs.
- **FR6.3** Each log entry shall record time, user, and action type.

### FR7. Advanced Sharing Options

- **FR7.1** Files shall be shareable with one-time download links.
- **FR7.2** Users shall be able to set file expiration times.
- **FR7.3** Sharing with multiple recipients simultaneously shall be supported.

### FR8. Administrative Controls

- **FR8.1** Administrators shall be able to monitor all user and file activity logs.
- **FR8.2** Administrators shall be able to manage user accounts:
    - Remove user accounts
    - Restrict accounts for policy violations

### FR9. Notifications

- **FR9.1** The system shall send push/email notifications on key events.

### FR10. File Organization

- **FR10.1** Users shall be able to create and organize folders.
- **FR10.2** The system shall support file renaming, moving, and deletion.

### FR11. Error Handling/Detection

- **FR11.1** The system shall display meaningful error messages for failed operations.
- **FR11.2** The system shall validate input fields.

### FR12. Key Management

- **FR12.1** The system shall generate key pairs for each user.
- **FR12.2** Only public keys shall be stored on the server.

### FR13. Cloud Storage Integration

- **FR13.1** The system shall use open-source cloud infrastructure for backend file management.

---

# Service Contracts


## **API SERVICE:**
* Allow user login and signup 
* Middleware to supabase database for user data storage
* Connect to cloud storage for file handling
* Routes file sharing operations

INPUT:
* Email, username , password 
* .env.local file to connect to supabase project 
* .env  file to connect to cloud storage 
* user operation to be done on file
Output:
* A new user
* Create new user in supabase database or retrieve user
* Returns requested file 
Interaction:
* UI : enter user details to sign up login in, process UI actions

[Further Reference](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/blob/ui/sfsp-api/APIDocumentation.md)

## **FILE SHARING SERVICE:**
* Encrypt shared files`
* Deleting of a file
* Upload/download of files
* Signing of documents
* Listing number of files

INPUT:
* File to be uploaded
* File to be deleted
* File to be signed and signature 
Output:
* Uploaded File
* Downloaded File
* Edited file with signature 
Interaction:
-  API : fulfil API requests for file handling 

[Further Reference](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/blob/ui/sfsp-api/services/fileService/fileServiceDocumentation.md)

---

# Domain Model

![domain-model](https://drive.google.com/uc?export=view&id=1F9OxHFnsJeCFBFHoGP_UupHMJfyUtM8N)

-----

# Architectural Requirements

------

## Quality Requirements

### NFR1. User Authentication & Account Management

  * **NFR1.1**: All user credentials must be encrypted using industry standard algorithms.
  * **NFR1.2**: Multi-factor authentication must be enforced where configured.
  * **NFR1.3**: Authentication endpoints must be resilient to brute force attacks.
  * **NFR1.4**: Password reset tokens must expire within 15 minutes.

### NFR2. File Upload and Download

  * **NFR2.1**: Progress indicators must update in real-time (less than 500 ms delay).
  * **NFR2.2**: Cancel operations must terminate transfers within 2 seconds.

### NFR3. End-to-End File Encryption

  * **NFR3.1**: Encryption algorithms must use AES-256 for symmetric encryption and RSA-4096 or ECC for asymmetric operations.
  * **NFR3.2**: No unencrypted file or key material shall be stored on the server.
  * **NFR3.3**: Compliance with GDPR and other regional data protection regulations is mandatory.

### NFR4. File Sharing and Access Control

  * **NFR4.1**: Permissions shall be enforced at the backend and shall not be bypassable via client modifications.
  * **NFR4.2**: The user interface must visually distinguish between different permission levels clearly.

### NFR5. Digital Signing

  * **NFR5.1**: Signing operations must comply with digital signature standards.
  * **NFR5.2**: Digital signature verification must be deterministic and complete within 1 second.

### NFR6. Access Logs and Audit Trails

  * **NFR6.1**: Log entries must be immutable and tamper proof.
  * **NFR6.2**: Logs must be retained for a minimum of 1 year.

### NFR7. Advanced Sharing Options

  * **NFR7.1**: One time links must expire automatically after download or expiration time, whichever comes first.
  * **NFR7.2**: Expired links must be purged within 1 hour of expiration.

### NFR8. Administrative Controls

  * **NFR8.1**: Administrator actions must be auditable and traceable.
  * **NFR8.2**: Administrative interfaces must be restricted to authenticated and authorized users only.

### NFR9. Notifications

  * **NFR9.1**: Notification delivery (email/push) must occur within 30 seconds of the triggering event.
  * **NFR9.2**: The system must use secure protocols (TLS, HTTPS) for sending notifications.

### NFR10. Error Handling/Detection

  * **NFR11.1**: All error messages must be user friendly, localizable, and provide actionable guidance.
  * **NFR11.2**: The system must log all critical and warning-level errors with full context for debugging.

### NFR11. Key Management

  * **NFR12.1**: Keys must be generated using a secure random number generator (e.g., WebCrypto).
  * **NFR12.2**: The system must ensure zero exposure of private keys to the server.


---

## Architectural Patterns

### Drafts:

**Microservices architecture:**

![microservices](https://drive.google.com/uc?export=view&id=1ytoGTHN4bKQgv6z9nufgfS9beRtuG3CK)

*Reasoning:*
Allows for isolation of services. Allowing for independent scalability and flexibility in languages, as we plan to use GO for encrytion services.

**MVC Architecture:**

![mvc](https://drive.google.com/uc?export=view&id=1dTs8WEAZ8sjdMB9gyga10b5RKHitww2k)

*Reasoning:*

Allows us to organize UI, and creates a separation of concerns. This will also help down the line with mobile development.  

**Event-driven Architecture:**

![event-driven](https://drive.google.com/uc?export=view&id=1CZRlsVonZZIa6h-L0yS3P2SLP4We0Sab)

*Reasoning:*
File upload/download should lead to a log action.
Shared file should notify recipient

Allows for real-time features that are needed for this project.

---

## Design Patterns
The following design patterns were selected (subject to change) for the following functionality:

- Decorator Pattern – For logging, auditing, and digital signature.,
- Prototype Pattern – For managing users.,
- Observer Pattern – To support real-time notifications and updates.,
- Proxy Pattern – For access verification and controlled resource access.,
- Command Pattern – To queue and execute file operations like uploads/downloads.,
---

## Constraints

- **End-to-End Encryption:** the files have to be encrypted before upload and decrypted after download on the client's side.
- **Zero-Trust:** the server should not know what is on it as allow the files should be encrypted.
- **Secure Key Management:** public/private keys should be securely generated, stored and shared only with the parties involved.

---

# Technology Requirements
<div align="left">
<a href="https://nextjs.org/" target="_blank"><img src="https://skillicons.dev/icons?i=nextjs" alt="Next.js" /></a>
<a href="https://tailwindcss.com/" target="_blank"><img src="https://skillicons.dev/icons?i=tailwind" alt="Tailwind CSS" /></a>
<a href="https://expressjs.com/" target="_blank"><img src="https://skillicons.dev/icons?i=express" alt="Express.js" /></a>
<a href="https://nodejs.org/" target="_blank"><img src="https://skillicons.dev/icons?i=nodejs" alt="Node.js" /></a>
<a href="https://golang.org/" target="_blank"><img src="https://skillicons.dev/icons?i=go" alt="Golang" /></a>
<a href="https://supabase.com/" target="_blank"><img src="https://skillicons.dev/icons?i=supabase" alt="Supabase" /></a>
<a href="https://www.mongodb.com/" target="_blank"><img src="https://skillicons.dev/icons?i=mongodb" alt="MongoDB" /></a>
<a href="https://owncloud.com/" target="_blank"><img src="https://skillicons.dev/icons?i=owncloud" alt="ownCloud" /></a>
</div>

## Technology Stack Overview

| Technology | Description |
|------------|-------------|
| **Next.js** | Main frontend framework, bootstrapped with `create-next-app` for React-based web application development. |
| **Tailwind CSS** | Utility-first CSS framework for fast and responsive UI styling. |
| **Express.js** + **Node.js** | Backend API server and routing logic for handling HTTP requests and business logic implementation. |
| **Golang** | Handles large file uploads efficiently for high performance. |
| **MongoDB** | NoSQL database for storing application metadata, user data, and file information in a flexible document format. |
| **Supabase** | Backend-as-a-Service platform providing authentication and user management. 



# Versions of SRS documents

| VERSION    | LINK |
|--------|---------|
|Version 2| [Go to](../requirements.md)|