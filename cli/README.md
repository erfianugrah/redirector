# Redirector CLI

A command-line interface for managing redirects in the Redirector Worker.

## Features

- Configure connection to Redirector API
- Create, list, and delete redirects
- Upload redirects from JSON, CSV, or Terraform files
- Download redirects in various formats
- Direct KV operations (optional)

## Tools Used

- `commander`: Command-line argument parsing
- `chalk`: Terminal text styling
- `node-fetch`: HTTP requests to the Redirector API
- `fs` & `path`: File operations

## Installation

```bash
# Install dependencies
npm install

# Make CLI executable
chmod +x cli/index.js
```

## Usage

```bash
# Via npm script
npm run cli <command>

# Directly
node cli/index.js <command>
```

### Common Commands

```bash
# Configure the CLI
npm run cli config --url https://your-worker.example.workers.dev

# Add a redirect
npm run cli add /old-path /new-path

# List all redirects
npm run cli list

# Upload redirects from a file
npm run cli upload samples/json/full_example.json

# Download redirects
npm run cli download --format json --output redirects.json
```

See the full CLI documentation in [/docs/CLI.md](/docs/CLI.md).

## Development

The CLI is a standalone tool that communicates with the Redirector Worker API. It has two operation modes:

1. Worker API mode: Uses the Redirector API endpoints (default)
2. Direct KV mode: Uses Wrangler to interact directly with KV storage (requires Cloudflare authentication)

## Global Installation

The CLI is written in JavaScript and doesn't require compilation. To make it globally available:

```bash
# Install globally
npm install -g .

# Use directly
redirector add /path /destination

# Update configuration
redirector config --url https://your-worker.example.workers.dev
```

After global installation, you can use the `redirector` command directly from anywhere.

## Example Workflow

```bash
# Configure the CLI
redirector config --url https://redirector-dev.example.workers.dev

# Add a basic redirect
redirector add /docs https://docs.example.com

# Upload a batch of redirects
redirector upload samples/json/full_example.json

# List all redirects
redirector list

# Test the functionality
curl -I https://redirector-dev.example.workers.dev/docs
```