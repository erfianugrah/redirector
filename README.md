# Redirector Worker

A Cloudflare Worker that handles URL redirects with an admin UI and CLI for managing redirects in bulk. This project provides a complete solution for managing redirects at the edge using Cloudflare Workers with Hono, Zod, and KV storage.

[![NodeJS Version](https://img.shields.io/badge/node-%3E%3D%2018.0.0-brightgreen.svg)](https://nodejs.org/en/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

## Features

- **Redirect Management**: Create, update, delete, and list redirects
- **Bulk Operations**: Upload and download redirects in multiple formats (JSON, CSV, Terraform)
- **Flexible Redirect Rules**: Support for path parameters, query parameters, and conditional redirects
- **Admin UI**: Web interface for managing redirects
- **CLI Tool**: Command-line interface for managing redirects
- **Advanced Conditions**: Redirect based on headers, hostname, query parameters, and date ranges
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

# Set up KV namespaces (requires Cloudflare authentication)
npm run scripts:setup

# Start local development server
npm run dev
```

The development server will be available at http://localhost:8787.

### Directory Structure

```
redirector/
├── cli/                 # CLI tool
├── docs/                # Documentation
├── samples/             # Sample redirect files
│   ├── json/
│   ├── csv/
│   └── terraform/
├── scripts/             # Utility scripts
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

### CLI Tool

The project includes a CLI tool for managing redirects:

```bash
# Configure the CLI
npm run cli config --url http://localhost:8787

# Add a redirect
npm run cli add /old-page /new-page

# List all redirects
npm run cli list

# Upload redirects from a file
npm run cli upload samples/json/full_example.json

# Download redirects in a specific format
npm run cli download --format json --output redirects.json

# Test a redirect
npm run cli add /test /destination
curl -I http://localhost:8787/test
```

For more details, see the [CLI documentation](docs/CLI.md).

## Documentation

Comprehensive documentation is available in the [docs](docs/) directory:

- [Getting Started](docs/index.md) - Introduction and quick start guide
- [Architecture Overview](docs/ARCHITECTURE.md) - System design and components
- [API Reference](docs/API.md) - Complete API documentation
- [Admin UI Guide](docs/ADMIN-UI.md) - Web interface usage
- [CLI Documentation](docs/CLI.md) - Command-line tool reference
- [Deployment Guide](docs/DEPLOYMENT.md) - Deployment instructions and environments
- [Example Use Cases](docs/examples/index.md) - Common redirect scenarios

For contributors:
- [Contributing Guide](CONTRIBUTING.md) - How to contribute to the project
- [Project Structure](PROJECT-STRUCTURE.md) - Detailed code organization

## Usage

### Admin UI

The admin UI is available at `/admin` and allows you to:

- Upload redirects in JSON, CSV, or Terraform format
- Download redirects in various formats
- View and delete existing redirects

### API Endpoints

The following API endpoints are available:

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

### File Formats

#### JSON

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "statusCode": 301,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true
    }
  ]
}
```

#### CSV

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash
/old-page,/new-page,301,true,true,true
```

#### Terraform

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Generated by Redirector"

  item {
    value {
      redirect {
        source_url            = "/old-page"
        target_url            = "/new-page"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }
}
```

## Advanced Redirect Features

### Path Parameters

You can use path parameters in your redirects with the `:param` syntax:

```json
{
  "source": "/products/:productId",
  "destination": "/new-products/:productId"
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

## Testing

Run the test suite with:

```bash
npm test
```