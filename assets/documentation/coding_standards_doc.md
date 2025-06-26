# Coding Standard Documentation

## Table of Contents

- [Overview](#overview)
- [Repository Structure](#repository-structure)
  - [Git flow](#git-flow)
  - [Branch Types](#branch-types)
  - [Rules](#rules)
- [Testing](#testing)
- [General Guidelines](#general-guidelines)
- [Language Specific Guidelines](#language-specific-guidelines)
  - [Javascript](#javascript)
  - [Python](#python)
  - [Go](#go)
- [Secrets Management](#secrets-management)
- [Documentation](#documentation)
- [Code Review Checklist](#code-review-checklist)
- [Tooling](#tooling)

---

## Overview

This document defines the coding standards, Git workflow (GitFlow), and language specific conventions to be followed by all developers in this project. The goal is to maintain readability, consistency, and collaborative efficiency.

---

## Repository Structure

* All the code that concerns the backend is in `/sfsp-api`. 
* All the frontend specific to a platform would have a separate folder independed from backend.
* Tests should reside in the `tests/` directory, of each component in the api services and UI.

### Git flow

We follow the [GitFlow](https://nvie.com/posts/a-successful-git-branching-model/) branching model:

### Branch Types

| Branch      | Purpose                                  | Naming Convention     |
| ----------- | ---------------------------------------- | --------------------- |
| `main`      | Production-ready code                    | `main`                |
| `develop`   | Integration of features for next release | `dev`             |
| `feature/*` | New features                             | `feature/login`  |
| `bugfix/*`  | Non-critical bug fixes                   | `bugfix/null-reference` |
| `hotfix/*`  | Critical production fixes                | `hotfix/fix-crash`    |

### Rules

* Never commit directly to `main` or `develop`.
* Always create Pull Requests (PRs) to merge into `develop`.
* PRs must be reviewed by **at least one** team member.
* PRs into dev must be reviewed by at least 2 members.
* PRs into main must be reviewed by all of the members.
* Use clear, concise commit messages.

## Testing

* Every feature and bugfix must include appropriate unit and/or integration tests.
* Use mock data instead of live services for integration tests.

## General Guidelines

* Follow **DRY** (Don't Repeat Yourself).
* Use meaningful variable and function names.
* Avoid magic numbers; define constants.
* Use environment variables for config, never hardcode secrets.
* Write docstrings/comments where the logic is non-trivial.
* Use camelCase for lengthy variables.

## Language Specific Guidelines

### Javascript

* Use **ESLint** with Airbnb style guide.
* Use `camelCase` for variables and functions, `PascalCase` for classes.
* Prefer `const` and `let` over `var`.
* Use arrow functions unless a method requires a context bound `this`.

#### Example: Axios Request

```js
import axios from 'axios';

// Good
async function fetchData() {
    try {
        const response = await axios.get('https://api.example.com/data');
        console.log(response.data);
    } catch (error) {
        console.error('Error fetching data:', error);
    }
}
```

### Python

* Follow **Flask8**.
* Use `snake_case` for functions and variables, `PascalCase` for classes.
* Use type hints where applicable.
* Use `black` for autoformatting.

#### Example: Python Good Practices

```python
from typing import List

class DataProcessor:
    def __init__(self, data_source: str):
        self.data_source = data_source

    def load_data(self) -> List[str]:
        """Load data from the data source."""
        with open(self.data_source, 'r') as file:
            return [line.strip() for line in file]

def process_items(items: List[str]) -> None:
    for item in items:
        print(f"Processing: {item}")

if __name__ == "__main__":
    processor = DataProcessor("data.txt")
    items = processor.load_data()
    process_items(items)
```

### Go

* Use `gofmt` for formatting.
* Use `golangci-lint` for linting.
* Keep functions small and focused.
* Error handling must be explicit.

**Example:**

```go
// Good
func FetchUser(id string) (*User, error) {
    res, err := http.Get(fmt.Sprintf("/api/users/%s", id))
    if err != nil {
        return nil, err
    }
    defer res.Body.Close()

    var user User
    if err := json.NewDecoder(res.Body).Decode(&user); err != nil {
        return nil, err
    }
    return &user, nil
}
```

---

## Secrets Management

* Never commit `.env` files or API keys.
* Use `.gitignore` to exclude local config files.
* Use environment variables or secret managers (e.g. Vault, AWS Secrets Manager).

## Documentation

* Update the `README.md` with every major change.
* Document API endpoints using markdown files for each api service where applicable.

## Code Review Checklist

Before merging any PR:

* [ ] Follows GitFlow
* [ ] Lint passes
* [ ] No secrets committed
* [ ] Follows language specific standards
* [ ] Code is readable and well documented

## Tooling

| Tool          | Purpose            |
| ------------- | ------------------ |
| ESLint        | JavaScript linting |
| Flask8        | Python formatting  |
| GolangCI-Lint | Go linting         |
| Prettier      | Code formatting    |
| Jest/PyTest   | Testing framework  |
| Markdown      | API documentation  |