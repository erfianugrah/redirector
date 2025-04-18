# Redirector Examples

This section contains practical examples of how to use the Redirector Worker for various use cases.

## Available Examples

- [Country-Based Redirects](country-based-redirects.md): Redirect users based on their country
- [A/B Testing](a-b-testing.md): Implement A/B testing for your website

## Common Redirect Patterns

### Basic Redirect

```json
{
  "source": "/old-page",
  "destination": "/new-page",
  "statusCode": 301,
  "enabled": true
}
```

### Temporary Redirect

```json
{
  "source": "/temporary-page",
  "destination": "/new-page",
  "statusCode": 302,
  "enabled": true
}
```

### External Redirect

```json
{
  "source": "/external",
  "destination": "https://example.com",
  "statusCode": 301,
  "enabled": true
}
```

### Path Parameter Redirect

```json
{
  "source": "/products/:id",
  "destination": "/shop/products/:id",
  "statusCode": 301,
  "enabled": true
}
```

### Multi-Parameter Redirect

```json
{
  "source": "/users/:userId/posts/:postId",
  "destination": "/profiles/:userId/content/:postId",
  "statusCode": 301,
  "enabled": true
}
```

### Hostname-Specific Redirect

```json
{
  "source": "/page",
  "destination": "/new-page",
  "statusCode": 301,
  "enabled": true,
  "conditions": {
    "hostname": "www.example.com"
  }
}
```

### Query Parameter Redirect

```json
{
  "source": "/search",
  "destination": "/new-search",
  "statusCode": 301,
  "enabled": true,
  "conditions": {
    "queryParams": {
      "version": "2"
    }
  }
}
```

### Time-Limited Redirect

```json
{
  "source": "/promotion",
  "destination": "/special-offer",
  "statusCode": 302,
  "enabled": true,
  "conditions": {
    "dateRange": {
      "start": "2023-11-20T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    }
  }
}
```

### Device-Specific Redirect

```json
{
  "source": "/download",
  "destination": "/download-mobile",
  "statusCode": 302,
  "enabled": true,
  "conditions": {
    "headers": {
      "user-agent": "Mobile"
    }
  }
}
```

### Language-Based Redirect

```json
{
  "source": "/welcome",
  "destination": "/bienvenue",
  "statusCode": 302,
  "enabled": true,
  "conditions": {
    "headers": {
      "accept-language": "fr"
    }
  }
}
```

## Creating Your Own Examples

To create your own redirect examples:

1. Design your redirect pattern using the schemas described in the [API documentation](../API.md)
2. Test your redirects using the [Admin UI](../ADMIN-UI.md) or [CLI](../CLI.md)
3. Share your examples with the community

## Advanced Use Cases

### Multi-Stage Redirects

You can implement multi-stage redirects by creating a chain:

```json
[
  {
    "source": "/original",
    "destination": "/intermediate",
    "statusCode": 301,
    "enabled": true
  },
  {
    "source": "/intermediate",
    "destination": "/final",
    "statusCode": 301,
    "enabled": true
  }
]
```

However, note that chained redirects can impact performance and SEO. It's generally better to redirect directly to the final destination.

### Combining Multiple Conditions

```json
{
  "source": "/special-offer",
  "destination": "/exclusive-deal",
  "statusCode": 302,
  "enabled": true,
  "conditions": {
    "hostname": "premium.example.com",
    "headers": {
      "user-agent": "Mobile",
      "cf-ipcountry": "US"
    },
    "queryParams": {
      "source": "email"
    },
    "dateRange": {
      "start": "2023-11-20T00:00:00Z",
      "end": "2023-12-31T23:59:59Z"
    }
  }
}
```

This redirect will only apply if all conditions are met: the hostname is "premium.example.com", the user agent contains "Mobile", the country is US, the query parameter "source" is "email", and the current date is within the specified range.