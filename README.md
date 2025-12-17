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
  - [Basic Setup](#basic-setup)
  - [Deployment Methods](#deployment-methods)
    - [Standalone Worker](#1-standalone-worker-zone-wide)
    - [Path-Specific Deployment](#2-path-specific-deployment)
    - [Service Binding Architecture](#3-service-binding-architecture-microservices)
    - [Hybrid/API Architecture](#4-hybridapi-architecture)
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

### Security Features

The Redirector Worker includes comprehensive security features to protect your redirects and prevent common attacks:

#### Authentication

API key authentication is **required** for accessing the Admin UI and API endpoints. The implementation uses:
- Constant-time string comparison to prevent timing attacks
- Support for both admin and read-only API keys
- Session-based storage in the browser (Admin UI)
- Header-based authentication (`X-API-Key` or `Authorization: Bearer`)

**Setup:**
```bash
# Set your admin API key (required)
wrangler secret put ADMIN_API_KEY

# Optional: Set a read-only API key for monitoring
wrangler secret put READ_API_KEY
```

**Usage:**
- **Admin UI**: Enter your API key in the authentication panel (stored in session storage)
- **CLI**: Pass `--api-key` flag or set `REDIRECTOR_API_KEY` environment variable
- **API**: Include `X-API-Key: your-key` header in all requests

#### URL Validation (Open Redirect Prevention)

Prevents attackers from using your redirects for phishing:
- Blocks dangerous URL schemes (javascript:, data:, file:, etc.)
- Only allows HTTP and HTTPS protocols
- Defaults to same-origin redirects only
- Optional domain whitelist with wildcard support

**Configuration:**
```bash
# In wrangler.jsonc vars section:
{
  "vars": {
    # Allow specific external domains (comma-separated)
    "ALLOWED_DOMAINS": "example.com,*.trusted.com,partner.net",

    # Enable external redirects (use with caution)
    "ALLOW_EXTERNAL_REDIRECTS": "false"
  }
}
```

**Examples:**
```javascript
// Same-origin (always allowed)
/old-path → /new-path

// External domain (requires ALLOWED_DOMAINS or ALLOW_EXTERNAL_REDIRECTS)
/external → https://trusted.com/path

// Blocked (dangerous schemes)
/malicious → javascript:alert(1)  // ❌ Blocked
/unsafe → data:text/html,...      // ❌ Blocked
```

#### Pattern Validation (ReDoS Prevention)

Prevents Regular Expression Denial of Service attacks:
- Maximum pattern length: 200 characters
- Whitelisted characters only: `[a-zA-Z0-9:/*_.\-?&=#+%@!~]`
- Blocks nested quantifiers and complex regex patterns
- Validates patterns before saving

**Safe patterns:**
```javascript
/old-path              // ✅ Simple path
/products/:id          // ✅ Path parameters
/docs/*                // ✅ Wildcards
/files/:path*          // ✅ Named wildcards
```

**Blocked patterns:**
```javascript
/(a+)+                 // ❌ Nested quantifiers (ReDoS risk)
/path/**/file          // ❌ Consecutive wildcards
/path<script>          // ❌ Invalid characters
```

#### CSV Injection Prevention

Protects exported CSV files from formula injection:
- Automatically sanitizes values starting with `=`, `+`, `@`, `-`
- Prefixes dangerous characters with single quote
- Prevents code execution in Excel/Google Sheets

#### Additional Security

- **Rate Limiting**: Consider implementing at Cloudflare level
- **IP Restrictions**: Use Cloudflare Access for IP-based access control
- **Audit Logging**: All authentication failures and blocked redirects are logged
- **Input Validation**: All API inputs validated with Zod schemas

### Security Best Practices

1. **Always use HTTPS** in production
2. **Rotate API keys** regularly
3. **Use READ_API_KEY** for monitoring tools
4. **Configure ALLOWED_DOMAINS** restrictively
5. **Monitor logs** for suspicious activity
6. **Keep secrets in Wrangler secrets**, never in code
7. **Test redirects** before deploying to production

## Deployment Guide

This section explains the different deployment approaches for the Redirector Worker, with specific attention to architectural considerations and integration with other services.

### Basic Setup

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

### Deployment Methods

There are several ways to deploy Redirector depending on your architectural needs:

#### 1. Standalone Worker (Zone-Wide)

This is the simplest deployment method where Redirector is the primary Worker handling all requests for your domain.

**Configuration (wrangler.jsonc):**
```jsonc
{
  "name": "redirector",
  "main": "src/index.ts",
  "routes": [
    "example.com/*"  // This will catch all requests to your domain
  ],
  // ...other configuration
}
```

**Command:**
```bash
npm run deploy
```

**Advantages:**
- Simple setup
- Handles all URL patterns
- Full control over the request lifecycle

**Limitations:**
- Cannot have other Workers on the same routes/paths
- All other functionality must be built into this Worker

#### 2. Path-Specific Deployment

Deploy Redirector to handle specific path patterns only.

**Configuration (wrangler.jsonc):**
```jsonc
{
  "name": "redirector",
  "main": "src/index.ts",
  "routes": [
    "example.com/legacy/*",
    "example.com/redirect/*"
  ],
  // ...other configuration
}
```

**Command:**
```bash
npm run deploy
```

**Advantages:**
- Can coexist with other Workers handling different paths
- More targeted deployment

**Limitations:**
- Doesn't handle redirects for paths not explicitly configured
- Requires careful route planning

#### 3. Service Binding Architecture (Microservices)

This advanced approach uses Cloudflare's Service Bindings to deploy Redirector as a service that can be called by a main "dispatcher" Worker. Service Bindings allow Workers to communicate directly without public URLs, with zero performance overhead and no additional cost.

**Step 1: Deploy Redirector as a service**

Configuration (redirector/wrangler.jsonc):
```jsonc
{
  "name": "redirector-service",
  "main": "src/index.ts",
  // No routes specified - will be bound to other Workers
  "compatibility_date": "2025-03-10",
  "kv_namespaces": [
    {
      "binding": "REDIRECTS_KV",
      "id": "your-kv-id-here"
    }
  ],
  "vars": {
    "LOG_LEVEL": "info",
    "ENABLE_DEBUG": "false"
  },
  "placement": {
    "mode": "smart"  // Enable Smart Placement for optimal performance
  }
}
```

Command:
```bash
cd redirector
wrangler deploy
```

**Step 2: Create a dispatcher Worker that uses Service Bindings**

Create a new dispatcher Worker with this configuration (dispatcher/wrangler.jsonc):
```jsonc
{
  "name": "edge-dispatcher",
  "main": "src/index.ts",
  "compatibility_date": "2025-03-10",
  "routes": [
    "example.com/*"
  ],
  "services": [
    { "binding": "REDIRECTOR", "service": "redirector-service" }
    // Other services can be bound here
  ],
  "placement": {
    "mode": "smart"  // Enable Smart Placement for co-location with bound services
  }
}
```

There are two methods to communicate with the Redirector service:

**Method 1: HTTP Interface (using fetch)**

Dispatcher Worker code:
```javascript
export default {
  async fetch(request, env, ctx) {
    // First check for redirects
    const redirectResponse = await env.REDIRECTOR.fetch(request.clone());
    if (redirectResponse.status >= 300 && redirectResponse.status < 400) {
      return redirectResponse;
    }
    
    // No redirect found, continue with normal request handling
    // ... other logic
    
    return fetch(request);
  }
};
```

**Method 2: RPC Interface (direct method calls, recommended for performance)**

First, enable RPC by exposing methods in the Redirector's main module:
```typescript
// In redirector/src/index.ts
export class Redirector {
  constructor(private env: Env) {}
  
  // Expose a method to check redirects
  async checkRedirect(url: string, headers: HeadersInit = {}) {
    const request = new Request(url, { headers });
    const redirectService = new RedirectService(this.env.REDIRECTS_KV);
    const redirectResult = await redirectService.matchRedirect(new URL(url), request);
    
    if (redirectResult.matched) {
      const response = redirectService.processRedirect(redirectResult, new URL(url));
      return {
        matched: true,
        location: response.headers.get('Location'),
        statusCode: response.status
      };
    }
    
    return { matched: false };
  }
}

export default {
  fetch: app.fetch,
  redirector: Redirector
};
```

Then use direct RPC calls in the dispatcher:
```javascript
export default {
  async fetch(request, env, ctx) {
    // Create an instance of the Redirector class
    const redirector = new env.REDIRECTOR.redirector(env);
    
    // Check for redirects using RPC (more efficient than HTTP)
    const redirectResult = await redirector.checkRedirect(request.url, request.headers);
    
    if (redirectResult.matched) {
      return Response.redirect(redirectResult.location, redirectResult.statusCode);
    }
    
    // No redirect found, continue with normal request handling
    // ... other logic
    
    return fetch(request);
  }
};
```

Command:
```bash
cd dispatcher
wrangler deploy
```

**Advantages:**
- Zero overhead or added latency compared to HTTP requests between Workers
- Modular architecture - separate services for different concerns
- Can have multiple Workers on the same zone without route conflicts
- Independent deployment and scaling for each service
- Promotes microservices patterns with clean interfaces
- Smart Placement optimizes Worker locations for better performance
- Isolates services from public internet for improved security

**Limitations:**
- More complex setup requiring multiple Worker configurations
- Requires managing multiple Workers and their dependencies
- Both Workers must be in the same Cloudflare account
- RPC interface requires careful design of service methods
- Needs additional code for the dispatcher Worker
- Testing locally requires running multiple Worker instances

#### 4. Hybrid/API Architecture

Deploy Redirector with dual functionality: standalone redirects and an API endpoint that other Workers can call.

**Example configuration:**
```javascript
// In Redirector's main handler
async function handleRequest(request, env) {
  const url = new URL(request.url);
  
  // API endpoint for other Workers to check redirects
  if (url.pathname === '/api/check-redirect') {
    const checkUrl = url.searchParams.get('url');
    const result = await checkRedirect(checkUrl, request.headers, env);
    return new Response(JSON.stringify(result), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
  
  // Normal redirect processing
  const redirect = await processRedirect(request, env);
  if (redirect) {
    return redirect;
  }
  
  // No redirect found
  return new Response('No redirect found', { status: 404 });
}
```

**Advantages:**
- Flexible - can be used directly or as a service
- Works with existing Worker architectures

**Limitations:**
- Requires HTTP requests between Workers (latency)
- More complex implementation
- Needs careful error handling

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
4. **Service Binding Issues**: Ensure service names match exactly and both Workers are deployed to the same account

Useful commands:
```bash
# View recent logs
wrangler tail

# View logs for a specific worker
wrangler tail --name redirector-service

# Check KV content
wrangler kv key get redirects --namespace-id=your-kv-namespace-id

# Purge KV namespace
wrangler kv key delete redirects --namespace-id=your-kv-namespace-id

# List all workers in your account (useful for service bindings)
wrangler whoami
wrangler worker list
```

#### Testing Service Bindings Locally

To test Service Bindings locally, you need to run multiple instances of wrangler:

1. First terminal: Run the Redirector service
```bash
cd redirector
wrangler dev --name redirector-service
```

2. Second terminal: Run the dispatcher Worker with local service binding
```bash
cd dispatcher
wrangler dev --local --service REDIRECTOR=redirector-service:localhost:8787
```

This connects the dispatcher to your locally-running Redirector service. You can then test the entire system by making requests to the dispatcher Worker.

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

## Service Binding Architecture Considerations

When implementing the Service Binding Architecture with Redirector, consider these best practices:

1. **Choose the Right Communication Method**:
   - Use RPC for most internal communications due to better performance
   - Use HTTP interface when you need to manipulate or examine the full HTTP request/response

2. **Design Clear Service Interfaces**:
   - Create well-defined methods with strong typing
   - Document the expected inputs and outputs
   - Consider versioning your service interfaces

3. **Error Handling**:
   - Implement proper error handling in both the service and the dispatcher
   - Establish fallback strategies if the service is unavailable
   - Use try/catch blocks around service calls

4. **Deployment Strategy**:
   - Consider using separate git repositories for each service
   - Set up CI/CD pipelines for each service
   - Implement a versioning strategy for your services

5. **Monitoring**:
   - Set up monitoring for each service individually
   - Track inter-service communication metrics
   - Use structured logging with correlation IDs

6. **Security Considerations**:
   - Service Bindings are not accessible to the public internet
   - Consider implementing request validation in both services
   - Implement principle of least privilege for each service

7. **Performance Optimization**:
   - Use Smart Placement to co-locate services
   - Minimize data transfer between services
   - Cache results where appropriate
   - Batch operations when possible

## Future Enhancements

1. Authentication for admin UI and API
2. More advanced redirect conditions
3. Rate limiting and caching
4. Analytics and reporting
5. Integration with CI/CD pipelines
6. Enhanced Service Binding support with more RPC methods
7. Multi-account Service Binding support
8. Performance metrics and dashboards

## Testing

Run the test suite with:

```bash
npm test
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.