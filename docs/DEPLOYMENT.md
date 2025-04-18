# Redirector Deployment Guide

This guide explains how to deploy the Redirector Worker to Cloudflare Workers and configure the required resources.

## Prerequisites

Before deploying, you need:

1. A Cloudflare account
2. Wrangler CLI installed and authenticated
3. Node.js 18+ installed

## Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/redirector.git
   cd redirector
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a KV namespace:
   ```bash
   # Create production namespace
   wrangler kv:namespace create REDIRECTS_KV
   
   # Create preview namespace for development
   wrangler kv:namespace create REDIRECTS_KV --preview
   ```

   This will output something like:
   ```
   🌀 Creating namespace with title "redirector-REDIRECTS_KV"
   ✨ Success!
   Add the following to your configuration file:
   kv_namespaces = [
     { binding = "REDIRECTS_KV", id = "abcdef123456" }
   ]
   ```

4. Update `wrangler.jsonc` with your KV namespace IDs:
   ```jsonc
   "kv_namespaces": [
     {
       "binding": "REDIRECTS_KV",
       "id": "your-kv-id-here", // Replace with production namespace ID
       "preview_id": "your-preview-kv-id-here" // Replace with preview namespace ID
     }
   ]
   ```

5. Configure environment variables in `wrangler.jsonc`:
   ```jsonc
   "vars": {
     "LOG_LEVEL": "info", // Options: trace, debug, info, warn, error, fatal, silent
     "ENABLE_DEBUG": "false" // Enable additional debug features
   }
   ```

## Development

To run the worker locally:

```bash
npm run dev
```

This will start a local development server at http://localhost:8787. You can access:

- Admin UI: http://localhost:8787/admin
- API: http://localhost:8787/api/redirects
- Health check: http://localhost:8787/health

## Deployment

To deploy to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy the worker to your Cloudflare account using the configurations in `wrangler.jsonc`.

## Custom Domain (Optional)

To use a custom domain with your worker:

1. Add a custom domain in your Cloudflare Workers dashboard
2. Configure the DNS settings in your Cloudflare DNS dashboard
3. Update your application references to use the custom domain

## CI/CD Integration

### GitHub Actions

Here's an example GitHub Actions workflow file (`.github/workflows/deploy.yml`):

```yaml
name: Deploy

on:
  push:
    branches:
      - main

jobs:
  deploy:
    runs-on: ubuntu-latest
    name: Deploy
    steps:
      - uses: actions/checkout@v3
      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install Dependencies
        run: npm ci
      - name: Run Tests
        run: npm test -- --run
      - name: Deploy to Cloudflare Workers
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CF_API_TOKEN }}
          preCommands: npm run typecheck
```

You'll need to add a `CF_API_TOKEN` secret to your GitHub repository settings.

### GitLab CI

Here's an example GitLab CI configuration (`.gitlab-ci.yml`):

```yaml
image: node:18

stages:
  - test
  - deploy

test:
  stage: test
  script:
    - npm ci
    - npm run typecheck
    - npm test -- --run

deploy:
  stage: deploy
  script:
    - npm ci
    - npm run deploy
  environment:
    name: production
  only:
    - main
  variables:
    CLOUDFLARE_API_TOKEN: $CF_API_TOKEN
```

## Multiple Environments

To support multiple environments (development, staging, production):

1. Create separate KV namespaces for each environment:
   ```bash
   wrangler kv:namespace create REDIRECTS_KV_DEV
   wrangler kv:namespace create REDIRECTS_KV_STAGING
   wrangler kv:namespace create REDIRECTS_KV_PROD
   ```

2. Create environment-specific configurations in `wrangler.jsonc`:
   ```jsonc
   "env": {
     "dev": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "dev-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "debug",
         "ENABLE_DEBUG": "true"
       }
     },
     "staging": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "staging-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "info",
         "ENABLE_DEBUG": "true"
       }
     },
     "production": {
       "kv_namespaces": [
         {
           "binding": "REDIRECTS_KV",
           "id": "prod-kv-id-here"
         }
       ],
       "vars": {
         "LOG_LEVEL": "info",
         "ENABLE_DEBUG": "false"
       }
     }
   }
   ```

3. Deploy to a specific environment:
   ```bash
   npm run deploy -- --env production
   ```

## Monitoring and Debugging

### Logs

Logs are available in the Cloudflare Workers dashboard under "Logs" tab.

The worker uses Pino for structured logging, with log levels configurable via the `LOG_LEVEL` environment variable.

### Analytics

Cloudflare Workers provides built-in analytics in the dashboard, showing:
- Request count
- CPU time
- Error rate
- Status codes

### Debugging

To enable debug mode:

1. Set the `ENABLE_DEBUG` environment variable to `"true"`
2. Set the `LOG_LEVEL` to `"debug"` or `"trace"` for more verbose logs

## Troubleshooting

### Common Issues

1. **KV Access Issues**: Ensure the KV namespace IDs are correctly set in `wrangler.jsonc`

2. **Wrangler Authentication**: If you see authentication errors, run `wrangler login` to authenticate

3. **Worker Limits**: Be aware of [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/), especially:
   - KV storage limits
   - Worker CPU time
   - Subrequest limits

4. **CORS Issues**: Add appropriate CORS headers if accessing the API from a different domain

### Useful Commands

```bash
# View recent logs
wrangler tail

# Check KV content
wrangler kv:key get redirects --namespace-id=your-kv-namespace-id

# Purge KV namespace
wrangler kv:key delete redirects --namespace-id=your-kv-namespace-id
```

## Backup and Recovery

To backup your redirects:

```bash
# Using the CLI
redirector download --format json --output backup.json --from-kv

# Or using wrangler directly
wrangler kv:key get redirects --namespace-id=your-kv-namespace-id > backup.json
```

To restore from backup:

```bash
# Using the CLI
redirector upload backup.json --overwrite --to-kv

# Or using wrangler directly
wrangler kv:key put redirects "$(cat backup.json)" --namespace-id=your-kv-namespace-id
```

## Security Considerations

1. **Admin Access**: Secure the admin UI with Cloudflare Access or another authentication method

2. **API Access**: Consider adding API key validation for production environments

3. **KV Security**: KV data is encrypted at rest, but be cautious about storing sensitive data

4. **Least Privilege**: Use API tokens with minimal permissions required for CI/CD deployments