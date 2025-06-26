# Technology Choices

This section evaluates at least three technology options per system component. For each, we provide a  overview, pros and cons, and a clear justification for the selected choice.

# Frontend Framework

## Overview
The frontend manages the user interface and system interaction. It must be performant and easily styled.

|Framework	|Pros	|Cons|
|-|-|-|
|React + Next.js + Tailwind CSS	| Reusable component-based architecture, large ecosystem, and cross-platform consistency.	|Fast-evolving ecosystem, learning curve|
|Angular	|Built-in features, strong CLI, two-way binding	|Heavier setup, complex for small teams|
|Vue.js|	Simple syntax, lightweight, great for rapid dev	|Smaller community, less opinionated|

✅**Selected:** React + Next.js + Tailwind CSS
- **Justification:**  Combines React’s modular design with Next.js’s server-side rendering and Tailwind CSS’s utility-first styling, making it ideal for scalable and SEO-friendly apps

---

# Backend Framework

## Overview  
The backend handles services ,such as file encryption and key management, and database/API operations.

| Framework           | Pros                                              | Cons                                           |
|-|-|-|
| **Express.js (Node.js)** | Lightweight, RESTful APIs, full JS stack         | Manual error handling, scalability limits       |
| **Spring Boot (Java)**  | Robust, scalable, microservices-ready            | Heavy, steeper learning curve                   |
| **ASP.NET Core (C#)**   | High performance, scalable, secure               | Windows-first, steep learning curve             |

**✅ Selected: Express.js (Node.js)**  
- **Justification:** Lightweight and fast for REST APIs, fits with full-stack JavaScript, and ideal for rapid development and modular encryption/middleware logic.

---

# Data Storage

## Overview  
The platform needs persistent, secure, and real-time data storage.

| Storage     | Pros                                                  | Cons                          |
|-|-|-|
| **Supabase**| Open-source, real-time sync, built-in auth            | Limited analytics             |
| **Firebase**| Scalable, auth & hosting included                     | Vendor lock-in, pricing at scale |
| **MongoDB** | Schema-less, scalable                                 | Schema validation can be complex |

**✅ Selected: Supabase**  
- **Justification:** SQL-based, with real-time features, file storage, and auth. Aligns with **open-source philosophy** and simplifies integration with frontend and backend.

---

# Code Editor / IDE

## Overview  
Tool used to write, debug, and maintain source code.

| IDE              | Pros                                 | Cons                         |
|-|-|-|
| **VS Code**       | Lightweight, extensions, Git integration | Lacks full IDE depth         |
| **Visual Studio** | Powerful for .NET, enterprise-grade     | Heavy, Windows-only          |
| **Vim/Neovim**    | Fast, customizable                      | Steep learning curve         |

**✅ Selected: VS Code**  
- **Justification:** Perfect balance of power and simplicity. Ideal for **JavaScript/Node.js** workflows, team collaboration, and containerized dev environments.

---

# CI/CD Pipeline

## Overview  
Automates testing, building, and deployment workflows.

| Tool               | Pros                                          | Cons                           |
|-|-|-|
| **GitHub Actions** | Native GitHub integration, easy to configure  | Slower builds                  |
| **Azure DevOps**   | Full DevOps suite, approval flows             | Complex setup                  |
| **Octopus Deploy** | Strong CD, visual pipelines                   | Paid, separate CI tool needed  |

**✅ Selected: GitHub Actions**  
- **Justification:** Built directly into GitHub, supports **branch-based workflows** and integrates seamlessly with our source control and testing tools.

---

## Version Control & Collaboration

## Overview  
Tracks changes, enables collaboration, and supports CI/CD integrations.

| Platform    | Pros                                           | Cons                            |
|-|-|-|
| **GitHub**  | Open-source community, CI/CD integration       | Basic project management        |
| **GitLab**  | Rich features, self-hosted option               | Resource heavy                  |
| **Bitbucket**| Good for small teams                          | Dated UI, smaller ecosystem     |

**✅ Selected: GitHub**  
- **Justification:** Centralized version control, integrated with GitHub Actions for CI/CD, and supports **team workflows** with issues, pull requests, and project boards.

---

# Cloud Infrastructure

## Overview  
Used for encrypted file storage, sharing, and collaboration.

| Platform     | Pros                                           | Cons                        |
|-|-|-|
| **Nextcloud**| Open-source, secure, API support               | May need performance tuning |
| **ownCloud** | Lightweight, fast updates                      | Inconsistent releases       |
| **Dropbox**  | Easy integration, stable                       | Not privacy-focused         |

**✅ Selected: Nextcloud**  
- **Justification:** **Self-hosted**, open-source, secure APIs. Ideal for a **privacy-first application** with full control over file storage and user access.

---

# Testing Stack

## Overview  
Ensures application reliability, correctness, and integration safety.

| Stack                       | Pros                                               | Cons                                  |
|-|-|-|
| **Jest + RTL + Cypress**   | Supports all levels of testing, good TS support    | Heavy in large monorepos              |
| **Vitest**                 | Fast, Vite-compatible                              | Smaller community                     |
| **Mocha + Chai**           | Mature, customizable                              | Requires more setup                   |

**✅ Selected: Jest + RTL + Cypress**  
- **Justification:** Covers unit, integration, and E2E testing, with wide community support and tools for both frontend and backend testing.

---

# Encryption & Authentication

## Overview  
Ensures data privacy, secure key exchange, and authenticated user sessions.

| Combination                         | Pros                                                                 | Cons                                                                 |
|------------------------------------|----------------------------------------------------------------------|----------------------------------------------------------------------|
| **AES-256 + RSA + JWT**            | - Strong encryption and widely adopted standards  <br> - JWT supports stateless auth  <br> - RSA is well understood and secure | - RSA is slower for large key sizes <br> - No forward secrecy <br> - JWT tokens require proper storage and expiration handling |
| **AES-256 + X3DH + Auth Cookies**  | - End-to-end encryption with forward secrecy  <br> - Secure session cookies resist XSS <br> - X3DH is ideal for asynchronous secure messaging | - Requires more complex session handling <br> - Cookies can be affected by CSRF without proper protection <br> - X3DH can be complex to implement |
| **AES-256 + X3DH + JWT**           | - Combines modern encryption with forward secrecy <br> - Stateless, scalable auth with JWT <br> - Ideal for APIs and microservices | - JWT can be stolen if not secured properly <br> - X3DH requires key pre-distribution <br> - Requires careful session expiration and renewal logic |

**✅ Selected: AES-256 + X3DH + JWT**  
- **Justification:** This combination provides strong encryption (AES-256), a modern and secure key exchange mechanism (X3DH) suitable for asynchronous communication, and JWT-based session management, which enables stateless and scalable authentication. Together, they fulfill both the security and usability requirements of the Secure Share platform.

---

# Secrets Management & Key Storage

## Overview
Secure storage and management of encryption keys, API credentials, and sensitive configuration.

| Platform               | Pros                                                  | Cons                                           |
|-----------------------|-------------------------------------------------------|------------------------------------------------|
| **HashiCorp Vault**    | - Enterprise-grade security <br> - Dynamic secrets <br> - Access control & audit logs | - Complex initial setup <br> - Requires proper HA config |
| **AWS Secrets Manager**| - Native AWS integration <br> - Auto-rotation <br> - IAM integration | - Vendor lock-in <br> - Per-secret pricing <br> - Regional limitations |
| **Azure Key Vault**    | - Microsoft ecosystem integration <br> - Managed HSM <br> - Certificate management | - Azure-specific <br> - Complex RBAC model <br> - Higher latency |

**✅ Selected: HashiCorp Vault**  
- **Justification:** HashiCorp Vault provides enterprise-grade security with fine-grained access control, audit logging, and dynamic secrets generation. As an open-source solution, it avoids vendor lock-in while offering enterprise-level security features, making it ideal for our sensitive key management needs.

---

# Vault Service Implementation Language

## Overview
Programming language used to implement secure interaction with the vault service for key management.

| Language        | Pros                                                  | Cons                                           |
|----------------|-------------------------------------------------------|------------------------------------------------|
| **Python**      | - Extensive crypto/security libraries <br> - Clean, readable syntax <br> - Strong HashiCorp SDK | - Slower execution <br> - GIL limitations for threading |
| **Go**          | - Performant <br> - Strongly typed <br> - Native HashiCorp language | - Steeper learning curve <br> - Less extensive library ecosystem |
| **Node.js**     | - JavaScript ecosystem consistency <br> - Async by default <br> - Fast development | - Less mature crypto libraries <br> - Dependency management complexity |

**✅ Selected: Python**  
- **Justification:** Python was selected for the Vault service implementation due to its comprehensive security-focused libraries, excellent HashiCorp Vault SDK support, and readable syntax that enhances security audit capabilities. For security-critical components like key management, Python's robust ecosystem provides the right balance of security, maintainability, and development speed.