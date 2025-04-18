# Redirector Worker

A Cloudflare Worker that handles URL redirects with an admin UI and CLI for managing redirects in bulk. This project provides a complete solution for managing redirects at the edge using Cloudflare Workers with Hono, Zod, and KV storage.

[![NodeJS Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)](https://nodejs.org/en/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Table of Contents

- [Features](#features)
- [Getting Started](#getting-started)
- [CLI Documentation](#cli-documentation)
- [API Reference](#api-reference)
- [Admin UI Guide](#admin-ui-guide)
- [Advanced Redirect Features](#advanced-redirect-features)
- [File Formats](#file-formats)
- [Examples and Tutorials](#examples-and-tutorials)
- [Deployment Guide](#deployment-guide)
- [Project Architecture](#project-architecture)
- [Contributing](#contributing)
- [Future Enhancements](#future-enhancements)

## Features

- **Redirect Management**: Create, update, delete, and list redirects
- **Bulk Operations**: Upload and download redirects in multiple formats (JSON, CSV, Terraform)
- **Advanced Redirect Patterns**:
  - Path Parameters: `/products/:id` → `/items/:id`
  - Wildcard Captures: `/docs/*` → `/documentation/*`
  - Named Wildcards: `/files/:path*` → `/storage/:path*`
  - Absolute URLs: `https://old-domain.com/*` → `https://new-domain.com/*`
  - Cross-Domain Redirects with domain change support
- **Conditional Redirects**: Based on hostname, headers, query parameters, date ranges
- **Admin UI**: Web interface for managing redirects
- **CLI Tool**: Command-line interface for managing redirects
- **Structured Logging**: Comprehensive logging with Pino
- **Strong Typing**: End-to-end TypeScript with Zod validation
- **REST API**: Complete REST API for programmatic access

## Getting Started

### Prerequisites

- Node.js 18+
- Cloudflare account
- Cloudflare Workers CLI (Wrangler) v4+

### Quick Start

```bash
# Clone the repository
git clone https://github.com/yourusername/redirector.git
cd redirector

# Install dependencies
npm install

# Set up KV namespaces and environment (requires Cloudflare authentication)
wrangler login
npm run setup

# Start local development server
npm run dev
```

The development server will be available at http://localhost:8787.

### Directory Structure

```
redirector/
├── cli/                 # CLI tool
├── samples/             # Sample redirect files
│   ├── json/
│   ├── csv/
│   └── terraform/
├── src/                 # Source code
│   ├── schemas/         # Zod schemas
│   ├── services/        # Business logic
│   └── utils/           # Utilities
└── test/                # Tests
```

### Local Development

```bash
# Start development server with local storage
npm run dev

# Start with remote KV storage
npm run dev:remote

# Run tests
npm test

# Type check
npm run typecheck

# Lint
npm run lint
```

### Deployment

```bash
# Deploy to production
npm run deploy

# Deploy to development environment
npm run deploy:dev

# Deploy to staging environment
npm run deploy:staging
```

## CLI Documentation

The Redirector CLI provides a command-line interface for managing redirects, allowing for easy automation and integration with scripts and CI/CD pipelines.

### CLI Quick Start

```bash
# Set up the project (create KV namespaces and environment files)
npm run cli setup

# Configure the CLI with both local and remote URLs
npm run cli config --url http://localhost:8787 --remote-url https://redirector.workers.dev

# Add a redirect to local development server
npm run cli add /old-page /new-page

# Add a redirect to remote production server
npm run cli add /old-page /new-page --remote

# List all redirects (local)
npm run cli list

# List all redirects (remote)
npm run cli list --remote

# Upload redirects from a file (local)
npm run cli upload samples/json/full_example.json

# Upload redirects to remote environment
npm run cli upload samples/json/full_example.json --remote

# Download redirects in a specific format (local)
npm run cli download --format json --output redirects.json

# Download redirects from remote environment
npm run cli download --format json --output redirects.json --remote

# Extract sample redirects from a large file
npm run cli extract-sample large-redirects.json --count 10
```

### CLI Installation

#### Global Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/redirector.git
cd redirector

# Install globally
npm install -g .

# Use the CLI
redirector --help
```

#### Local Usage

```bash
# Clone the repository
git clone https://github.com/yourusername/redirector.git
cd redirector

# Install dependencies
npm install

# Use the CLI
npm run cli -- --help
```

### CLI Configuration

The CLI supports configuration via environment variables or the `config` command:

#### Environment Variables

```bash
# Set environment variables
export REDIRECTOR_API_URL="https://your-worker.example.workers.dev"
export REDIRECTOR_KV_NAMESPACE_ID="your-kv-namespace-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

#### Config Command

```bash
# Configure the CLI
redirector config --url https://your-worker.example.workers.dev --namespace your-kv-namespace-id --account your-account-id
```

### CLI Commands

#### Setup Project

```bash
redirector setup
```

Sets up the Redirector project by creating KV namespaces and a local environment file.

Example:
```bash
# Set up the project
redirector setup
```

This command:
1. Creates the REDIRECTS_KV namespace (production and preview)
2. Creates a .env.local file with default configuration
3. Provides guidance on next steps

#### Configuration

```bash
redirector config [options]
```

Options:
- `-u, --url <url>`: Local API URL (e.g., http://localhost:8787)
- `-r, --remote-url <url>`: Remote API URL (e.g., https://your-worker.workers.dev)
- `-n, --namespace <id>`: KV Namespace ID
- `-a, --account <id>`: Cloudflare Account ID

Example:
```bash
redirector config --url http://localhost:8787 --remote-url https://redirector.workers.dev
```

#### List Redirects

```bash
redirector list [options]
```

Lists all redirects with their source, destination, and status code.

Options:
- `--remote`: Use remote worker instead of local development server

Examples:
```bash
# List redirects from local worker
redirector list

# List redirects from remote worker
redirector list --remote
```

#### Add a Redirect

```bash
redirector add <source> <destination> [options]
```

Options:
- `-s, --status <code>`: HTTP status code (default: 301)
- `-q, --preserve-query`: Preserve query parameters (default: true)
- `-h, --preserve-hash`: Preserve hash fragment (default: true)
- `--no-enabled`: Disable this redirect
- `--remote`: Use remote worker instead of local development server

Examples:
```bash
# Basic redirect
redirector add /old-page /new-page

# Redirect with custom status code
redirector add /temp-page /final-page --status 302

# Redirect without preserving query parameters
redirector add /clean-page /target-page --no-preserve-query

# Add a disabled redirect
redirector add /future-page /target-page --no-enabled
```

#### Delete a Redirect

```bash
redirector delete <source>
```

Deletes a redirect with the specified source path.

Example:
```bash
redirector delete /old-page
```

#### Upload Redirects from File

```bash
redirector upload <file> [options]
```

Options:
- `-f, --format <format>`: File format (json, csv, terraform) - automatically inferred from file extension if not specified
- `-o, --overwrite`: Overwrite existing redirects
- `--to-worker`: Upload to worker API (default)
- `--to-kv`: Upload directly to KV using wrangler
- `--remote`: Use remote worker instead of local development server

Examples:
```bash
# Upload JSON file to local worker
redirector upload redirects.json

# Upload CSV file with overwrite to remote worker
redirector upload redirects.csv --overwrite --remote

# Upload Terraform file with explicit format
redirector upload rules.tf --format terraform

# Upload directly to KV (requires configured KV namespace)
redirector upload redirects.json --to-kv
```

#### Download Redirects

```bash
redirector download [options]
```

Options:
- `-f, --format <format>`: File format (json, csv, terraform) - required
- `-o, --output <file>`: Output file path (defaults to redirects.{json|csv|tf})
- `--from-worker`: Download from worker API (default)
- `--from-kv`: Download directly from KV using wrangler
- `--remote`: Use remote worker instead of local development server

Examples:
```bash
# Download as JSON from local worker
redirector download --format json

# Download as CSV with custom filename from remote worker
redirector download --format csv --output my-redirects.csv --remote

# Download as Terraform
redirector download --format terraform

# Download directly from KV (requires configured KV namespace)
redirector download --format json --from-kv
```

#### Extract Sample

```bash
redirector extract-sample <source-file> [options]
```

Extracts a sample of redirects from a source file and generates samples in all formats (JSON, CSV, and Terraform).

Options:
- `-o, --output-dir <dir>`: Output directory (default: ./samples)
- `-c, --count <number>`: Number of redirects to extract (default: 10)

Examples:
```bash
# Extract 10 redirects from a JSON file
redirector extract-sample redirects.json

# Extract 5 redirects from a Terraform file with custom output directory
redirector extract-sample redirect_list.tf --count 5 --output-dir ./demo-samples
```

### CLI Example Workflows

#### Basic Workflow

```bash
# Set up the project
redirector setup

# Configure CLI
redirector config --url http://localhost:8787 --remote-url https://redirector.workers.dev

# Add some redirects to local worker
redirector add /old-page /new-page
redirector add /temp-page /final-page --status 302

# List all redirects from local worker
redirector list

# Download as JSON from local worker
redirector download --format json --output redirects.json

# Make edits to redirects.json...

# Upload the edited file to remote worker
redirector upload redirects.json --overwrite --remote

# Verify changes in remote worker
redirector list --remote
```

#### Bulk Operations

```bash
# Extract sample redirects from a large file
redirector extract-sample large-redirects.json --count 20

# Process redirects from a Terraform file to remote worker
redirector upload cloudflare-redirects.tf --remote

# Export all redirects as CSV from remote worker for editing in spreadsheet
redirector download --format csv --output redirects.csv --remote

# After editing in a spreadsheet, upload the CSV to local worker
redirector upload redirects.csv --overwrite

# Verify changes in local worker
redirector list
```

#### CI/CD Integration

```bash
#!/bin/bash
# Example CI/CD script

# Configure CLI (using environment variables)
redirector config --url $REDIRECTOR_API_URL --remote-url $REDIRECTOR_REMOTE_API_URL

# Download current redirects from production
redirector download --format json --output current.json --remote

# Merge with new redirects from repository
jq -s '{ redirects: [ .[0].redirects[], .[1].redirects[] ] | unique_by(.source) }' \
   current.json new-redirects.json > merged.json

# Upload merged redirects to production
redirector upload merged.json --overwrite --remote

echo "Redirects updated successfully"
```

## API Reference

All API endpoints are relative to your worker's base URL:
- Local development: `http://localhost:8787`
- Production: `https://your-worker-name.your-account.workers.dev`

### API Endpoints

#### Redirect Management

- `GET /api/redirects`: List all redirects
- `POST /api/redirects`: Create a new redirect
- `DELETE /api/redirects/:source`: Delete a redirect

#### Bulk Operations

- `POST /api/redirects/bulk`: Create multiple redirects
- `POST /api/files/upload`: Upload redirects from a file
- `POST /api/files/download`: Download redirects in a specific format

#### Testing

- `POST /api/redirects/test`: Test if a URL would be redirected

### List All Redirects

```
GET /api/redirects
```

Returns a list of all configured redirects.

**Response:**
```json
{
  "redirects": {
    "/old-path": {
      "source": "/old-path",
      "destination": "/new-path",
      "statusCode": 301,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true
    },
    "/another-path": {
      "source": "/another-path",
      "destination": "/destination",
      "statusCode": 302,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true
    }
  }
}
```

### Create a Redirect

```
POST /api/redirects
```

Creates a new redirect.

**Request Body:**
```json
{
  "source": "/old-path",
  "destination": "/new-path",
  "statusCode": 301,
  "enabled": true,
  "preserveQueryParams": true,
  "preserveHash": true,
  "description": "Optional description",
  "conditions": {
    "hostname": "example.com",
    "queryParams": {
      "version": "2"
    },
    "headers": {
      "x-device": "mobile"
    },
    "dateRange": {
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    }
  }
}
```

### Create Multiple Redirects

```
POST /api/redirects/bulk
```

Creates multiple redirects at once.

**Request Body:**
```json
{
  "redirects": [
    {
      "source": "/path1",
      "destination": "/new-path1",
      "statusCode": 301,
      "enabled": true
    },
    {
      "source": "/path2",
      "destination": "/new-path2",
      "statusCode": 302,
      "enabled": true
    }
  ]
}
```

### Delete a Redirect

```
DELETE /api/redirects/:source
```

Deletes a redirect. The `:source` parameter should be URL-encoded.

### Upload Redirects from File

```
POST /api/files/upload
```

Uploads redirects from a file in JSON, CSV, or Terraform format.

**Request Body:**
```json
{
  "format": "json",  // "json", "csv", or "terraform"
  "content": "...",  // File content as a string
  "overwrite": false  // Whether to overwrite existing redirects
}
```

### Download Redirects as File

```
POST /api/files/download
```

Downloads all redirects in the specified format.

**Request Body:**
```json
{
  "format": "json"  // "json", "csv", or "terraform"
}
```

### Test a Redirect

```
POST /api/redirects/test
```

Tests if a URL would be redirected without actually performing the redirect.

**Request Body:**
```json
{
  "url": "https://example.com/old-path",
  "headers": {
    "User-Agent": "Mozilla/5.0...",
    "x-device": "mobile"
  }
}
```

## Advanced Redirect Features

The redirector supports several advanced redirect patterns:

### Path Parameters

You can use path parameters in your redirects with the `:param` syntax:

```json
{
  "source": "/products/:productId",
  "destination": "/new-products/:productId"
}
```

Multiple parameters are supported:

```json
{
  "source": "/blog/:year/:month/:slug",
  "destination": "/articles/:year/:month/:slug"
}
```

### Wildcard Captures

You can use wildcards to capture entire path segments:

```json
{
  "source": "/docs/*",
  "destination": "/documentation/*"
}
```

You can also use named wildcard parameters:

```json
{
  "source": "/legacy/:path*",
  "destination": "/new/:path*"
}
```

### Absolute URLs & Cross-Domain Redirects

Redirect between domains:

```json
{
  "source": "https://old-domain.com/*",
  "destination": "https://new-domain.com/*"
}
```

### Conditional Redirects

You can create conditional redirects based on hostname, query parameters, headers, and date ranges:

```json
{
  "source": "/page",
  "destination": "/new-page",
  "conditions": {
    "hostname": "example.com",
    "queryParams": {
      "version": "2"
    },
    "headers": {
      "x-device": "mobile"
    },
    "dateRange": {
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    }
  }
}
```

## File Formats

### JSON Format

```json
{
  "redirects": [
    {
      "source": "/old-path",
      "destination": "/new-path",
      "statusCode": 301,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true,
      "description": "Basic redirect"
    },
    {
      "source": "/products/:productId",
      "destination": "/items/:productId",
      "statusCode": 301,
      "enabled": true,
      "description": "Dynamic path parameter redirect"
    },
    {
      "source": "/docs/*",
      "destination": "/documentation/*",
      "statusCode": 301,
      "enabled": true,
      "description": "Wildcard path redirect"
    },
    {
      "source": "https://old-domain.com/*",
      "destination": "https://new-domain.com/*",
      "statusCode": 301,
      "enabled": true,
      "conditions": {
        "hostname": "old-domain.com"
      },
      "description": "Cross-domain redirect"
    }
  ]
}
```

### CSV Format

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/old-path,/new-path,301,true,true,true,Relative path redirect,example.com
https://old-domain.com/path,https://new-domain.com/path,301,true,true,true,Absolute URL redirect,old-domain.com
/products/:productId,/items/:productId,301,true,true,true,Dynamic path parameter capture,
/docs/*,/documentation/*,301,true,true,true,Wildcard path capture,
```

### Terraform Format

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Generated by Redirector"

  item {
    value {
      redirect {
        source_url            = "https://example.com/old-path"
        target_url            = "https://example.com/new-path"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }
  
  # Wildcard example
  item {
    value {
      redirect {
        source_url            = "https://example.com/docs/*"
        target_url            = "https://example.com/documentation/*"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "enabled"
      }
    }
  }
}
```

## Examples and Tutorials

### Country-Based Redirects

You can create redirects that only apply for visitors from specific countries using the `CF-IPCountry` header:

```json
{
  "source": "/",
  "destination": "/uk",
  "conditions": {
    "headers": {
      "CF-IPCountry": "GB"
    }
  }
}
```

This redirect will only apply to visitors from the United Kingdom.

### A/B Testing with Redirects

You can implement simple A/B testing by creating multiple redirects with conditions:

```json
{
  "source": "/landing",
  "destination": "/landing-a",
  "conditions": {
    "queryParams": {
      "experiment": "A"
    }
  }
}
```

```json
{
  "source": "/landing",
  "destination": "/landing-b",
  "conditions": {
    "queryParams": {
      "experiment": "B"
    }
  }
}
```

### Mobile Device Redirects

Detect mobile devices using the User-Agent header:

```json
{
  "source": "/",
  "destination": "/mobile",
  "conditions": {
    "headers": {
      "User-Agent": "(?i)(mobile|android|iphone)"
    }
  }
}
```

This uses a case-insensitive regular expression to match common mobile device identifiers in the User-Agent header.

### Seasonal Redirects

Create redirects that only apply during specific date ranges:

```json
{
  "source": "/",
  "destination": "/christmas",
  "conditions": {
    "dateRange": {
      "start": "2023-12-01T00:00:00Z",
      "end": "2023-12-26T23:59:59Z"
    }
  }
}
```

## Admin UI Guide

The Redirector Admin UI provides a web-based interface for managing redirects, accessible at the `/admin` endpoint of your worker.

### Accessing the Admin UI

The Admin UI is available at:

- Local development: `http://localhost:8787/admin`
- Production: `https://your-worker-name.your-account.workers.dev/admin`

### Features

The Admin UI offers the following features:

1. **Dashboard**: View basic statistics and redirect count
2. **Upload Redirects**: Upload redirects in JSON, CSV, or Terraform format
3. **Download Redirects**: Download redirects in various formats
4. **View Redirects**: Browse the list of configured redirects
5. **Delete Redirects**: Remove individual redirects

### Dashboard

The dashboard shows the total number of redirects currently configured in the system.

### Upload Redirects

This section allows you to upload redirects from a file in one of three supported formats:

1. Select the file format (JSON, CSV, or Terraform)
2. Paste the file content into the text area
3. Choose whether to overwrite existing redirects (checkbox)
4. Click the Upload button

The system will process the file, extract redirects, and add them to the database. If successful, you'll see a success message with statistics.

### Download Redirects

This section allows you to download all redirects in your preferred format:

Click the button for the format you want to download:
- JSON: Downloads as a JSON file with the redirects array
- CSV: Downloads as a CSV file with headers
- Terraform: Downloads as a Terraform file compatible with Cloudflare redirects

### View Redirects

The redirects table shows all currently configured redirects with the following information:

- Source URL
- Destination URL
- Status Code (301, 302, etc.)
- Enabled Status (Yes/No)
- Actions (Delete button)

The table automatically updates when:
- You upload new redirects
- You delete a redirect
- You click the Refresh button

### Delete Redirects

To delete a redirect:

1. Find the redirect in the redirects table
2. Click the Delete button in the Actions column
3. Confirm the deletion when prompted

### Refreshing Data

To refresh the data displayed in the Admin UI:

Click the Refresh button in the header to update the statistics and the redirects table with the latest data from the server.

### Security Considerations

The current implementation does not include authentication. In a production environment, you should secure the Admin UI by:

1. Adding authentication using Cloudflare Access or another authentication system
2. Implementing API keys or JWT tokens for API access
3. Restricting access to specific IP addresses or domains

## Deployment Guide

This section explains how to deploy the Redirector Worker to Cloudflare Workers and configure the required resources.

### Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/redirector.git
   cd redirector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create KV namespaces:
   ```bash
   npm run setup
   ```

4. Update `wrangler.jsonc` with your KV namespace IDs:
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "REDIRECTS_KV",
       "id": "your-kv-id-here", // Replace with production namespace ID
       "preview_id": "your-preview-kv-id-here" // Replace with preview namespace ID
     }
   ]
   ```

5. Configure environment variables in `wrangler.jsonc`:
   ```jsonc
   "vars": {
     "LOG_LEVEL": "info", // Options: trace, debug, info, warn, error, fatal, silent
     "ENABLE_DEBUG": "false" // Enable additional debug features
   }
   ```

### Deployment

To deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy the worker to your Cloudflare account using the configurations in `wrangler.jsonc`.

### Custom Domain (Optional)

To use a custom domain with your worker:

1. Add a custom domain in your Cloudflare Workers dashboard
2. Configure the DNS settings in your Cloudflare DNS dashboard
3. Update your application references to use the custom domain

### CI/CD Integration

#### GitHub Actions

Here's an example GitHub Actions workflow file (`.github/workflows/deploy.yml`):

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install Dependencies
        run: npm ci
      - name: Run Tests
        run: npm test -- --run
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          preCommands: npm run typecheck
```

You'll need to add a `CF_API_TOKEN` secret to your GitHub repository settings.

#### GitLab CI

Here's an example GitLab CI configuration (`.gitlab-ci.yml`):

```yaml
image: node:18

stages:
  - test
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run typecheck
    - npm test -- --run

deploy:
  stage: deploy
  script:
    - npm ci
    - npm run deploy
  environment:
    name: production
  only:
    - main
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
```

### Multiple Environments

To support multiple environments (development, staging, production):

1. Create environment-specific configurations in `wrangler.jsonc`:
   ```jsonc
   "env": {
     "dev": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "dev-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "debug",
         "ENABLE_DEBUG": "true"
       }
     },
     "staging": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "staging-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "info",
         "ENABLE_DEBUG": "true"
       }
     },
     "production": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "prod-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "info",
         "ENABLE_DEBUG": "false"
       }
     }
   }
   ```

2. Deploy to a specific environment:
   ```bash
   npm run deploy -- --env production
   ```

### Monitoring and Debugging

#### Logs

Logs are available in the Cloudflare Workers dashboard under "Logs" tab.

The worker uses Pino for structured logging, with log levels configurable via the `LOG_LEVEL` environment variable.

#### Troubleshooting

Common issues:

1. **KV Access Issues**: Ensure the KV namespace IDs are correctly set in `wrangler.jsonc`
2. **Wrangler Authentication**: If you see authentication errors, run `wrangler login` to authenticate
3. **Worker Limits**: Be aware of Cloudflare Workers limits, especially KV storage limits and CPU time

Useful commands:
```bash
# View recent logs
wrangler tail

# Check KV content
wrangler kv key get redirects --namespace-id=your-kv-namespace-id

# Purge KV namespace
wrangler kv key delete redirects --namespace-id=your-kv-namespace-id
```

### Backup and Recovery

To backup your redirects:
```bash
# Using the CLI
redirector download --format json --output backup.json --from-kv
```

To restore from backup:
```bash
# Using the CLI
redirector upload backup.json --overwrite --to-kv
```

## Project Architecture

### Core Components

1. **Core Application** - Cloudflare Worker using:
   - Hono for API routing
   - Zod for schema validation
   - Pino for structured logging
   - Cloudflare KV for data storage

2. **Components**:
   - **RedirectService**: Handles all redirect operations with KV storage
   - **FormatService**: Processes different file formats (JSON, CSV, Terraform)
   - **Admin UI**: Web interface for managing redirects
   - **CLI Tool**: Command-line interface for managing redirects

### Implementation Highlights

1. **Service-Oriented Architecture**:
   - Clear separation of concerns
   - Modularity for easy extension

2. **Strong Typing**:
   - End-to-end TypeScript with Zod validation
   - Runtime type safety

3. **Flexible Storage**:
   - Uses Cloudflare KV for data persistence
   - Can be extended to support other storage options

4. **Developer Experience**:
   - Easy local development
   - Full test coverage
   - CLI for automation

### API Design Pattern

The API follows a RESTful design with these main concepts:

1. **Routes**: Defined in `src/index.ts` using Hono
2. **Validation**: Request and response validation with Zod schemas
3. **Services**: Business logic encapsulated in service classes
4. **Storage**: Data persistence with Cloudflare KV
5. **Error Handling**: Centralized error handling with proper status codes

### Key Files

- `src/index.ts`: Application entry point and API routes
- `src/services/redirectService.ts`: Main redirect logic and KV operations
- `src/services/formatService.ts`: File format handling and conversion
- `src/schemas/redirect.ts`: Zod schemas for redirects
- `src/schemas/file-formats.ts`: Schemas for different file formats
- `cli/index.js`: CLI tool entry point

### Technology Stack

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

## Contributing

### Code of Conduct

In the interest of fostering an open and welcoming environment, we as contributors and maintainers pledge to make participation in our project a harassment-free experience for everyone.

### Development Workflow

1. Fork the repository
2. Clone your fork
3. Install dependencies:
   ```bash
   npm install
   ```
4. Set up the development environment:
   ```bash
   npm run setup
   npm run dev
   ```
5. Create a new branch for your feature or bugfix:
   ```bash
   git checkout -b feature/your-feature-name
   ```
6. Make your changes
7. Run tests:
   ```bash
   npm test
   ```
8. Check types:
   ```bash
   npm run typecheck
   ```
9. Commit your changes and push to your fork
10. Create a pull request

### Pull Request Process

1. Update documentation with details of changes
2. Update the CHANGELOG.md with the new version and changes
3. The PR should work with existing tests and include new tests if adding functionality
4. Ensure all CI checks pass
5. Get at least one review from a maintainer

### Coding Standards

We follow these coding standards:

- **TypeScript**: Use TypeScript for all code
- **Formatting**: Use 2 spaces for indentation
- **Error Handling**: Use try/catch blocks with proper error logging
- **Logging**: Use the logger utility for all logging
- **Documentation**: Add JSDoc comments for functions
- **Testing**: Write tests for new functionality

### Adding New Features

When adding new features:

1. **Schemas**: Add new schemas in `src/schemas/`
2. **Services**: Implement new services in `src/services/`
3. **API Endpoints**: Add new endpoints in `src/index.ts`
4. **Tests**: Add tests in `test/`
5. **Documentation**: Update documentation as needed

## Future Enhancements

1. Authentication for admin UI and API
2. More advanced redirect conditions
3. Rate limiting and caching
4. Analytics and reporting
5. Integration with CI/CD pipelines

## Testing

Run the test suite with:

```bash
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.