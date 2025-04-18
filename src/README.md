# Redirector Source Code Structure

This directory contains the source code for the Redirector Worker.

## Directory Structure

- `/schemas`: Zod schema definitions for data validation
  - `redirect.ts`: Schemas for redirect entities
  - `file-formats.ts`: Schemas for file format handling (JSON, CSV, Terraform)

- `/services`: Core business logic
  - `redirectService.ts`: Main service for handling redirects
  - `formatService.ts`: Service for parsing and exporting different file formats

- `/utils`: Utility functions and helpers
  - `logger.ts`: Centralized logging configuration
  - `admin-ui.ts`: Admin UI HTML template generator

## Main File

- `index.ts`: Application entry point with Hono routing setup

## Code Style

All code follows these conventions:
- TypeScript with strict typing
- Zod for schema validation
- Pino for logging
- Hono for API routing
- 2-space indentation
- Single quotes for strings