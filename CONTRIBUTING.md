# Contributing to Redirector

Thank you for considering contributing to Redirector! This document provides guidelines and instructions for contributing to the project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing](#testing)
- [Documentation](#documentation)

## Code of Conduct

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to make participation in our project a harassment-free experience for everyone.

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account (for testing with KV)
- Git

### Setup

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/your-username/redirector.git
   cd redirector
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the development environment:
   ```bash
   npm run dev
   ```

## Development Workflow

1. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
   or
   ```bash
   git checkout -b fix/your-bugfix-name
   ```

2. Make your changes

3. Run tests to make sure everything is working:
   ```bash
   npm test -- --run
   ```

4. Run the TypeScript type checker:
   ```bash
   npm run typecheck
   ```

5. Commit your changes with a clear message:
   ```bash
   git commit -m "Add feature: your feature description"
   ```

6. Push to your fork:
   ```bash
   git push origin feature/your-feature-name
   ```

7. Create a pull request

## Pull Request Process

1. Update the README.md or documentation with details of changes if appropriate
2. Update the CHANGELOG.md with the new version and changes
3. The PR should work with existing tests and include new tests if adding functionality
4. Ensure all CI checks pass
5. Get at least one review from a maintainer

## Coding Standards

We follow these coding standards:

- **TypeScript**: Use TypeScript for all code
- **Formatting**: Use 2 spaces for indentation
- **Error Handling**: Use try/catch blocks with proper error logging
- **Logging**: Use the logger utility for all logging
- **Documentation**: Add JSDoc comments for functions
- **Testing**: Write tests for new functionality

## Project Structure

The project is organized as follows:

```
redirector/
├── cli/               # CLI tool
├── docs/              # Documentation
├── scripts/           # Utility scripts
├── src/
│   ├── schemas/       # Zod schemas
│   ├── services/      # Core services
│   ├── utils/         # Utility functions
│   └── index.ts       # Main entry point
└── test/              # Tests
```

## Adding New Features

When adding new features:

1. **Schemas**: Add new schemas in `src/schemas/`
2. **Services**: Implement new services in `src/services/`
3. **API Endpoints**: Add new endpoints in `src/index.ts`
4. **Tests**: Add tests in `test/`
5. **Documentation**: Update documentation in `docs/`

## Testing

We use Vitest for testing. Run tests with:

```bash
npm test -- --run
```

When adding new features, add tests for:
- Happy path (expected behavior)
- Edge cases
- Error handling

## Documentation

Keep documentation up to date:

1. Update `README.md` for major changes
2. Update API documentation for new endpoints
3. Add examples for new features
4. Update CLI documentation for new commands

## Versioning

We use [SemVer](http://semver.org/) for versioning:
- MAJOR version for incompatible API changes
- MINOR version for new functionality in a backward-compatible manner
- PATCH version for backward-compatible bug fixes

## License

By contributing, you agree that your contributions will be licensed under the project's license.