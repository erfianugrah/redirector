# Redirector CLI

A command-line interface for managing redirects in the Redirector Worker.

## Features

- Configure connection to Redirector API
- Create, list, and delete redirects
- Upload redirects from JSON, CSV, or Terraform files
- Download redirects in various formats
- Direct KV operations (optional)
- Project setup automation
- Sample file extraction from existing redirects
- Support for both local and remote environments

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
# Set up the project (create KV namespaces)
npm run cli setup

# Configure the CLI
npm run cli config --url http://localhost:8787 --remote-url https://your-worker.workers.dev

# Add a redirect (local worker)
npm run cli add /old-path /new-path

# Add a redirect (remote worker)
npm run cli add /old-path /new-path --remote

# List all redirects
npm run cli list

# List redirects from remote worker
npm run cli list --remote

# Upload redirects from a file
npm run cli upload samples/json/full_example.json

# Upload to remote worker
npm run cli upload samples/json/full_example.json --remote

# Download redirects
npm run cli download --format json --output redirects.json

# Download from remote worker
npm run cli download --format json --output redirects.json --remote

# Extract sample redirects from a file
npm run cli extract-sample redirect_list.tf --output-dir ./samples --count 10
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
# Set up the project
redirector setup

# Configure the CLI
redirector config --url http://localhost:8787 --remote-url https://redirector-dev.example.workers.dev

# Start development
# (In a separate terminal) npm run dev

# Add a basic redirect to local worker
redirector add /docs https://docs.example.com

# Test the functionality locally
curl -I http://localhost:8787/docs

# Upload a batch of redirects to remote worker
redirector upload samples/json/full_example.json --remote

# List all redirects in remote worker
redirector list --remote

# Extract sample redirects from a large file
redirector extract-sample large-redirects.json --count 10 --output-dir ./demo
```