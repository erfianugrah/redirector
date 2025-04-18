# Country-Based Redirects

This example demonstrates how to set up redirects that apply only to specific countries, leveraging Cloudflare's country detection.

## Overview

When running on Cloudflare Workers, you have access to the `CF-IPCountry` header which provides the country code of the visitor. You can use this to create redirects that only apply to visitors from specific countries.

## Implementation

### 1. Create a Country-Based Redirect

Create a redirect with a header condition for the country:

```json
{
  "source": "/global-page",
  "destination": "/us-page",
  "statusCode": 302,
  "enabled": true,
  "preserveQueryParams": true,
  "preserveHash": true,
  "description": "US-specific redirect",
  "conditions": {
    "headers": {
      "CF-IPCountry": "US"
    }
  }
}
```

### 2. Add Multiple Country Redirects

For multiple country-specific redirects to the same source path, create multiple redirect entries with different conditions:

```json
[
  {
    "source": "/global-page",
    "destination": "/us-page",
    "statusCode": 302,
    "description": "US-specific redirect",
    "conditions": {
      "headers": {
        "CF-IPCountry": "US"
      }
    }
  },
  {
    "source": "/global-page",
    "destination": "/uk-page",
    "statusCode": 302,
    "description": "UK-specific redirect",
    "conditions": {
      "headers": {
        "CF-IPCountry": "GB"
      }
    }
  },
  {
    "source": "/global-page",
    "destination": "/ca-page",
    "statusCode": 302,
    "description": "Canada-specific redirect",
    "conditions": {
      "headers": {
        "CF-IPCountry": "CA"
      }
    }
  },
  {
    "source": "/global-page",
    "destination": "/eu-page",
    "statusCode": 302,
    "description": "EU fallback redirect",
    "conditions": {
      "headers": {
        "CF-IPCountry": "DE,FR,IT,ES,NL"
      }
    }
  }
]
```

## Using with the CLI

To add a country-specific redirect using the CLI, you can use a JSON file:

1. Create a file `country-redirects.json`:
   ```json
   {
     "redirects": [
       {
         "source": "/global-page",
         "destination": "/us-page",
         "statusCode": 302,
         "conditions": {
           "headers": {
             "CF-IPCountry": "US"
           }
         }
       }
     ]
   }
   ```

2. Upload the redirects:
   ```bash
   redirector upload country-redirects.json
   ```

## Testing Country-Based Redirects

To test country-based redirects:

1. Use the test endpoint with custom headers:
   ```bash
   curl -X POST http://localhost:8787/api/redirects/test \
     -H "Content-Type: application/json" \
     -d '{
       "url": "https://example.com/global-page",
       "headers": {
         "CF-IPCountry": "US"
       }
     }'
   ```

2. For local development, you can simulate the Cloudflare country header:
   ```bash
   npm run dev
   # In another terminal
   curl -X GET http://localhost:8787/global-page \
     -H "CF-IPCountry: US"
   ```

## Notes

- Country codes follow the ISO 3166-1 alpha-2 format (e.g., US, GB, CA)
- You can specify multiple countries in a single condition by using a comma-separated list
- The order of redirects matters; the first matching redirect will be applied
- For a complete list of country codes, see [ISO 3166-1 alpha-2](https://en.wikipedia.org/wiki/ISO_3166-1_alpha-2)
- For testing, the `CF-IPCountry` header will be set to the correct value in production automatically by Cloudflare