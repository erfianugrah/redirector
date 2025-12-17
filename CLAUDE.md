# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Worker that handles URL redirects with an admin UI and CLI for managing redirects in bulk. Built with Hono, Zod, and Cloudflare KV storage, it provides edge-based redirect management with advanced pattern matching capabilities.

## Common Commands

### Development
```bash
npm run dev              # Start local development with local KV storage
npm run dev:remote       # Start development with remote KV storage
npm test                 # Run test suite
npm run typecheck        # TypeScript type checking
npm run lint             # Lint source files
npm run lint:fix         # Lint and auto-fix issues
npm run format           # Format code with Prettier
npm run validate         # Run lint, typecheck, and tests
```

### Deployment
```bash
npm run deploy           # Deploy to production
npm run deploy:dev       # Deploy to development environment
npm run deploy:staging   # Deploy to staging environment
```

### Setup
```bash
npm run setup            # Initialize KV namespaces and .env.local
npm run cf-typegen       # Generate TypeScript types from Wrangler
```

### CLI Management
```bash
npm run cli -- list                           # List all redirects
npm run cli -- add /old /new                  # Add a redirect
npm run cli -- delete /old                    # Delete a redirect
npm run cli -- upload file.json              # Upload redirects from file
npm run cli -- download --format json        # Download redirects
npm run cli -- config --url http://localhost:8787  # Configure CLI
```

## Architecture

### Core Application Flow

1. **Request Entry** (`src/index.ts`): All requests enter through Hono app with typed environment bindings
2. **Middleware**: Logging middleware configures Pino logger based on LOG_LEVEL environment variable
3. **Request Routing**:
   - `/health` - Health check endpoint
   - `/admin` - Admin UI for managing redirects
   - `/api/*` - REST API endpoints (bypass redirect processing)
   - `*` - Redirect matching and processing
4. **Redirect Processing**: `RedirectService.matchRedirect()` tries multiple matching strategies:
   - Exact path match (e.g., `/old-path`)
   - Full URL match (e.g., `https://example.com/old-path`)
   - Host+path match (e.g., `example.com/old-path`)
   - Pattern matching with parameters (`:param`) and wildcards (`*`)
5. **Response**: Either returns redirect (3xx status) or continues to next handler

### Service Architecture

**RedirectService** (`src/services/redirectService.ts`):
- Pattern matching with parameters (`:param`), wildcards (`*`), and named wildcards (`:path*`)
- Conditional redirects based on hostname, headers, query params, date ranges
- KV storage operations (CRUD)
- Path normalization and parameter substitution in destinations

**FormatService** (`src/services/formatService.ts`):
- Parses JSON, CSV, and Terraform formats into redirect objects
- Exports redirect maps to JSON, CSV, or Terraform format
- Handles CSV quoting/escaping and Terraform HCL parsing
- Converts between different redirect representations

### Schema Validation

All API requests and responses use Zod 3 beta schemas (`src/schemas/`) for runtime type safety:
- `RedirectSchema` - Individual redirect with conditions
- `BulkRedirectsSchema` - Array of redirects
- `FileUploadSchema` - File upload with format and overwrite options
- `FileDownloadSchema` - Download format specification

### Pattern Matching Logic

The redirect matching follows this precedence (in `RedirectService.matchPattern()`):

1. **Named wildcard parameters** (`:path*`) - captures multiple path segments
2. **Standard parameters** (`:param`) - captures single path segment (non-slash characters)
3. **Bare wildcards** (`*`) - captures remaining path as `_splat0`, `_splat1`, etc.

Pattern matching is case-insensitive for URL paths. The service creates RegExp patterns dynamically:
- `:param` → `([^/]+)` (matches single segment)
- `:param*` → `(.*)` (matches multiple segments)
- `*` → `(.*)` (matches multiple segments)

### Conditional Redirects

Redirects can have conditions that must be met (`RedirectService.checkConditions()`):
- **hostname**: Must match request hostname
- **queryParams**: All specified query parameters must match
- **headers**: All specified headers must match (useful for device detection, A/B testing)
- **dateRange**: Current date must be within start/end range
- **enabled**: Redirect must be enabled

All conditions must be satisfied for a redirect to match.

### Storage Model

All redirects are stored in a single KV key called `"redirects"` as a JSON object where:
- Key: redirect source path/URL (normalized to lowercase)
- Value: complete `Redirect` object with all properties

