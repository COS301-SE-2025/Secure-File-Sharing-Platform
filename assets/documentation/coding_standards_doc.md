# Coding Standard Documentation

## Table of Contents

| Content |  GO TO |
|------|------|
|General Guidelines|[Go to](#general-guidelines)|
|Language Specific Rules |[Go to](#language-specific-rules)|
|...... Golang|[Go to](#golang)|
|...... JavaScript|[Go to](#javascript)|
|Naming Rules|[Go to](#naming-rules)|
|Error Handling Rules|[Go to](#error-handling-rules)|
|Testing Rules |[Go to](#testing-rules)|
|Service Specific Rules|[Go to](#service-specific-rules)|
|...... File Service|[Go to](#file-service)|
|...... Key Service|[Go to](#key-service)|
|Documentation Rules |[Go to](#documentation-rules)|
|GIT Rules  |[Go to](#git-rules)|
|Security Rules|[Go to](#security-rules)|


----
## **General Guidelines**

- Write clean, readable, and maintainable code.
- Use comments only where necessary.
- Conduct regular code reviews for quality assurance.

----
## **Language Specific Rules**

### Golang

### JavaScript

----
## **Naming Rules**

- Avoid abbreviations for file/folder naming unless commonly understood.

-----
## **Error Handling Rules**

- Handle errors gracefully.
- Log errors with proper messages to assist with debugging.

-----
## **Testing Rules**

- Write unit tests for all new features.
- Use mocks appropriately.
- Maintain high test coverage.
- Run tests before committing.

-----
## **Service-Specific Rules**

### File Service

### Key Service

-----
## **Documentation Rules**

- Document all APIs.
- Mainly try to use MArkdown files.

-----
## **GIT Rules**

- Write clear commit messages.
- For naming strategies make reference to : [Git Structure, Git Organization, and management document](./git.md) 

----
## **Security Rules**

- Validate all inputs.
- Avoid having object files, dot files, editor config, database configs, or passwords added to the repo at all times. *( weekly checks will be done regarding this )* 
