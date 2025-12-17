import { Redirect, RedirectMapSchema } from '../schemas/redirect';
import { logger } from '../utils/logger';
import {
	validateDestinationUrl,
	validateRedirectPattern,
	parseAllowedDomains,
} from '../utils/validation';
import { LRUCache } from '../utils/cache';

// Cloudflare type references are handled via TSConfig and ESLint config

export interface RedirectResult {
  matched: boolean;
  redirect?: Redirect;
  params?: Record<string, string>;
}

const REDIRECT_MAP_CACHE_KEY = 'redirect_map';

interface CompiledPattern {
  regex: RegExp;
  paramNames: string[];
  wildcardParams: string[];
  starWildcards: number[];
}

export class RedirectService {
  private readonly kv: Cloudflare.KVNamespace;
  private readonly allowedDomains: string[];
  private readonly allowExternalRedirects: boolean;
  private readonly cache: LRUCache<Record<string, Redirect>>;
  private readonly patternCache: Map<string, CompiledPattern>;

  constructor(
    kv: Cloudflare.KVNamespace,
    allowedDomainsConfig?: string,
    allowExternalRedirects?: string,
    cacheTtlSeconds?: number,
    cacheMaxSize?: number,
  ) {
    this.kv = kv;
    this.allowedDomains = parseAllowedDomains(allowedDomainsConfig);
    this.allowExternalRedirects = allowExternalRedirects === 'true';

    // Initialize cache with configuration
    const ttl = cacheTtlSeconds ?? 60;
    const maxSize = cacheMaxSize ?? 1000;
    this.cache = new LRUCache<Record<string, Redirect>>(maxSize, ttl);

    // Initialize pattern cache
    this.patternCache = new Map();

    if (this.allowedDomains.length > 0) {
      logger.info(
        { allowedDomains: this.allowedDomains },
        'Configured allowed domains for redirects',
      );
    }

    logger.info(
      { cacheTtl: ttl, cacheMaxSize: maxSize },
      'Redirect cache initialized',
    );
  }

  /**
   * Matches a URL against stored redirects
   */
  async matchRedirect(url: URL, request: Request): Promise<RedirectResult> {
    const redirectMap = await this.getRedirectMap();
    if (!redirectMap) {
      return { matched: false };
    }

    // Prepare different matching paths
    const path = url.pathname.toLowerCase();
    const fullUrl = url.toString().toLowerCase();
    const hostAndPath = `${url.hostname}${path}`.toLowerCase();
    
    logger.debug({ path, fullUrl, hostAndPath }, 'Trying to match URL patterns');
    
    // First try exact path match
    if (redirectMap[path]) {
      const redirect = redirectMap[path];
      if (this.checkConditions(redirect, url, request)) {
        logger.debug({ path, redirect }, 'Exact path match found');
        return { matched: true, redirect };
      }
    }
    
    // Try full URL match for absolute URLs
    if (redirectMap[fullUrl]) {
      const redirect = redirectMap[fullUrl];
      if (this.checkConditions(redirect, url, request)) {
        logger.debug({ fullUrl, redirect }, 'Exact full URL match found');
        return { matched: true, redirect };
      }
    }
    
    // Try host+path match for domain-specific redirects
    if (redirectMap[hostAndPath]) {
      const redirect = redirectMap[hostAndPath];
      if (this.checkConditions(redirect, url, request)) {
        logger.debug({ hostAndPath, redirect }, 'Exact host+path match found');
        return { matched: true, redirect };
      }
    }
    
    // Then try pattern matches, checking all patterns 
    for (const [pattern, redirect] of Object.entries(redirectMap)) {
      if (!redirect.enabled) continue;
      
      // For absolute URL patterns, try to match against the full URL
      let params: Record<string, string> | null = null;
      
      if (pattern.startsWith('http')) {
        // This is an absolute URL pattern
        params = this.matchPattern(fullUrl, pattern);
      } else if (pattern.startsWith('/')) {
        // This is a path pattern
        params = this.matchPattern(path, pattern);
      } else {
        // This could be a hostname+path pattern
        params = this.matchPattern(hostAndPath, pattern);
        if (!params) {
          // If that fails, try just matching against the path
          params = this.matchPattern(path, pattern);
        }
      }
      
      if (params && this.checkConditions(redirect, url, request)) {
        logger.debug({ 
          url: url.toString(), 
          pattern, 
          params,
          redirect 
        }, 'Pattern match found');
        return { matched: true, redirect, params };
      }
    }

    logger.debug({ path }, 'No redirect match found');
    return { matched: false };
  }

