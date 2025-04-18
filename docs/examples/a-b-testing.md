# A/B Testing with Redirector

This example demonstrates how to implement A/B testing using the Redirector Worker.

## Overview

A/B testing (also known as split testing) is a method of comparing two versions of a webpage to determine which one performs better. With Redirector, you can implement A/B testing by:

1. Using a cookie or query parameter to track which version a user should see
2. Creating conditional redirects based on these parameters

## Implementation

### Method 1: Cookie-Based A/B Testing

In this method, we'll use a cookie to determine which version of a page to show to a user.

#### 1. Create the Redirects

```json
[
  {
    "source": "/product-page",
    "destination": "/product-page-a",
    "statusCode": 302,
    "description": "Version A of the product page",
    "conditions": {
      "headers": {
        "cookie": "ab_test=A"
      }
    }
  },
  {
    "source": "/product-page",
    "destination": "/product-page-b",
    "statusCode": 302,
    "description": "Version B of the product page",
    "conditions": {
      "headers": {
        "cookie": "ab_test=B"
      }
    }
  }
]
```

#### 2. Implement Cookie Setting

You'll need to set the cookie before users visit the page. This can be done with JavaScript on your site:

```javascript
// Set this on your main page or in a central script
function setupABTest() {
  // Check if the user already has the cookie
  if (!document.cookie.includes('ab_test=')) {
    // Randomly assign A or B (50% chance for each)
    const version = Math.random() < 0.5 ? 'A' : 'B';
    document.cookie = `ab_test=${version}; path=/; max-age=2592000`; // 30 days
  }
}

// Run on page load
window.addEventListener('load', setupABTest);
```

### Method 2: Query Parameter-Based A/B Testing

This method uses query parameters to decide which version to show.

#### 1. Create the Redirects

```json
[
  {
    "source": "/product-page",
    "destination": "/product-page-a",
    "statusCode": 302,
    "description": "Version A of the product page",
    "conditions": {
      "queryParams": {
        "ab_version": "A"
      }
    },
    "preserveQueryParams": false
  },
  {
    "source": "/product-page",
    "destination": "/product-page-b",
    "statusCode": 302,
    "description": "Version B of the product page",
    "conditions": {
      "queryParams": {
        "ab_version": "B"
      }
    },
    "preserveQueryParams": false
  }
]
```

#### 2. Add Version Selector

You'll need to add the query parameter to your links:

```html
<!-- In your navigation or links -->
<a href="/product-page?ab_version=A">View Product (A)</a>
<a href="/product-page?ab_version=B">View Product (B)</a>

<!-- Or for random assignment -->
<script>
  document.querySelectorAll('.product-link').forEach(link => {
    const version = Math.random() < 0.5 ? 'A' : 'B';
    link.href = `/product-page?ab_version=${version}`;
  });
</script>
```

## Advanced: Weighted A/B Testing

For weighted A/B testing (e.g., 80% A, 20% B), you can use a custom Worker script alongside Redirector.

### 1. Create a Custom Worker Middleware

```javascript
// In your main worker code, before the Redirector logic
app.get('/product-page', async (c, next) => {
  // Check if the user already has a version assigned
  const cookie = c.req.headers.get('cookie') || '';
  if (cookie.includes('ab_test=')) {
    // User already has a version, let Redirector handle it
    return next();
  }
  
  // Assign a version based on weights
  const random = Math.random();
  const version = random < 0.8 ? 'A' : 'B'; // 80% A, 20% B
  
  // Create a response with a cookie
  const url = new URL(c.req.url);
  const destination = version === 'A' ? '/product-page-a' : '/product-page-b';
  const response = Response.redirect(destination, 302);
  
  // Set the cookie
  response.headers.set('Set-Cookie', `ab_test=${version}; path=/; max-age=2592000`);
  
  return response;
});
```

## Tracking and Analytics

To track the results of your A/B test, you can:

1. Use analytics tools like Google Analytics to track conversions for each version
2. Add version information to your analytics events
3. Compare performance metrics between versions

Example analytics tracking:

```javascript
// On your product pages
window.addEventListener('load', () => {
  // Get the version from the URL or cookie
  const url = new URL(window.location.href);
  const version = url.pathname.includes('-a') ? 'A' : 'B';
  
  // Send to your analytics
  if (typeof gtag === 'function') {
    gtag('event', 'view_item', {
      'ab_version': version,
      'item_id': 'product-123'
    });
  }
});
```

## Using with the CLI

To add A/B testing redirects using the CLI:

```bash
# Create a JSON file with both redirects
echo '{
  "redirects": [
    {
      "source": "/product-page",
      "destination": "/product-page-a",
      "statusCode": 302,
      "conditions": {
        "headers": {
          "cookie": "ab_test=A"
        }
      }
    },
    {
      "source": "/product-page",
      "destination": "/product-page-b",
      "statusCode": 302,
      "conditions": {
        "headers": {
          "cookie": "ab_test=B"
        }
      }
    }
  ]
}' > ab_test_redirects.json

# Upload the redirects
redirector upload ab_test_redirects.json
```

## Testing A/B Redirects

To test your A/B redirects:

```bash
# Test version A
curl -X POST http://localhost:8787/api/redirects/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product-page",
    "headers": {
      "cookie": "ab_test=A"
    }
  }'

# Test version B
curl -X POST http://localhost:8787/api/redirects/test \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://example.com/product-page",
    "headers": {
      "cookie": "ab_test=B"
    }
  }'
```

## Notes

- Choose between cookies and query parameters based on your needs:
  - Cookies persist across visits but require JavaScript
  - Query parameters are simpler but don't persist across visits
- Monitor the distribution of users between versions to ensure it matches your intended ratio
- Set an appropriate expiration date for your cookies to maintain consistency for users
- Consider adding a default redirect for users who don't match either condition