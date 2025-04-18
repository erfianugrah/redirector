# Redirector CLI Documentation

The Redirector CLI provides a command-line interface for managing redirects, allowing for easy automation and integration with scripts and CI/CD pipelines.

## Installation

### Global Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/redirector.git
cd redirector

# Install globally
npm install -g .

# Use the CLI
redirector --help
```

### Local Usage

```bash
# Clone the repository
git clone https://github.com/yourusername/redirector.git
cd redirector

# Install dependencies
npm install

# Use the CLI
npm run cli -- --help
```

## Configuration

The CLI supports configuration via environment variables or the `config` command:

### Environment Variables

```bash
# Set environment variables
export REDIRECTOR_API_URL="https://your-worker.example.workers.dev"
export REDIRECTOR_KV_NAMESPACE_ID="your-kv-namespace-id"
export CLOUDFLARE_ACCOUNT_ID="your-account-id"
```

### Config Command

```bash
# Configure the CLI
redirector config --url https://your-worker.example.workers.dev --namespace your-kv-namespace-id --account your-account-id
```

## Commands

### Configuration

```bash
redirector config [options]
```

Options:
- `-u, --url <url>`: API URL (e.g., http://localhost:8787)
- `-n, --namespace <id>`: KV Namespace ID
- `-a, --account <id>`: Cloudflare Account ID

Example:
```bash
redirector config --url https://redirector.example.workers.dev
```

### List Redirects

```bash
redirector list
```

Lists all redirects with their source, destination, and status code.

Example output:
```
Found 3 redirects:
Source                         Destination                    Status
======================================================================
/old-page                      /new-page                      301
/products/:productId           /new-products/:productId       301
/another-page                  /destination                   302 [DISABLED]
```

### Add a Redirect

```bash
redirector add <source> <destination> [options]
```

Options:
- `-s, --status <code>`: HTTP status code (default: 301)
- `-q, --preserve-query`: Preserve query parameters (default: true)
- `-h, --preserve-hash`: Preserve hash fragment (default: true)
- `--no-enabled`: Disable this redirect

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

### Delete a Redirect

```bash
redirector delete <source>
```

Deletes a redirect with the specified source path.

Example:
```bash
redirector delete /old-page
```

### Upload Redirects from File

```bash
redirector upload <file> [options]
```

Options:
- `-f, --format <format>`: File format (json, csv, terraform) - automatically inferred from file extension if not specified
- `-o, --overwrite`: Overwrite existing redirects
- `--to-worker`: Upload to worker API (default)
- `--to-kv`: Upload directly to KV using wrangler

Examples:
```bash
# Upload JSON file
redirector upload redirects.json

# Upload CSV file with overwrite
redirector upload redirects.csv --overwrite

# Upload Terraform file with explicit format
redirector upload rules.tf --format terraform

# Upload directly to KV (requires configured KV namespace)
redirector upload redirects.json --to-kv
```

### Download Redirects

```bash
redirector download [options]
```

Options:
- `-f, --format <format>`: File format (json, csv, terraform) - required
- `-o, --output <file>`: Output file path (defaults to redirects.{json|csv|tf})
- `--from-worker`: Download from worker API (default)
- `--from-kv`: Download directly from KV using wrangler

Examples:
```bash
# Download as JSON
redirector download --format json

# Download as CSV with custom filename
redirector download --format csv --output my-redirects.csv

# Download as Terraform
redirector download --format terraform

# Download directly from KV (requires configured KV namespace)
redirector download --format json --from-kv
```

## Direct KV Access

For direct KV access (`--to-kv` and `--from-kv` options), the CLI uses the Wrangler CLI underneath. Make sure you have Wrangler installed and authenticated:

```bash
npm install -g wrangler
wrangler login
```

Then set your KV namespace ID:

```bash
redirector config --namespace your-kv-namespace-id
```

The CLI will use the following Wrangler commands:
```bash
# To put data in KV
wrangler kv key put redirects "data" --namespace-id=your-namespace-id

# To get data from KV
wrangler kv key get redirects --namespace-id=your-namespace-id
```

## File Formats

The CLI supports the following file formats:

### JSON

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

### CSV

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/old-page,/new-page,301,true,true,true,Page moved,example.com
```

### Terraform

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  
  item {
    value {
      redirect {
        source_url            = "https://example.com/old-page"
        target_url            = "https://example.com/new-page"
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

## Examples

### Basic Workflow

```bash
# Configure CLI
redirector config --url http://localhost:8787

# Add some redirects
redirector add /old-page /new-page
redirector add /temp-page /final-page --status 302

# List all redirects
redirector list

# Download as JSON
redirector download --format json --output redirects.json

# Make edits to redirects.json...

# Upload the edited file
redirector upload redirects.json --overwrite

# Verify changes
redirector list
```

### Bulk Operations

```bash
# Process redirects from a Terraform file
redirector upload cloudflare-redirects.tf

# Export all redirects as CSV for editing in spreadsheet
redirector download --format csv --output redirects.csv

# After editing in a spreadsheet, upload the CSV
redirector upload redirects.csv --overwrite

# Verify changes
redirector list
```

### CI/CD Integration

```bash
#!/bin/bash
# Example CI/CD script

# Configure CLI (using environment variables)
redirector config --url $REDIRECTOR_API_URL

# Download current redirects
redirector download --format json --output current.json

# Merge with new redirects from repository
jq -s '{ redirects: [ .[0].redirects[], .[1].redirects[] ] | unique_by(.source) }' \
   current.json new-redirects.json > merged.json

# Upload merged redirects
redirector upload merged.json --overwrite

echo "Redirects updated successfully"
```