  /**
   * Processes a redirect by applying all rules and returning the new Response
   */
  processRedirect(redirectResult: RedirectResult, url: URL): Response {
    if (!redirectResult.matched || !redirectResult.redirect) {
      return new Response('Not Found', { status: 404 });
    }

    const { redirect, params = {} } = redirectResult;

    // Validate destination URL before processing
    const validationResult = validateDestinationUrl(
      redirect.destination,
      url.origin,
      this.allowedDomains,
      this.allowExternalRedirects,
    );

    if (!validationResult.valid) {
      logger.error(
        {
          source: redirect.source,
          destination: redirect.destination,
          reason: validationResult.reason,
        },
        'Blocked unsafe redirect',
      );
      return new Response('Forbidden', { status: 403 });
    }
    
    // Substitute any parameters in the destination
    let destination = redirect.destination;
    
    // Handle special wildcard and pattern substitutions
    const hasSplatPattern = destination.includes('*');
    const hasStarSplat = params['_splat0'] !== undefined || params['splat'] !== undefined;
    
    // Replace parameters in destination URL
    for (const [key, value] of Object.entries(params)) {
      // Handle named wildcard parameters first (they have higher precedence)
      const namedWildcardPattern = new RegExp(`:${key}\\*`, 'g');
      if (destination.match(namedWildcardPattern)) {
        destination = destination.replace(namedWildcardPattern, value);
        continue; // Skip other replacements for this key
      }
      
      // Handle standard parameter replacement
      destination = destination.replace(new RegExp(`:${key}\\b`, 'g'), value);
      
      // Handle * wildcards in destination
      if (key.startsWith('_splat') && destination.includes('*')) {
        destination = destination.replace('*', value);
      }
    }
    
    // If we have a splat/wildcard capture but no corresponding pattern in the destination,
    // and the destination ends with a slash, append the splat value to the end
    if (hasStarSplat && !hasSplatPattern && destination.endsWith('/')) {
      const splatValue = params['splat'] || params['_splat0'] || '';
      destination += splatValue;
    }
    
    // If there are still `:param` patterns in the destination, remove them
    // (This handles optional parameters that weren't matched)
    destination = destination.replace(/:[a-zA-Z0-9_]+(\*)?/g, '');
    
    // Remove any duplicate slashes that might have been created
    destination = destination.replace(/\/+/g, '/');
    
    // Create the destination URL, handling relative URLs
    let destUrl: URL;
    try {
      // Try parsing as absolute URL
      destUrl = new URL(destination);
    } catch {
      // If parsing fails, treat as relative URL
      destUrl = new URL(destination, url.origin);
    }
    
    // Preserve query parameters if configured
    if (redirect.preserveQueryParams) {
      url.searchParams.forEach((value, key) => {
        // Don't override existing params in the destination URL
        if (!destUrl.searchParams.has(key)) {
          destUrl.searchParams.set(key, value);
        }
      });
    }
    
    // Preserve hash if configured
    if (redirect.preserveHash && url.hash) {
      destUrl.hash = url.hash;
    }

    // Log the redirect for debugging
    logger.debug({
      originalPath: url.pathname,
      redirectDestination: destUrl.toString(),
      params
    }, 'Processed redirect');

    // Create the response with appropriate status code and cache headers
    const response = Response.redirect(destUrl.toString(), redirect.statusCode);

    // Add cache headers based on redirect type
    const cacheTTL = this.getCacheTTLForStatusCode(redirect.statusCode);
    const headers = new Headers(response.headers);
    headers.set('Cache-Control', `public, max-age=${cacheTTL}`);
    headers.set('CDN-Cache-Control', `public, max-age=${cacheTTL}`);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  /**
   * Determines cache TTL based on HTTP status code
   */
  private getCacheTTLForStatusCode(statusCode: number): number {
    switch (statusCode) {
      case 301: // Permanent redirect
      case 308: // Permanent redirect (preserve method)
        return 31536000; // 1 year
      case 302: // Temporary redirect
      case 303: // See Other
      case 307: // Temporary redirect (preserve method)
        return 3600; // 1 hour
      default:
        return 3600; // Default to 1 hour
    }
  }

  /**
   * Saves a new redirect to KV
   */
  async saveRedirect(redirect: Redirect): Promise<void> {
    // Validate source pattern
    const patternValidation = validateRedirectPattern(redirect.source);
    if (!patternValidation.valid) {
      const error = new Error(patternValidation.reason || 'Invalid redirect pattern');
      logger.error(
        { source: redirect.source, reason: patternValidation.reason },
        'Invalid redirect pattern',
      );
      throw error;
    }

    const redirectMap = await this.getRedirectMap() || {};
    redirectMap[redirect.source] = redirect;

    await this.kv.put('redirects', JSON.stringify(redirectMap));

    // Invalidate caches
    this.cache.delete(REDIRECT_MAP_CACHE_KEY);
    this.clearPatternCache();

    logger.info({ source: redirect.source }, 'Saved redirect');
  }

  /**
   * Saves multiple redirects to KV
   */
  async saveBulkRedirects(redirects: Redirect[]): Promise<void> {
    const redirectMap = await this.getRedirectMap() || {};

    // Validate all redirects before saving any
    const invalidRedirects: Array<{ source: string; reason: string }> = [];
    for (const redirect of redirects) {
      const patternValidation = validateRedirectPattern(redirect.source);
      if (!patternValidation.valid) {
        invalidRedirects.push({
          source: redirect.source,
          reason: patternValidation.reason || 'Invalid pattern',
        });
      }
    }

    // If any redirects are invalid, reject the entire batch
    if (invalidRedirects.length > 0) {
      const error = new Error(
        `Invalid redirect patterns found: ${invalidRedirects.map(r => `${r.source} (${r.reason})`).join(', ')}`,
      );
      logger.error({ invalidRedirects }, 'Bulk save rejected due to invalid patterns');
      throw error;
    }

    for (const redirect of redirects) {
      redirectMap[redirect.source] = redirect;
    }

    await this.kv.put('redirects', JSON.stringify(redirectMap));

    // Invalidate caches
    this.cache.delete(REDIRECT_MAP_CACHE_KEY);
    this.clearPatternCache();

    logger.info({ count: redirects.length }, 'Saved bulk redirects');
  }

  /**
   * Deletes a redirect from KV
   */
  async deleteRedirect(source: string): Promise<boolean> {
    const redirectMap = await this.getRedirectMap();
    if (!redirectMap || !redirectMap[source]) {
      return false;
    }

    delete redirectMap[source];
    await this.kv.put('redirects', JSON.stringify(redirectMap));

    // Invalidate caches
    this.cache.delete(REDIRECT_MAP_CACHE_KEY);
    this.clearPatternCache();

    logger.info({ source }, 'Deleted redirect');
    return true;
  }

  /**
   * Retrieves all redirects from KV with caching
   */
  async getRedirectMap(): Promise<Record<string, Redirect> | null> {
    // Check cache first
    const cached = this.cache.get(REDIRECT_MAP_CACHE_KEY);
    if (cached !== undefined) {
      return cached;
    }

    // Cache miss - fetch from KV
    const data = await this.kv.get('redirects');
    if (!data) {
      return null;
    }

    try {
      const result = JSON.parse(data);
      const parsed = RedirectMapSchema.safeParse(result);

      if (!parsed.success) {
        logger.error({ error: parsed.error }, 'Failed to parse redirects');
        return null;
      }

      // Store in cache
      this.cache.set(REDIRECT_MAP_CACHE_KEY, parsed.data);

      return parsed.data;
    } catch (error) {
      logger.error({ error }, 'Error parsing redirects');
      return null;
    }
  }

  /**
   * Compiles a pattern into a regex and caches it
   */
  private compilePattern(pattern: string): CompiledPattern {
    // Check cache first
    const cached = this.patternCache.get(pattern);
    if (cached) {
      return cached;
    }

    // Compile the pattern
    let patternRegex = pattern;
    const paramNames: string[] = [];
    const wildcardParams: string[] = [];
    const starWildcards: number[] = [];

    // Replace pattern with regex components
    patternRegex = pattern
      // Step 1: Handle named splat parameters - :param* (multi-segment capture)
      .replace(/:([a-zA-Z0-9_]+)\*/g, (_, name) => {
        paramNames.push(name);
        wildcardParams.push(name);
        return '(.*)';
      })
      // Step 2: Handle standard parameters - :param (single segment)
      .replace(/:([a-zA-Z0-9_]+)/g, (_, name) => {
        if (!wildcardParams.includes(name)) {
          paramNames.push(name);
        }
        return '([^/]+)';
      })
      // Step 3: Handle bare wildcards (*)
      .replace(/\*/g, (_, index) => {
        const paramName = `_splat${starWildcards.length}`;
        paramNames.push(paramName);
        starWildcards.push(index);
        return '(.*)';
      });

    // Create regex with proper anchoring
    const regex = new RegExp(`^${patternRegex}$`);

    // Cache the compiled pattern
    const compiled: CompiledPattern = {
      regex,
      paramNames,
      wildcardParams,
      starWildcards,
    };
    this.patternCache.set(pattern, compiled);

    logger.debug({ pattern, cacheSize: this.patternCache.size }, 'Compiled and cached pattern');

    return compiled;
  }

  /**
   * Utility to match a URL pattern with parameters, wildcards, and advanced patterns
   */
  private matchPattern(path: string, pattern: string): Record<string, string> | null {
    // Get or compile the pattern
    const compiled = this.compilePattern(pattern);

    // Match the path against the compiled regex
    const match = path.match(compiled.regex);

    if (!match) {
      return null;
    }

    // Extract parameters using cached metadata
    const params: Record<string, string> = {};
    for (let i = 0; i < compiled.paramNames.length; i++) {
      const name = compiled.paramNames[i];
      const value = match[i + 1] || '';
      params[name] = value;

      // Keep a special 'splat' parameter for compatibility with Terraform :splat syntax
      if (name.startsWith('_splat')) {
        params['splat'] = value;
      }
    }

    return params;
  }

  /**
   * Gets cache statistics
   */
  getCacheStats() {
    return {
      redirectCache: this.cache.getStats(),
      patternCacheSize: this.patternCache.size,
    };
  }

  /**
   * Clears the redirect map cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Clears the pattern cache
   */
  clearPatternCache(): void {
    const size = this.patternCache.size;
    this.patternCache.clear();
    logger.info({ clearedPatterns: size }, 'Pattern cache cleared');
  }

  /**
   * Checks if a redirect's conditions are met
   */
  private checkConditions(redirect: Redirect, url: URL, request: Request): boolean {
    // Skip if redirect is disabled
    if (!redirect.enabled) {
      return false;
    }
    
    const { conditions } = redirect;
    if (!conditions) {
      return true;
    }
    
    // Check hostname condition
    if (conditions.hostname && url.hostname !== conditions.hostname) {
      return false;
    }
    
    // Check query parameter conditions
    if (conditions.queryParams) {
      for (const [key, value] of Object.entries(conditions.queryParams)) {
        if (url.searchParams.get(key) !== value) {
          return false;
        }
      }
    }
    
    // Check header conditions
    if (conditions.headers) {
      for (const [key, value] of Object.entries(conditions.headers)) {
        if (request.headers.get(key) !== value) {
          return false;
        }
      }
    }
    
    // Check date range condition
    if (conditions.dateRange) {
      const now = new Date();
      
      if (conditions.dateRange.start && now < conditions.dateRange.start) {
        return false;
      }
      
      if (conditions.dateRange.end && now > conditions.dateRange.end) {
        return false;
      }
    }
    
    return true;
  }
}