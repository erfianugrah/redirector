# Redirector API Documentation

This document provides detailed information about the Redirector Worker API endpoints.

## Base URL

All API endpoints are relative to your worker's base URL:
- Local development: `http://localhost:8787`
- Production: `https://your-worker-name.your-account.workers.dev`

## Authentication

Currently, the API does not require authentication. In a production environment, you should implement authentication using Cloudflare Access, JWT tokens, or API keys.

## Endpoints

### Health Check

```
GET /health
```

Returns a simple status check to verify the worker is running.

**Response:**
```json
{
  "status": "ok"
}
```

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

**Response:**
```json
{
  "success": true,
  "redirect": {
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

**Response:**
```json
{
  "success": true,
  "count": 2
}
```

### Delete a Redirect

```
DELETE /api/redirects/:source
```

Deletes a redirect. The `:source` parameter should be URL-encoded.

**Response:**
```json
{
  "success": true
}
```

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

**Response:**
```json
{
  "success": true,
  "message": "Successfully processed 10 redirects from json file",
  "stats": {
    "uploaded": 10,
    "unique": 8,
    "total": 15
  }
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

**Response:**
The response will be the file content with appropriate Content-Type and Content-Disposition headers.

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

**Response (match found):**
```json
{
  "matched": true,
  "redirect": {
    "source": "/old-path",
    "destination": "/new-path",
    "statusCode": 301,
    "enabled": true,
    "preserveQueryParams": true,
    "preserveHash": true
  },
  "params": {},
  "location": "https://example.com/new-path",
  "statusCode": 301
}
```

**Response (no match):**
```json
{
  "matched": false
}
```

## Error Handling

All API endpoints return appropriate HTTP status codes:

- `200 OK`: Request succeeded
- `201 Created`: Resource successfully created
- `400 Bad Request`: Invalid request body or parameters
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

Error responses include a message explaining the error:

```json
{
  "success": false,
  "message": "Error message"
}
```

## Redirect Schemas

### Basic Redirect

```json
{
  "source": "/old-path",  // Required: Source path to match
  "destination": "/new-path",  // Required: Destination to redirect to
  "statusCode": 301,  // HTTP status code (301, 302, etc.) - Defaults to 301
  "enabled": true,  // Whether this redirect is active - Defaults to true
  "preserveQueryParams": true,  // Whether to preserve query parameters - Defaults to true
  "preserveHash": true,  // Whether to preserve hash fragments - Defaults to true
  "description": "Optional description"  // Optional description
}
```

### Redirect with Conditions

```json
{
  "source": "/path",
  "destination": "/new-path",
  "statusCode": 301,
  "enabled": true,
  "preserveQueryParams": true,
  "preserveHash": true,
  "description": "Conditional redirect",
  "conditions": {
    "hostname": "example.com",  // Only redirect on this hostname
    "queryParams": {  // Only redirect when these query params match
      "version": "2",
      "debug": "true"
    },
    "headers": {  // Only redirect when these headers match
      "x-device": "mobile",
      "x-country": "US"
    },
    "dateRange": {  // Only redirect within this date range
      "start": "2023-01-01T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    }
  }
}
```

### URL Handling

The redirector supports both relative and absolute URLs:

#### Relative URLs (paths only)

```json
{
  "source": "/products/:productId",
  "destination": "/new-products/:productId"
}
```

This will redirect any request to `/products/123` on the worker's domain to `/new-products/123`.

#### Absolute URLs (full domain)

```json
{
  "source": "https://app.example.com/*",
  "destination": "https://example.com/app",
  "conditions": {
    "hostname": "app.example.com"
  }
}
```

This will redirect any request from `app.example.com` to `example.com/app`. When using absolute URLs, it's recommended to also use the `hostname` condition to ensure proper matching.

### Path Parameters

You can use path parameters in your redirects with the `:param` syntax:

```json
{
  "source": "/products/:productId",
  "destination": "/new-products/:productId"
}
```

This will capture the `productId` parameter and use it in the destination URL.

You can also use the wildcard `*` syntax for catch-all patterns:

```json
{
  "source": "/old-site/*",
  "destination": "/new-site/*"
}
```

You can also use named wildcard parameters with the `:param*` syntax:

```json
{
  "source": "/docs/:path*",
  "destination": "/documentation/:path*"
}
```

This will capture the entire path after `/docs/` into the `path` parameter and use it in the destination URL. For example, `/docs/guides/getting-started` would redirect to `/documentation/guides/getting-started`.

## File Formats

### JSON Format

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
    },
    {
      "source": "/another-page",
      "destination": "/destination",
      "statusCode": 302,
      "enabled": true,
      "preserveQueryParams": false,
      "preserveHash": true
    }
  ]
}
```

### CSV Format

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/old-page,/new-page,301,true,true,true,Page moved,example.com
/another-page,/destination,302,true,false,true,Temporary redirect,
```

### Terraform Format

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Redirects list"

  # Basic URL redirect
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
}
```