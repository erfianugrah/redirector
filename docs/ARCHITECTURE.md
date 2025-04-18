# Redirector Architecture

This document describes the architecture of the Redirector Worker, including its components, data flow, and design decisions.

## Overview

The Redirector Worker is a Cloudflare Worker application that manages and processes URL redirects. It provides a flexible system for configuring redirects with various conditions and supports multiple file formats for bulk operations.

## Architecture Diagram

```
┌────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Client        │     │  Redirector     │     │  KV Storage     │
│  Browser       │────▶│  Worker         │────▶│  REDIRECTS_KV   │
└────────────────┘     └─────────────────┘     └─────────────────┘
                              │  ▲
                              │  │
                              ▼  │
┌────────────────┐     ┌─────────────────┐
│  Admin UI      │────▶│  API Endpoints  │
│  /admin        │     │  /api/*         │
└────────────────┘     └─────────────────┘
                              │  ▲
                              │  │
                              ▼  │
┌────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  CLI Tool      │────▶│  Format Service │────▶│  File Formats   │
│  redirector    │     │                 │     │  JSON/CSV/TF    │
└────────────────┘     └─────────────────┘     └─────────────────┘
```

## Components

### 1. Core Services

#### RedirectService

The `RedirectService` is the central component responsible for:
- Matching incoming requests against configured redirects
- Managing redirects in KV storage
- Processing redirect conditions and parameters

Key methods:
- `matchRedirect`: Match a URL against stored redirects
- `processRedirect`: Generate a redirect response
- `saveRedirect`: Save a new redirect
- `saveBulkRedirects`: Save multiple redirects
- `deleteRedirect`: Delete a redirect
- `getRedirectMap`: Retrieve all redirects

#### FormatService

The `FormatService` handles parsing and exporting redirects in different file formats:
- JSON: Standard format for all redirects
- CSV: Simple tabular format for easy editing
- Terraform: Compatible with Cloudflare's redirect list format

Key methods:
- `parseContent`: Parse content in various formats into redirects
- `exportRedirects`: Export redirects to the specified format

### 2. API Layer

The API layer is built using the Hono framework and provides the following endpoints:

- `GET /health`: Health check endpoint
- `GET /*`: Handle redirect requests
- `GET /api/redirects`: List all redirects
- `POST /api/redirects`: Create a new redirect
- `POST /api/redirects/bulk`: Create multiple redirects
- `DELETE /api/redirects/:source`: Delete a redirect
- `POST /api/redirects/test`: Test a redirect without applying it
- `POST /api/files/upload`: Upload redirects from a file
- `POST /api/files/download`: Download redirects in a specific format
- `GET /admin`: Admin UI for managing redirects

### 3. Storage

The application uses Cloudflare KV for data storage:
- `REDIRECTS_KV`: KV namespace for storing redirects
- Key structure: Single `redirects` key containing a JSON map of all redirects

### 4. Schemas and Validation

The application uses Zod for schema validation:
- `RedirectSchema`: Schema for individual redirects
- `BulkRedirectsSchema`: Schema for bulk redirect operations
- `FileUploadSchema`: Schema for file upload requests
- `FileDownloadSchema`: Schema for file download requests
- Format-specific schemas: `CsvRedirectSchema`, `TerraformRedirectItemSchema`

### 5. Logging

The application uses Pino for structured logging:
- Configurable log levels via environment variables
- JSON formatted logs for easy parsing
- Context-aware logging for requests and operations

### 6. User Interfaces

#### Admin UI

Web-based interface for managing redirects:
- Upload/download redirects in different formats
- View and delete existing redirects
- Basic statistics

#### CLI Tool

Command-line interface for managing redirects:
- Configure connection settings
- List, add, and delete redirects
- Upload and download redirect files
- Direct KV access via Wrangler

## Data Flow

### Request Flow

1. Client makes a request to the worker
2. The worker checks if the URL matches any configured redirects
3. If a match is found, the worker generates a redirect response
4. If no match is found, the request continues to the next handler

### Admin Flow

1. User accesses the Admin UI at `/admin`
2. User uploads a file or performs other operations
3. The Admin UI makes API requests to the worker
4. The worker processes the requests and updates KV storage
5. The Admin UI displays the results

### CLI Flow

1. User runs a CLI command
2. The CLI makes API requests to the worker
3. The worker processes the requests and updates KV storage
4. The CLI displays the results

## Design Decisions

### 1. Service-Oriented Architecture

The application uses a service-oriented architecture to separate concerns:
- `RedirectService`: Handles redirect operations
- `FormatService`: Handles file format operations
- This separation allows for easy extension and maintenance

### 2. Schema Validation with Zod

The application uses Zod for schema validation:
- Runtime type safety
- Clear validation errors
- Self-documenting schemas

### 3. Single KV Key Design

The application uses a single KV key (`redirects`) to store all redirects:
- Simpler transaction model (atomic updates)
- Reduces KV read operations
- Trade-off: Requires loading all redirects into memory

### 4. Flexible Redirect Conditions

The redirect system supports various conditions:
- Hostname matching
- Query parameter matching
- Header matching
- Date range matching
- This flexibility allows for complex redirect rules

### 5. Path Parameters

The redirect system supports path parameters:
- Format: `/products/:productId` → `/new-products/:productId`
- This allows for dynamic path handling without needing regex

### 6. Multiple File Formats

Support for multiple file formats:
- JSON: Standard format for all redirects
- CSV: Simple format for spreadsheet editing
- Terraform: Compatible with Cloudflare configuration
- This flexibility allows for easy integration with different workflows

## Scalability Considerations

### KV Storage

KV storage has some limitations to be aware of:
- Maximum value size: 25MB
- Maximum number of keys: Unlimited
- Reads are globally replicated, writes are regional

For large redirect sets:
- Consider splitting redirects into multiple keys
- Implement caching for frequently accessed redirects

### Worker Performance

Worker execution limits:
- CPU time: 50ms on free plan, 30s on paid plan
- Memory: 128MB
- These limits should accommodate thousands of redirects

### Optimization Techniques

For large-scale deployments:
- Use more efficient data structures for matching
- Implement caching for redirect lookups
- Consider sharding redirects by path prefix