# Contributing to Secure File Sharing Platform

Thank you for your interest in contributing to the Secure File Sharing Platform! We appreciate your help in making this project better. This guide will help you get started with contributing to our project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Can I Contribute?](#how-can-i-contribute)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Pull Request Process](#pull-request-process)
- [Community](#community)

## Code of Conduct

By participating in this project, you agree to maintain a respectful and inclusive environment. We expect all contributors to:

- Be respectful and considerate of others
- Accept constructive criticism gracefully
- Focus on what is best for the community and the project
- Show empathy towards other community members

## How Can I Contribute?

### Reporting Bugs

Before creating a bug report, please check the [existing issues](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/issues) to avoid duplicates.

When filing a bug report, include:

- A clear and descriptive title
- Steps to reproduce the issue
- Expected behavior vs actual behavior
- Screenshots or logs if applicable
- Your environment (OS, browser, Node.js version, etc.)

### Suggesting Enhancements

We welcome feature suggestions! Please open an issue with:

- A clear and descriptive title
- Detailed description of the proposed feature
- Use cases and benefits
- Any potential drawbacks or challenges

### Contributing Code

We welcome code contributions! See the sections below for our development workflow and standards.

## Getting Started

### Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **Go** (v1.21 or higher)
- **PostgreSQL** (v14 or higher)
- **Git**

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally:

```bash
git clone https://github.com/YOUR_USERNAME/Secure-File-Sharing-Platform.git
cd Secure-File-Sharing-Platform
```

3. Add the upstream repository:

```bash
git remote add upstream https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform.git
```

### Project Structure

This is a monorepo with the following structure:

```
Secure-File-Sharing-Platform/
├── sfsp-ui/          # Next.js frontend (main web app)
├── sfsp-admin/       # Electron admin dashboard
├── sfsp-api/         # Go backend services
├── assets/           # Documentation and assets
└── cypress/          # E2E tests
```

### Setting Up Development Environment

#### Frontend (sfsp-ui)

```bash
cd sfsp-ui
npm install
cp .env.example .env.local  # Configure your environment variables
npm run dev
```

The application will be available at `http://localhost:3000`

#### Admin Dashboard (sfsp-admin)

```bash
cd sfsp-admin
npm install
npm run dev
```

#### Backend (sfsp-api)

```bash
cd sfsp-api/services/fileService
go mod download
go run main.go
```

## Development Workflow

We follow the **GitFlow** branching model. Please read our [Coding Standards](./assets/CodingStandardsv4.pdf) for complete details.

### Branch Types

| Branch Type | Purpose | Naming Convention |
|------------|---------|-------------------|
| `main` | Production-ready code | `main` |
| `develop` | Integration branch for next release | `dev` |
| `feature/*` | New features | `feature/ui/login` |
| `bugfix/*` | Non-critical bug fixes | `bugfix/null-reference` |
| `hotfix/*` | Critical production fixes | `hotfix/fix-crash` |

### Creating a Feature Branch

1. Ensure your local `dev` branch is up to date:

```bash
git checkout dev
git pull upstream dev
```

2. Create a new feature branch:

```bash
git checkout -b feature/your-feature-name
```

3. Make your changes and commit them:

```bash
git add .
git commit -m "Add: brief description of your changes"
```

4. Push to your fork:

```bash
git push origin feature/your-feature-name
```

## Coding Standards

We maintain strict coding standards to ensure code quality and consistency. Please review our complete [Coding Standards Document](./assets/CodingStandardsv4.pdf).

### Key Guidelines

#### General Principles

- Follow **DRY** (Don't Repeat Yourself)
- Use meaningful variable and function names
- Avoid magic numbers; define constants
- Use environment variables for configuration
- Write comments for non-trivial logic
- Use camelCase for lengthy variables

#### JavaScript/TypeScript (Next.js)

- Use ESLint with Airbnb style guide
- Use PascalCase for classes
- Prefer `const` and `let` over `var`
- Use arrow functions unless context-bound `this` is needed
- Run linting before committing: `npm run lint`

#### Go (Backend)

- Use `gofmt` for formatting
- Use `golangci-lint` for linting
- Keep functions small and focused
- Error handling must be explicit
- Run: `gofmt -w .` and `golangci-lint run`

#### Python (If applicable)

- Follow Flake8
- Use snake_case for functions/variables, PascalCase for classes
- Use type hints where applicable
- Use `black` for autoformatting

### Secrets Management

- **NEVER** commit `.env` files or API keys
- Use `.gitignore` to exclude local config files
- Use environment variables or secret managers (e.g., Vault)

## Testing Guidelines

All code contributions must include appropriate tests. We aim for **70% or higher coverage** for critical components.

### Test Types

- **Unit Tests**: Jest, Cypress, Pytest, Testify
- **Integration Tests**: Cypress, Jest, Pytest, Testify
- **E2E Tests**: Cypress, Jest, Pytest, Testify

### Running Tests

#### Frontend Tests

```bash
cd sfsp-ui
npm test           # Run all tests
npm run cypress    # Open Cypress
```

#### Backend Tests

```bash
cd sfsp-api/services/fileService
go test ./...
```

### Test Naming Convention

For UI components: Each test file should match the component name.
- Component: `sidebar.js`
- Test file: `sidebar.cy.js`

## Pull Request Process

### Before Submitting

Ensure your PR meets the following criteria:

- [ ] Follows GitFlow branching model
- [ ] All tests pass
- [ ] Linting passes with no errors
- [ ] No secrets or `.env` files committed
- [ ] Follows language-specific coding standards
- [ ] Code is readable and well-documented
- [ ] Added/updated tests for new functionality
- [ ] Updated documentation if needed

### Submitting Your PR

1. Push your changes to your fork
2. Navigate to the [original repository](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform)
3. Click "New Pull Request"
4. Select your fork and branch
5. Fill out the PR template with:
   - Clear description of changes
   - Related issue numbers (if applicable)
   - Screenshots/GIFs for UI changes
   - Testing performed

### Review Process

- PRs to `dev` require **at least 2 reviewers**
- PRs to `main` require **4-5 reviewers**
- Address all review comments
- Keep your PR updated with the latest `dev` branch
- Respond to feedback promptly

### After Approval

Once approved and all checks pass:
- A maintainer will merge your PR
- Delete your feature branch
- Pull the latest changes from `dev`

## Documentation

### Updating Documentation

- Update [README.md](./README.md) for major changes
- Document API endpoints using markdown files
- Update relevant sections in `/assets/` documentation
- Keep comments and docstrings up to date

### Available Documentation

| Document | Link |
|----------|------|
| Software Requirements Specification | [SRS](./assets/SRSv5.pdf) |
| Coding Standards | [Coding Standards](./assets/CodingStandardsv4.pdf) |
| Testing Policy | [Testing Policy](./assets/TestingPolicyDocumentv2.pdf) |
| User Manual | [User Manual](./assets/UserManualv3.pdf) |
| Technical Installation Manual | [Installation Manual](./assets/TechnicalInstallationManualv3.pdf) |
| Security Document | [Security](./assets/Security%20Document.pdf) |

## Community

### Contact the Team

- **Email**: [cacheme.2025@gmail.com](mailto:cacheme.2025@gmail.com)
- **GitHub Issues**: [Issue Tracker](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/issues)
- **GitHub Projects**: [Project Board](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/projects)

### Getting Help

If you need help:

1. Check existing documentation
2. Search [existing issues](https://github.com/COS301-SE-2025/Secure-File-Sharing-Platform/issues)
3. Ask questions by opening a new issue
4. Contact the team via email

## Recognition

We value all contributions! Contributors will be:

- Listed in our project acknowledgments
- Credited in release notes
- Part of building a more secure internet

## Technology Stack

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=next.js&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![Go](https://img.shields.io/badge/Go-00ADD8?style=for-the-badge&logo=go&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white)

---

Thank you for contributing to the Secure File Sharing Platform! Together, we're building a more secure way to share files online.
