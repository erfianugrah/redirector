# Redirector Samples

This directory contains sample redirect files in various formats for testing and demonstration purposes.

## URL Handling

The Redirector worker supports both relative and absolute URLs:

- **Relative URLs** (paths only): `/old-path` → `/new-path`
  - Useful for same-domain redirects
  - Preserves the original hostname

- **Absolute URLs** (full domain): `https://old-domain.com/*` → `https://new-domain.com/*`
  - Useful for cross-domain redirects
  - Required for subdomain redirects
  - Can be combined with hostname conditions

- **Dynamic Path Parameters**: `/products/:id` → `/items/:id`
  - Captures dynamic segments using `:parameter` syntax
  - Parameters in source URL can be referenced in destination URL
  - Example: `/products/123` redirects to `/items/123`
  - Multiple parameters can be used: `/blog/:year/:month/:slug`
  - Can be combined with absolute URLs: `https://example.com/products/:id`

- **Wildcard Captures**: `/blog/*` → `/articles/*`
  - Captures entire path segments with `*`
  - Example: `/blog/2023/01/post` redirects to `/articles/2023/01/post`
  - Useful for migrating entire sections of a website
  - Captures and preserves all subdirectories and files
  - Alternative syntax with named parameter: `/blog/:path*` → `/articles/:path*`

## Directory Structure

- `json/`: JSON format redirect samples
  - `simple.json`: A minimal redirect example
  - `test_redirects.json`: Test redirects with various configurations
  - `full_example.json`: Comprehensive example with all redirect features

- `csv/`: CSV format redirect samples
  - `full_example.csv`: Sample redirects in CSV format

- `terraform/`: Terraform format redirect samples
  - `full_example.tf`: Sample redirects in Terraform format

## Usage

### Using with the CLI

```bash
# Upload JSON sample
npm run cli upload samples/json/simple.json

# Upload with format specified
npm run cli upload samples/csv/full_example.csv -f csv

# Upload with overwrite flag
npm run cli upload samples/json/full_example.json -f json -o
```

### Using with the API

```bash
# Upload JSON sample
curl -X POST http://localhost:8787/api/files/upload \
  -H "Content-Type: application/json" \
  -d '{
    "format": "json",
    "content": "$(cat samples/json/simple.json | sed 's/"/\\"/g')",
    "overwrite": true
  }'
```

## Sample Files

### JSON Format

The JSON format uses the following structure:

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
      "description": "Relative path redirect",
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
    },
    {
      "source": "https://old-domain.com/*",
      "destination": "https://new-domain.com/*",
      "statusCode": 301,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true,
      "description": "Domain change redirect with wildcard",
      "conditions": {
        "hostname": "old-domain.com"
      }
    },
    {
      "source": "/products/:productId",
      "destination": "/items/:productId",
      "statusCode": 301,
      "enabled": true,
      "description": "Dynamic path parameter capture"
    },
    {
      "source": "/blog/:year/:month/:slug",
      "destination": "/articles/:year/:month/:slug",
      "statusCode": 301,
      "enabled": true,
      "description": "Multiple path parameter captures"
    },
    {
      "source": "/docs/*",
      "destination": "/documentation/*",
      "statusCode": 301,
      "enabled": true,
      "description": "Wildcard path capture"
    },
    {
      "source": "/legacy/:path*",
      "destination": "/new/:path*",
      "statusCode": 301,
      "enabled": true,
      "description": "Named wildcard path parameter"
    }
  ]
}
```

### CSV Format

The CSV format requires a header row with the following columns:

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/old-path,/new-path,301,true,true,true,Relative path redirect,example.com
https://old-domain.com/path,https://new-domain.com/path,301,true,true,true,Absolute URL redirect,old-domain.com
/products/:productId,/items/:productId,301,true,true,true,Dynamic path parameter capture,
/blog/:year/:month/:slug,/articles/:year/:month/:slug,301,true,true,true,Multiple path parameter captures,
/docs/*,/documentation/*,301,true,true,true,Wildcard path capture,
/legacy/:path*,/new/:path*,301,true,true,true,Named wildcard path parameter,
```

### Terraform Format

The Terraform format follows Cloudflare's redirect list structure:

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Description"

  # Basic URL redirect
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
  
  # Domain-to-domain redirect with wildcard
  item {
    value {
      redirect {
        source_url            = "https://old-domain.com/*"
        target_url            = "https://new-domain.com/*"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "enabled"
        subpath_matching      = "enabled"
      }
    }
  }
  
  # Dynamic path parameter capture
  item {
    value {
      redirect {
        source_url            = "https://example.com/products/:productId"
        target_url            = "https://example.com/items/:productId"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }
  
  # Multiple path parameter captures
  item {
    value {
      redirect {
        source_url            = "https://example.com/blog/:year/:month/:slug"
        target_url            = "https://example.com/articles/:year/:month/:slug"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }
  
  # Wildcard path capture
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
  
  # Named wildcard path parameter
  item {
    value {
      redirect {
        source_url            = "https://example.com/legacy/:path*"
        target_url            = "https://example.com/new/:path*"
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