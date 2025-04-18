# Redirector Documentation

Welcome to the Redirector documentation! This documentation will help you understand, deploy, and use the Redirector Worker.

## Introduction

Redirector is a Cloudflare Worker that provides a flexible system for managing and processing URL redirects. It supports:

- Dynamic redirects with path parameters
- Condition-based redirects (hostname, query parameters, headers, date ranges)
- Bulk operations with multiple file formats (JSON, CSV, Terraform)
- Web-based Admin UI
- Command-line interface

## Documentation Sections

- [Architecture](ARCHITECTURE.md): Overview of the system architecture
- [API](API.md): API reference for programmatic access
- [Admin UI](ADMIN-UI.md): Guide to using the web-based admin interface
- [CLI](CLI.md): Documentation for the command-line interface
- [Deployment](DEPLOYMENT.md): Instructions for deploying to Cloudflare Workers

## Quick Start

### Prerequisites

- Node.js 18 or higher
- Cloudflare account
- Wrangler CLI installed and authenticated

### Installation

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
   wrangler kv:namespace create REDIRECTS_KV
   wrangler kv:namespace create REDIRECTS_KV --preview
   ```

4. Update `wrangler.jsonc` with your KV namespace IDs

5. Start the development server:
   ```bash
   npm run dev
   ```

6. Access the Admin UI at http://localhost:8787/admin

### Basic Usage

#### Adding a Redirect

Using the CLI:
```bash
npm run cli add /old-page /new-page
```

Using the API:
```bash
curl -X POST http://localhost:8787/api/redirects \
  -H "Content-Type: application/json" \
  -d '{"source":"/old-page","destination":"/new-page","statusCode":301}'
```

#### Uploading Bulk Redirects

Using the CLI:
```bash
npm run cli upload redirects.json
```

Or use the Admin UI at http://localhost:8787/admin

#### Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

## Advanced Features

### Path Parameters

You can use path parameters in your redirects with the `:param` syntax:

```json
{
  "source": "/products/:productId",
  "destination": "/new-products/:productId"
}
```

### Conditional Redirects

```json
{
  "source": "/path",
  "destination": "/new-path",
  "conditions": {
    "hostname": "example.com",
    "queryParams": {
      "version": "2"
    },
    "headers": {
      "x-device": "mobile"
    }
  }
}
```

### Multiple File Formats

The system supports:
- JSON: Standard format for all redirects
- CSV: Simple tabular format for easy editing
- Terraform: Compatible with Cloudflare's redirect list format

## Contributing

Contributions are welcome! Please see the [README.md](../README.md) file for more information.

## License

This project is licensed under the MIT License - see the LICENSE file for details.