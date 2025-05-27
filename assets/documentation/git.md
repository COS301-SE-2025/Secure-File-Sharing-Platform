# Git Structure, Git Organization, and management.

## Mono-Repo Structure

This project uses a Mono-Repo approach, where both the backend (`sfsp-api`) and frontend(`sfsp-ui`) are contained in a single repository. 

```
/
├── assets/
├── sfsp-api/   
├── sfsp-ui/    
```

## Git Organization

- **Main Branches:**
  - `main`: Stable, production-ready code.
  - `dev`: Latest development code, merged from feature branches.

- **Component Branches:**
  - `componenet`: branches focusing on a single component, for example ui.


- **Feature Branches:**
  - Named as `feature/<component>/<short-description>` for new features.
  - Named as `bugfix/<component>/<short-description>` for bug fixes.
  - Named as `hotfix/<component>/<short-description>` for urgent production fixes.

- **Pull Requests:**
  - Pull requests into `dev` requires 2 members approvals.
  - Pull requests into `main` requires 4 members approval(1 member creates the pull request therefore showing their approval).

- **Commits:**
  - Clear and descriptive commit messages.

## Branching Strategy (Git Flow)

1. **Component:**
   - Create a branch from `dev`:  
     `git checkout -b <component>`
   - Open a PR to merge into `dev`.

1. **Feature Development:**
   - Create a branch from `component`:  
     `git checkout -b feature/<component>/<feature-name>`
   - Open a PR to merge into `<components>` or pull directly if needed.

2. **Bug Fixes:**
   - Create a branch from where the fixes are needed:  
     `git checkout -b bugfix/<component>/<bug-description>`
   - Merge/pull into branch that needed fixes.

3. **Release:**
   - When ready for release, merge `dev` into `main` via PR.
   - Tag the release on `main`.

4. **Hotfixes:**
   - Create a branch from `main`:  
     `git checkout -b hotfix/<issue> main`
   - Merge `main` back into `dev` to keep branches in sync.

## Management

- We use GitHub Issues and Projects for tracking tasks and bugs.
- we use code reviews for PRs.
