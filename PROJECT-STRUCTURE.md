# Redirector Project Structure

This document provides an overview of the project structure to help new contributors understand the codebase.

## Directory Structure

```
redirector/
├── cli/                    # Command Line Interface
│   ├── index.js            # CLI entry point 
│   └── README.md           # CLI documentation
├── docs/                   # Documentation
│   ├── API.md              # API documentation
│   ├── ADMIN-UI.md         # Admin UI guide
│   ├── ARCHITECTURE.md     # Architecture overview
│   ├── CLI.md              # CLI documentation
│   ├── DEPLOYMENT.md       # Deployment instructions
│   ├── TOC.md              # Table of contents
│   ├── examples/           # Example use cases
│   └── index.md            # Documentation home
├── samples/                # Sample redirect files
│   ├── json/               # JSON format samples
│   ├── csv/                # CSV format samples
│   └── terraform/          # Terraform format samples
├── scripts/                # Utility scripts
│   ├── setup-project.sh    # Project setup script
│   ├── update-docs.sh      # Documentation update script
│   └── utils/              # Script utilities
│       └── extract_sample.js # Sample extraction script
├── src/                    # Source code
│   ├── schemas/            # Zod schemas
│   │   ├── file-formats.ts # File format schemas
│   │   └── redirect.ts     # Redirect schemas
│   ├── services/           # Core services
│   │   ├── formatService.ts # Format conversion service
│   │   └── redirectService.ts # Redirect handling service
│   ├── types/              # TypeScript type definitions
│   │   └── cloudflare.d.ts # Cloudflare type definitions
│   ├── utils/              # Utility functions
│   │   ├── admin-ui.ts     # Admin UI template
│   │   └── logger.ts       # Logging utility
│   └── index.ts            # Main entry point
└── test/                   # Tests
    ├── format.spec.ts      # Format service tests
    ├── index.spec.ts       # Main functionality tests
    └── tsconfig.json       # Test TypeScript configuration
```

## Key Files

### Configuration

- `wrangler.jsonc`: Cloudflare Worker configuration with environment settings
- `tsconfig.json`: TypeScript configuration
- `package.json`: Project dependencies and scripts
- `.eslintrc.json`: ESLint configuration for traditional config
- `eslint.config.js`: ESLint flat configuration
- `.prettierrc`: Prettier configuration
- `.env.example`: Environment variables template

### Source Code

- `src/index.ts`: Application entry point and API routes
- `src/services/redirectService.ts`: Main redirect logic and KV operations
- `src/services/formatService.ts`: File format handling and conversion
- `src/schemas/redirect.ts`: Zod schemas for redirects
- `src/schemas/file-formats.ts`: Schemas for different file formats
- `src/utils/logger.ts`: Pino logging configuration
- `src/utils/admin-ui.ts`: Admin UI HTML template
- `src/types/cloudflare.d.ts`: Cloudflare type definitions

### CLI

- `cli/index.js`: CLI tool entry point
- `cli/README.md`: CLI-specific documentation

### Documentation

- `docs/index.md`: Documentation home with introduction
- `docs/API.md`: Complete API reference
- `docs/ARCHITECTURE.md`: Architecture overview and design decisions
- `docs/CLI.md`: Comprehensive CLI documentation
- `docs/ADMIN-UI.md`: Admin UI guide with screenshots
- `docs/DEPLOYMENT.md`: Deployment instructions for different environments
- `docs/TOC.md`: Overall documentation table of contents
- `docs/examples/`: Directory with example use cases
  - `docs/examples/index.md`: Overview of examples
  - `docs/examples/a-b-testing.md`: A/B testing with redirects
  - `docs/examples/country-based-redirects.md`: Geo-targeting with redirects

### Sample Files

- `samples/json/simple.json`: Basic JSON redirect example
- `samples/json/full_example.json`: Comprehensive JSON example
- `samples/csv/full_example.csv`: CSV format example
- `samples/terraform/full_example.tf`: Terraform format example

## Technology Stack

- **Runtime**: Cloudflare Workers (Edge computing platform)
- **Language**: TypeScript (v5.5+)
- **API Framework**: Hono (lightweight web framework)
- **Storage**: Cloudflare KV (key-value storage)
- **Validation**: Zod 4 beta (schema validation)
- **Logging**: Pino (structured logging)
- **CLI**: Commander.js (command-line interface)
- **Testing**: Vitest (testing framework)
- **Linting**: ESLint v9 (code quality)
- **Formatting**: Prettier (code style)

## Development Workflow

1. Make changes to the source code
2. Run tests: `npm test` or `npm run test:run`
3. Check types: `npm run typecheck`
4. Format code: `npm run format`
5. Lint code: `npm run lint`
6. Run locally: `npm run dev`
7. Validate all: `npm run validate`
8. Deploy: `npm run deploy` or environment-specific deployment

## API Design Pattern

The API follows a RESTful design with these main concepts:

1. **Routes**: Defined in `src/index.ts` using Hono
2. **Validation**: Request and response validation with Zod schemas
3. **Services**: Business logic encapsulated in service classes
4. **Storage**: Data persistence with Cloudflare KV
5. **Error Handling**: Centralized error handling with proper status codes

## Code Style

The project follows these coding standards:

1. **TypeScript**: Strict mode with comprehensive type definitions
2. **Naming Conventions**: camelCase for variables/methods, PascalCase for classes/types
3. **Function Design**: Small, focused functions with clear responsibilities
4. **Comments**: JSDoc comments for public functions and methods
5. **Error Handling**: Proper error catching and logging
6. **Testing**: Unit tests for core functionality

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines on how to contribute to the project.