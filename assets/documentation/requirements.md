# Software Requirements Specification Documentation

This is VERSION 2 of the software requirements specification document. 


## Table of Contents  
1. [Introduction](#introduction)  
2. [User Stories & Characteristics](#user-stories--user-characteristics)  
   - [Use Case Diagram](#use-case-diagram)  
3. [Functional Requirements](#functional-requirements)  
4. [Service Contracts](#service-contracts)  
5. [Domain Model](#domain-model)  
6. [Architectural Requirements](#architectural-requirements)  
   - [Quality Requirements](#quality-requirements)  
   - [Architectural Mapping](#architectural-mapping)  
   - [Architectural Patterns](#architectural-patterns)  
   - [Design Patterns](#design-patterns)  
   - [Constraints](#constraints)  
7. [Technology Requirements](#technology-requirements)  
8. [Version History](#versions-of-srs-documents)

---

# Introduction

This document outlines the requirements for the Secure File Sharing Platform system.

---

# User Stories / User Characteristics


| User Stories                                                                                                                                                                                                                                                                                     | Acceptance criteria                                                                                                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ***File Upload***<br><br>**As a** secure file sharing platform user I want to be able to securely upload my documents onto the platform **So that** they can be securely store.                                                                                                                  | Given that I see the upload slot when I copy in or attach a file for upload, Then the system should encrypt the file and store it securely.                                                                                                                                                        |
| ***File download***<br><br>As a secure file sharing platform user I want to be able to securely download file sent by other users to me and files I stored on the platform So that I can have the information that is needed.                                                                    | Given that a user sees that files were sent to them by a peer or if they want to download previously stored files, when they click they choose the file to download, Then the file should be downloaded into there system.                                                                         |
| ***File sharing***<br><br>As a secure file sharing platform user I want to be able to securely share my files with other users So that I can send them information I need them to have.                                                                                                          | Given that a user has the username or email of the recipient when they click the send button, Then the recipient should be alerted that someone is trying to send over a file and  they can either accept the file then receive the file securely or deny the request then never receive the file. |
| ***File Viewing***<br><br>As a secure file sharing platform user I want the ability to view file on my device before I download them or upload them So that I know that they contain information I need.                                                                                         | Given that a user can see all the files they have on the platform they should be able to When they click a file, Then they should be able to see the contents of the file before they download or upload it.                                                                                       |
| ***File signing***<br><br>As a secure file sharing platform user I want to be able to sign a file So that I know when the contents of my file have been changed or tampered with.                                                                                                                | Given a user has uploaded a file, When they press a button to sign the document, Then the mathematical algorithms should be applied to the document so that it create a signature that is stored on the platform, with meta date such as when the signature was created.                           |
| ***Access Control logs***<br><br>As a secure file sharing platform user I want the be able to see who downloaded my file, who I shared the file with, how many files I have uploaded or downloaded, So that I can be extra sure that my files are when they belong and I have not lost any files | Given that a user is on the platform, When they press the button to access the logs, Then they should be shown information about either specific files or general information about the files that have uploaded and downloaded.                                                                   |
| ***One time downloads***<br><br>As a secure fil sharing platform user I want to be able to create files that can be downloaded only once, So that I know that my files won't have unauthorized distribution.                                                                                     | Given that a sender sent files to me When they download the files, Then the file should be removed from ever being downloaded again by them.                                                                                                                                                       |
| ***Set expiration on file access***<br><br>As a secure file sharing platform user I want to be able to set a time limit for how long other users can download my file even if I sent it to them So that they do not have unlimited access to my file                                             | Given that a user is sending a file to someone When the click a button to add an expiration date, Then they should be prompted to add how long the file should be downloadable by the recipient for.                                                                                               |
| ***Group Sharing***<br><br>As a secure file sharing platform user I want to be able to share files with multiple people or an organization So that I don't have to send files individually one-by-one to every person                                                                            | Given a user want to share a file, When they press the send, Then they should be prompted on whether they want to send it to a single person or a group or organization of people and whether it should be a one-time download, whether they want to set file expirations.                         |
| ***Password Protected files***<br><br>As a secure file sharing platform user I want to be able to set a password for a public file so that only people who know the password can decrypt it.                                                                                                     | Given a user wants to add a password to a file, When they press the button to add a password to a file, The the system should prompt them to add a password, and send that file with the password protecting it.                                                                                   |
| ***Restore Access Logs on File Deletion***<br><br>As a secure file sharing platform user I want to be able to view who accessed my files even after I delete them This is for forensic or auditing reasons                                                                                       | Given a user has deleted a file, When they go to the deleted files tab and press on the delete file. Then they should be able to see how many people access that file before it was deleted.                                                                                                       |
| ***View Notifications***<br><br>As a secure file sharing platform user I want to be able to view my notifications.   | Given a user has new notifications , when accessing their notifications through a bell icon they should be able to view their notifications. |
| ***Delete Notifications***<br><br>As a secure file sharing platform user I want to be able to delete my notifications.   | Given a user has notifications they want to delete, when accessing their notifications through a bell icon they should be able to delete their notifications by pressing the 'x' on the right upper-side of the notification . |
| ***Approve/Decline file shares***<br><br>As a secure file sharing platform user I want to be able to approve/decline file shares from other users. | Given a user is wants to approve/decline a file transfer, they should be able to click on the respective button in notifications.|
| ***Delete/Restore files***<br><br>As a secure file sharing platform user I want to be able to delete/restore files. | Given a user is wants to delete/restore a file, they would navigate to the trash page allowing them to either permanently delete file(s) or restore them. If they wish to clear the trash page they can do so by clearing trash.|
| ***Bulk uploads***<br><br>As a secure file sharing platform user I want to be able to upload multiple files at once. | Given a user is wants to upload multiple files at once, they can add the files to the dialogue according to their preference (drag and drop / selection). They can then upload and view the progress bar during the upload.|
| ***Search for files***<br><br>As a secure file sharing platform user I want to be able to search for a specific file by file detail.   | Given a user wants to search for a file, they should be able to use the search bar at the top of the page to look for their desired file by file detail. |
| ***View File Details for a specific file***<br><br>As a secure file sharing platform user I want to be able to view a file's details in order to ensure that it is the desired file I want.   | Given a user wants to view a file's details, they should be able to use a right-click menu to get access to the file's details.|
| ***View Activity Logs for a specific file***<br><br>As a secure file sharing platform user I want to be able to view a file's activity details in order to keep track of activities involving my file.   | Given a user wants to view a file's activity log, they should be able to use a right-click menu to get access to the file's activity log.|

---

## Use Case Diagram

![use-case-diagram](https://drive.google.com/uc?export=view&id=1yDBDS6etoqGUqMw_tXtFjdJhDdsCF2rS)

-----

# Functional Requirements

The Secure File Sharing platform shall (Version 2):

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
- **FR9.2** The system should allow users to approve/disapprove notifications for transactions.

### FR10. File Organization

- **FR10.1** Users shall be able to create and organize folders.
- **FR10.2** The system shall support file renaming, moving, and deletion.
- **FR10.3** Users shall be able to search for files.
- **FR10.4** The system shall support filtering of files by category.
- **FR10.5** The system shall support bulk file actions.

### FR11. Error Handling/Detection

- **FR11.1** The system shall display meaningful error messages for failed operations.
- **FR11.2** The system shall validate input fields.
- **FR11.3** The system shall provide confirmations for operations.
- **FR11.4** The system shall include a user feedback/report issue.

### FR12. Key Management

- **FR12.1** The system shall generate key pairs for each user.
- **FR12.2** The system shall store public keys shall be stored in a database.
- **FR12.3** The system shall store private keys in a vault.
- **FR12.4** The system will allow users to rotate keys securely.

### FR13. Cloud Storage Integration

- **FR13.1** The system shall use open-source cloud infrastructure for backend file management.

### FR14. Session Management

- **FR14.1** The system shall support secure time-outs and auto logout for inactive users.

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

---

# Architectural Requirements

------

## **Quality Requirements**

## NF1: Security Requirements

### Description
For a secure file sharing plartform, the security of the system is paramount ensuring the protection of sensitive data, prevention of unauthorized access, and compliance with data protection regulations. It encompasses all measures taken to protect the system and its data from unauthorized access, use, disclosure, disruption, modification, or destruction.

### Quantification
To properly quantify security, adherence to industry-standard encryption protocols and compliance with data protection regulations will be assessed. The system's resilience against common attack vectors will be measured through penetration testing. Access control mechanisms will be evaluated for their effectiveness in restricting unauthorized access.

### Targets

1. **NFR1.1**: Sensitive user credentials must be encrypted using industry-standard algorithms (AES-256 for symmetric encryption and x3dh for asymmetric operations).

2. **NFR1.2**: Multi-factor authentication must be enforced where configured.

3. **NFR1.3**: Authentication endpoints must be resilient to brute force attacks, demonstrating zero successful brute-force attempts during security testing.

4. **NFR1.4**: Password reset tokens must expire within 15 minutes.

5. **NFR1.5**: No unencrypted file or key material shall be stored on the server.

6. **NFR1.6**: Compliance with GDPR and other regional data protection regulations is mandatory, evidenced by regular audit reports.

7. **NFR1.7**: Permissions shall be enforced at the backend and shall not be bypassable via client modifications.

8. **NFR1.8**: Administrative interfaces must be restricted to authenticated and authorized users only.

9. **NFR1.9**: The system must log all critical and warning-level errors with full context for debugging, and these logs must be auditable.

10. **NFR1.10**: Keys must be generated using a secure random number generator.

11. **NFR1.11**: The system must ensure zero exposure of private keys to the server.

12. **NFR1.12**: Private keys should be stored in a sealed vault.

13. **NFR1.13**: Signing operations must comply with digital signature standards.

14. **NFR1.14**: Administrator actions must be auditable and traceable, capturing who performed what action and when.

## NF2: Performance Requirements

### Description
The system must execute operations efficiently and respond promptly to user interactions, ensuring a smooth and responsive experience without undue delays.

### Quantification
Performance will be measured through load testing, response time monitoring for critical operations, and throughput analysis. Metrics will include the time taken to complete specific tasks under defined loads.

### Targets

1. **NFR2.1**: Cancel operations must terminate transfers within 3 seconds.

2. **NFR2.2**: Digital signature verification must be deterministic and complete within 1 second.

## NF3: Reliability and Availability

### Description
The system must maintain data integrity, ensure consistent operation, and provide high availability to users. It concerns the ability of the system to perform its required functions under stated conditions for a specified period of time, and to be accessible and operational when needed.

### Quantification
Reliability will be measured by the immutability and tamper-proofing of log entries, and the consistency of data. Availability will be measured by system uptime percentage and the success rate of automated data purging processes.

### Targets

1. **NFR3.1**: Log entries must be immutable and tamper-proof, verified by cryptographic hashing or similar integrity checks.

2. **NFR3.2**: Logs must be retained for a minimum of 5 months.

3. **NFR3.3**: Expired links must be purged within 1 hour of their expiration time.

4. **NFR3.4**: One-time links must expire automatically after download or expiration time, whichever comes first.

## NF4: Usability Requirements

### Description
The system's user interface must be intuitive, accessible, and provide clear and actionable feedback to users, facilitating efficient and error-free interaction.

### Quantification
Usability will be measured through user feedback, evaluation of task completion times for new users, and the clarity and helpfulness of error messages. Formal UX reviews and user testing will also quantify these aspects.

### Targets

1. **NFR4.1**: The user interface must visually distinguish between different permission levels clearly, aiding users in understanding their capabilities.

2. **NFR4.2**: All error messages must be user-friendly, localizable, and provide actionable guidance to help users resolve issues.

## NF5: Latency Requirements

### Description
The system must provide timely feedback and notifications to users, minimizing perceived delays in interaction and information delivery.

### Quantification
Latency will be measured by monitoring the delay between a system event (e.g. user action, internal trigger) and the corresponding visual update or notification delivery.

### Targets

1. **NFR5.1**: Progress indicators must update in real-time (less than 500 ms delay).

2. **NFR5.2**: Notification delivery (email/push/pop) must occur within 30 seconds of the triggering event.

## Architectural Mapping

| **Requirements** | **Architectural Strategies**                                                                                                                                                                                                                                                                       | **Architectural Pattern**                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Security**     | - Enforce client-side encryption using E2EE.<br>- Use Zero-Trust principles for inter-service communication.<br>- Isolate key management logic and vaulting in a dedicated service.<br>- Log and monitor critical/auth actions centrally.<br>- Restrict administrative interface via RBAC and MFA. | **End-to-End Encryption (E2EE)**: Ensures file contents are never exposed to the server, addressing NFR1.1, NFR1.5, NFR1.11, NFR1.12.<br>**Zero-Trust Architecture**: Authenticates all interactions independently, supporting NFR1.2, NFR1.3, NFR1.7, NFR1.8.<br>**Secure Key Management**: Isolates cryptographic processes and storage, fulfilling NFR1.10, NFR1.12, NFR1.13.<br>**Client-Side Logic Enforcement**: Prevents server from processing encrypted content, enforcing separation of duties (NFR1.11). |
| **Performance**  | - Separate responsibilities via microservices.<br>- Use asynchronous communication for non-critical tasks.<br>- Isolate and scale critical operations (e.g., uploads, signing).                                                                                                                    | **Microservices-Based Deployment**: Decouples logic, improving throughput and load handling (NFR2.1, NFR2.2).<br>**Event-Driven Communication**: Handles operations like logging and notifications asynchronously, reducing bottlenecks (NFR2.2, NF5).                                                                                                                                      |
| **Reliability**  | - Log all access and modifications.<br>- Automatically clean up expired resources.<br>- Validate and persist logs in immutable format.<br>- Isolate failure domains in microservices.                                                                                                              | **Event-Driven Communication**: Enables real-time cleanup and tamper-evident logging (NFR3.3, NFR3.4).<br>**Microservices-Based Deployment**: Fault isolation ensures failures don't cascade (NFR3.1, NFR3.2).<br>**Secure Key Management**: Enforces traceability and tamper proofing of admin actions and credentials (NFR3.1).                                                                                                                                                                                   |
| **Usability**    |- Structure UI using Model-View-Controller.<br>- Separate presentation, logic, and data handling for maintainability and clarity.<br>- Simplify development of multiple user-facing clients (e.g. web and mobile).<br> - Provide localized, accessible error messages.<br>- Distinguish user roles visually in the UI.<br>- Trace administrator actions in the backend.<br>- Ensure client handles encryption tasks with minimal friction. -                                                                                 | **Model-View-Controller (MVC)**: Organizes UI into clear layers: the **Model** manages data, the **View** renders UI, and the **Controller** handles user input and updates. This structure supports NFR4.1 and NFR4.2 by making the UI intuitive, easier to maintain, and testable.<br>**Client-Side Logic Enforcement**: Requires UX design that simplifies complex encryption processes (NFR4.1, NFR4.2).<br>**Zero-Trust Architecture**: Enforces role aware UI constraints and backend enforcement of permissions (NFR4.1).                                                                                                                                                                                                                                                                        |
| **Latency**      | - Use pub/sub or messaging queues for notifications.<br>- Ensure low-latency operations have dedicated channels.<br>- Push progress updates from client/server in real time.                                                                                                                       | **Event-Driven Communication**: Ensures near real-time updates for notifications and progress (NFR5.1, NFR5.2).<br>**Microservices-Based Deployment**: Allows low-latency services (e.g., notifications) to remain performant independently of heavier services (NFR5.2).                                                                |

---

## Architectural Patterns

### Drafts:

**Microservices architecture:**

*Reasoning:*
Allows for isolation of services. Allowing for independent scalability and flexibility in languages, as we plan to use GO for encrytion services.

**MVC Architecture:**

*Reasoning:*

Allows us to organize UI, and creates a separation of concerns. This will also help down the line with mobile development.  

**Event-driven Architecture:**


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
- Command Pattern – To queue and execute file operations like uploads/downloads.
---

## Constraints

- **End-to-End Encryption (E2EE):**  
  All files must be encrypted on the client before upload and decrypted only after download. This ensures that server-side components cannot access the file contents in plaintext. It impacts system design by limiting the ability to process, inspect, or search file contents on the server.

- **Zero-Trust Architecture:**  
  The system assumes no implicit trust between components. Each request must be authenticated and authorized independently. File contents remain 'invisible' to the server, reinforcing the separation of concerns between storage, access control, and identity.

- **Secure Key Management:**  
  Public/private key pairs must be securely generated, distributed, and stored. Only the sender and intended recipient(s) should have access to decryption keys. This constraint requires strong encryption standards, secure key exchange implementations, and safeguards for preventing unauthorized access.

- **Microservices-Based Deployment:**  
  The architecture is composed of independently deployable microservices. This requires containerized environments (e.g. Docker), secure services communication. It also enforces separation of concerns between components such as authentication, file storage, and notifications.

- **Scalability and Elasticity:**  
  Each microservice should be able to grow or shrink on its own depending on how much it’s being used. For example, if many users are uploading files, only the upload service needs to scale. This helps the system handle high traffic without slowing down.

- **Client-Side Logic Enforcement:**  
  Due to E2EE, operations such file previews, or metadata extraction cannot occur on the server. These must be handled entirely on the client, placing architectural limits on server responsibilities.

- **Event-Driven Communication:**  
  Actions like file upload, sharing, or download must trigger asynchronous events (e.g., logging, auditing, notifications). This requires an event-driven architecture using message queues or pub/sub systems.

- **Data Residency and Compliance:**  
  The platform must comply with South Africa’s data protection laws, especially POPIA. This means storing personal data securely and only in allowed regions, and deleting logs when no longer needed.

---

# Technology Requirements
<div align="left">
<a href="https://nextjs.org/" target="_blank"><img src="https://skillicons.dev/icons?i=nextjs" alt="Next.js" /></a>
<a href="https://tailwindcss.com/" target="_blank"><img src="https://skillicons.dev/icons?i=tailwind" alt="Tailwind CSS" /></a>
<a href="https://expressjs.com/" target="_blank"><img src="https://skillicons.dev/icons?i=express" alt="Express.js" /></a>
<a href="https://nodejs.org/" target="_blank"><img src="https://skillicons.dev/icons?i=nodejs" alt="Node.js" /></a>
<a href="https://golang.org/" target="_blank"><img src="https://skillicons.dev/icons?i=go" alt="Golang" /></a>
<a href="https://supabase.com/" target="_blank"><img src="https://skillicons.dev/icons?i=supabase" alt="Supabase" /></a>
<a href="https://postgresql.org/" target="_blank"><img src="https://skillicons.dev/icons?i=postgres" alt="Postgres" /></a>
<a href="https://owncloud.com/" target="_blank"><img src="https://skillicons.dev/icons?i=owncloud" alt="ownCloud" /></a>
</div>

## Technology Stack Overview

| Technology | Description |
|------------|-------------|
| **Next.js** | Main frontend framework, bootstrapped with `create-next-app` for React-based web application development. |
| **Tailwind CSS** | Utility-first CSS framework for fast and responsive UI styling. |
| **Express.js** + **Node.js** | Backend API server and routing logic for handling HTTP requests and business logic implementation. |
| **Golang** | Handles large file uploads efficiently for high performance. |
|**Postgres** | Database management system allowing for data saving.|
| **Supabase** | Backend-as-a-Service platform providing authentication and user management. 

For more information regarding technology choices, make reference to [Technology Used Documentation](./technologies_used.md)

# Versions of SRS documents

|VERSION  | LINK |
|--------|--------|
|Version 1| [Go to](./doc_versions/SRS_version1.md)|