This enables fast exact-match lookups and efficient bulk operations. Pattern matching happens in-memory after retrieving the full redirect map.

### Environment Configuration

The worker uses typed environment bindings:
```typescript
type Env = {
  REDIRECTS_KV: Cloudflare.KVNamespace;
  LOG_LEVEL?: string;  // trace, debug, info, warn, error, fatal, silent
};
```

Configure via `wrangler.jsonc`:
- **vars**: Environment variables (LOG_LEVEL, ENABLE_DEBUG)
- **kv_namespaces**: KV binding with production and preview IDs
- **env**: Environment-specific overrides (dev, staging)

## Key Implementation Details

### URL Processing in processRedirect()

1. Substitute named wildcard parameters first (`:path*`)
2. Replace standard parameters (`:param`)
3. Handle bare wildcard substitutions (`*`)
4. Append splat values to destination if ends with `/`
5. Clean up unmatched parameters and duplicate slashes
6. Parse as absolute URL or construct relative to origin
7. Preserve query params and hash based on redirect config

### File Format Handling

**JSON**: Supports three formats:
- Direct array: `[{redirect1}, {redirect2}]`
- BulkRedirects: `{"redirects": [{redirect1}, {redirect2}]}`
- RedirectMap: `{"source1": {redirect1}, "source2": {redirect2}}`

**CSV**: Headers must include `source` and `destination`. Optional: `statusCode`, `enabled`, `preserveQueryParams`, `preserveHash`, `description`, `hostname`

**Terraform**: Parses HCL `item` blocks from `cloudflare_list` resources. Maps Cloudflare-specific fields:
- `source_url` → `source`
- `target_url` → `destination`
- `preserve_query_string` → `preserveQueryParams`
- `subpath_matching` → enables wildcards
- Extracts hostname from absolute URLs as condition

### Testing Strategy

Tests use Vitest with Cloudflare Workers test environment:
- Format parsing/export tests
- Redirect matching with various patterns
- Conditional redirect logic
- API endpoint testing with mocked KV

Run tests with `npm test` or individual test file with `npm test -- test/format.spec.ts`

## Service Binding Architecture

The worker can be deployed as a standalone service or integrated via Service Bindings:

**Method 1: HTTP Interface**
```javascript
const redirectResponse = await env.REDIRECTOR.fetch(request.clone());
if (redirectResponse.status >= 300 && redirectResponse.status < 400) {
  return redirectResponse;
}
```

**Method 2: RPC Interface** (requires exposing methods in `src/index.ts`):
```typescript
// Export class with methods
export class Redirector {
  async checkRedirect(url: string, headers: HeadersInit = {}) {
    // Implementation
  }
}

// In dispatcher:
const redirector = new env.REDIRECTOR.redirector(env);
const result = await redirector.checkRedirect(request.url, request.headers);
```

RPC provides better performance for inter-service communication. Use Smart Placement (`"placement": {"mode": "smart"}`) to co-locate services.

## TypeScript Configuration

- Target: ES2021 with WebWorker libs
- Module: ES2022 with Bundler resolution
- Strict mode enabled
- Types: `@cloudflare/workers-types/2023-07-01`
- Cloudflare types via global namespace (no imports needed)

## Development Notes

- The worker uses `nodejs_compat` flag for Node.js APIs
- Pino logger configured via LOG_LEVEL environment variable
- Admin UI is embedded HTML in `src/utils/admin-ui.ts`
- CLI tool is separate Node.js script in `cli/index.js`
- All paths are normalized to lowercase for matching
- Redirects preserve query params and hash by default
- Test files are in `test/` directory (excluded from main tsconfig)

## Common Patterns

When adding new redirect features:
1. Update Zod schemas in `src/schemas/redirect.ts`
2. Update `RedirectService` matching/processing logic
3. Update `FormatService` if new format support needed
4. Add API endpoint in `src/index.ts` with zValidator
5. Update Admin UI in `src/utils/admin-ui.ts` if needed
6. Add tests in `test/` directory

When debugging redirects:
- Check LOG_LEVEL is set to "debug"
- Review structured logs for matching attempts
- Test redirect patterns with `/api/redirects/test` endpoint
- Verify conditions are met (hostname, headers, dates)
