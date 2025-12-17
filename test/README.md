# Redirector Test Suite

This directory contains tests for the Redirector Worker.

## Test Files

- `index.spec.ts`: Tests for the main worker functionality and RedirectService
- `format.spec.ts`: Tests for the FormatService and file format parsers

## Test Configuration

- `env.d.ts`: TypeScript definitions for test environment
- `tsconfig.json`: TypeScript configuration for tests
- `vitest.config.mts`: Vitest configuration with Cloudflare Workers pool

## Running Tests

```bash
# Run all tests once
npm test

# Run tests with coverage
npm run test:coverage

# Run a specific test file
npx vitest run test/format.spec.ts
```

## Test Framework

The project uses Vitest with `@cloudflare/vitest-pool-workers` for testing Cloudflare Workers in a realistic environment.