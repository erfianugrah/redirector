# Redirector Test Suite

This directory contains tests for the Redirector Worker.

## Test Files

- `index.spec.ts`: Tests for the main worker functionality and RedirectService
- `format.spec.ts`: Tests for the FormatService and file format parsers

## Test Configuration

- `env.d.ts`: TypeScript definitions for test environment
- `tsconfig.json`: TypeScript configuration for tests

## Running Tests

```bash
# Run tests in watch mode
npm test

# Run tests once
npm run test:run

# Run a specific test file
npx vitest run format.spec.ts
```

## Test Framework

The project uses Vitest with @cloudflare/vitest-pool-workers for testing Cloudflare Workers.