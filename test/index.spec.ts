// test/index.spec.ts
import { env, createExecutionContext, waitOnExecutionContext, SELF } from 'cloudflare:test';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import worker from '../src/index';
import { RedirectService, RedirectResult } from '../src/services/redirectService';
import { FormatService } from '../src/services/formatService';
import { Redirect } from '../src/schemas/redirect';
import { FileFormat } from '../src/schemas/file-formats';

// For now, you'll need to do something like this to get a correctly-typed
// `Request` to pass to `worker.fetch()`.
const IncomingRequest = Request<unknown, IncomingRequestCfProperties>;

// Mock KVNamespace
class MockKVNamespace implements KVNamespace {
  private store: Map<string, string> = new Map();

  async get(key: string): Promise<string | null> {
    return this.store.get(key) || null;
  }

  async put(key: string, value: string | ReadableStream | ArrayBuffer): Promise<void> {
    this.store.set(key, value.toString());
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async list(): Promise<{ keys: { name: string; expiration?: number; metadata?: unknown }[] }> {
    return { 
      keys: Array.from(this.store.keys()).map(name => ({ name })) 
    };
  }

  async getWithMetadata(): Promise<{ value: string | null; metadata: unknown }> {
    return { value: null, metadata: {} };
  }
}

describe('Redirector Worker Tests', () => {
  describe('API Endpoints', () => {
    it('responds with health check', async () => {
      const request = new IncomingRequest('http://example.com/health');
      const ctx = createExecutionContext();
      const response = await worker.fetch(request, env, ctx);
      await waitOnExecutionContext(ctx);
      
      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual({ status: 'ok' });
    });
  });
  
  describe('RedirectService', () => {
    let redirectService: RedirectService;
    let mockKV: MockKVNamespace;
    
    beforeEach(() => {
      mockKV = new MockKVNamespace();
      redirectService = new RedirectService(mockKV as unknown as KVNamespace);
    });
    
    describe('saveRedirect and getRedirectMap', () => {
      it('should save and retrieve a redirect', async () => {
        const redirect: Redirect = {
          source: '/old-page',
          destination: '/new-page',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const redirectMap = await redirectService.getRedirectMap();
        expect(redirectMap).not.toBeNull();
        expect(redirectMap!['/old-page']).toEqual(redirect);
      });
    });
    
    describe('saveBulkRedirects', () => {
      it('should save multiple redirects', async () => {
        const redirects: Redirect[] = [
          {
            source: '/page-1',
            destination: '/new-page-1',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          {
            source: '/page-2',
            destination: '/new-page-2',
            statusCode: 302,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          }
        ];
        
        await redirectService.saveBulkRedirects(redirects);
        
        const redirectMap = await redirectService.getRedirectMap();
        expect(redirectMap).not.toBeNull();
        expect(Object.keys(redirectMap!)).toHaveLength(2);
        expect(redirectMap!['/page-1']).toEqual(redirects[0]);
        expect(redirectMap!['/page-2']).toEqual(redirects[1]);
      });
    });
    
    describe('deleteRedirect', () => {
      it('should delete a redirect', async () => {
        const redirect: Redirect = {
          source: '/delete-me',
          destination: '/somewhere',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        let redirectMap = await redirectService.getRedirectMap();
        expect(redirectMap!['/delete-me']).toEqual(redirect);
        
        const result = await redirectService.deleteRedirect('/delete-me');
        expect(result).toBe(true);
        
        redirectMap = await redirectService.getRedirectMap();
        expect(redirectMap!['/delete-me']).toBeUndefined();
      });
      
      it('should return false when trying to delete a non-existent redirect', async () => {
        const result = await redirectService.deleteRedirect('/does-not-exist');
        expect(result).toBe(false);
      });
    });
    
    describe('matchRedirect', () => {
      it('should match an exact path', async () => {
        const redirect: Redirect = {
          source: '/exact-path',
          destination: '/destination',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://example.com/exact-path');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(true);
        expect(result.redirect).toEqual(redirect);
      });
      
      it('should match a path with parameters', async () => {
        const redirect: Redirect = {
          source: '/products/:productId',
          destination: '/new-products/:productId',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://example.com/products/123');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(true);
        expect(result.redirect).toEqual(redirect);
        expect(result.params).toEqual({ productId: '123' });
      });
      
      it('should match a path with wildcards', async () => {
        const redirect: Redirect = {
          source: '/docs/*',
          destination: '/documentation/*',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://example.com/docs/guides/getting-started');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(true);
        expect(result.redirect).toEqual(redirect);
        expect(result.params).toBeDefined();
        expect(result.params!._splat0).toBe('guides/getting-started');
      });
      
      it('should match a path with named wildcard parameters', async () => {
        const redirect: Redirect = {
          source: '/blog/:path*',
          destination: '/articles/:path*',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://example.com/blog/2023/01/my-post');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(true);
        expect(result.redirect).toEqual(redirect);
        expect(result.params).toBeDefined();
        expect(result.params!.path).toBe('2023/01/my-post');
      });
      
      it('should match a full absolute URL', async () => {
        const redirect: Redirect = {
          source: 'https://old-domain.com/*',
          destination: 'https://new-domain.com/*',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://old-domain.com/some/path');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(true);
        expect(result.redirect).toEqual(redirect);
        expect(result.params).toBeDefined();
        expect(result.params!._splat0).toBe('some/path');
      });
      
      it('should match with domain conditions', async () => {
        const redirect: Redirect = {
          source: '/special-path',
          destination: '/special-destination',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true,
          conditions: {
            hostname: 'example.com'
          }
        };
        
        await redirectService.saveRedirect(redirect);
        
        // This should match with the correct hostname
        const url1 = new URL('https://example.com/special-path');
        const request1 = new Request(url1.toString());
        
        const result1 = await redirectService.matchRedirect(url1, request1);
        expect(result1.matched).toBe(true);
        
        // This should not match with a different hostname
        const url2 = new URL('https://other-domain.com/special-path');
        const request2 = new Request(url2.toString());
        
        const result2 = await redirectService.matchRedirect(url2, request2);
        expect(result2.matched).toBe(false);
      });
      
      it('should not match when redirect is disabled', async () => {
        const redirect: Redirect = {
          source: '/disabled',
          destination: '/somewhere',
          statusCode: 301,
          enabled: false,
          preserveQueryParams: true,
          preserveHash: true
        };
        
        await redirectService.saveRedirect(redirect);
        
        const url = new URL('https://example.com/disabled');
        const request = new Request(url.toString());
        
        const result = await redirectService.matchRedirect(url, request);
        expect(result.matched).toBe(false);
      });
    });
    
    describe('processRedirect', () => {
      it('should create a redirect response with the correct status code', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/source',
            destination: '/destination',
            statusCode: 302,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          }
        };
        
        const url = new URL('https://example.com/source');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.status).toBe(302);
        expect(response.headers.get('Location')).toBe('https://example.com/destination');
      });
      
      it('should substitute parameters in the destination URL', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/products/:productId',
            destination: '/new-products/:productId',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          params: {
            productId: '123'
          }
        };
        
        const url = new URL('https://example.com/products/123');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/new-products/123');
      });
      
      it('should handle wildcards in the destination URL', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/docs/*',
            destination: '/documentation/*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          params: {
            _splat0: 'guides/getting-started'
          }
        };
        
        const url = new URL('https://example.com/docs/guides/getting-started');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/documentation/guides/getting-started');
      });
      
      it('should handle named wildcard parameters in the destination URL', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/blog/:path*',
            destination: '/articles/:path*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          params: {
            path: '2023/01/my-post'
          }
        };
        
        const url = new URL('https://example.com/blog/2023/01/my-post');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/articles/2023/01/my-post');
      });
      
      it('should preserve query parameters when configured', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/source',
            destination: '/destination',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          }
        };
        
        const url = new URL('https://example.com/source?param1=value1&param2=value2');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/destination?param1=value1&param2=value2');
      });
      
      it('should handle multiple parameters in a single path segment', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/users/:userId/posts/:postId',
            destination: '/profiles/:userId/content/:postId',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          params: {
            userId: '123',
            postId: '456'
          }
        };
        
        const url = new URL('https://example.com/users/123/posts/456');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/profiles/123/content/456');
      });
      
      it('should handle absolute URLs with domain changes when external redirects allowed', () => {
        // Create a service that allows external redirects
        const externalRedirectService = new RedirectService(
          mockKV as unknown as KVNamespace,
          undefined, // No domain whitelist
          'true', // Allow external redirects
        );

        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: 'https://old-domain.com/path',
            destination: 'https://new-domain.com/path',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          }
        };

        const url = new URL('https://old-domain.com/path');
        const response = externalRedirectService.processRedirect(redirectResult, url);

        expect(response.headers.get('Location')).toBe('https://new-domain.com/path');
      });

      it('should block external redirects by default', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: 'https://old-domain.com/path',
            destination: 'https://evil.com/path',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          }
        };

        const url = new URL('https://old-domain.com/path');
        const response = redirectService.processRedirect(redirectResult, url);

        expect(response.status).toBe(403);
      });
      
      it('should correctly handle wildcards with query parameters', () => {
        const redirectResult: RedirectResult = {
          matched: true,
          redirect: {
            source: '/docs/*',
            destination: '/documentation/*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true
          },
          params: {
            _splat0: 'api/v1/endpoints'
          }
        };
        
        const url = new URL('https://example.com/docs/api/v1/endpoints?version=2&debug=true');
        const response = redirectService.processRedirect(redirectResult, url);
        
        expect(response.headers.get('Location')).toBe('https://example.com/documentation/api/v1/endpoints?version=2&debug=true');
      });
    });
  });
  
  describe('FormatService', () => {
    describe('Terraform format parsing', () => {
      it('should parse Terraform content with wildcards', () => {
        const formatService = new FormatService();
        const content = `
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Description"

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
}`;
        
        const redirects = formatService.parseContent(content, 'terraform');
        expect(redirects).toHaveLength(1);
        expect(redirects[0].source).toBe('https://example.com/docs/*');
        expect(redirects[0].destination).toBe('https://example.com/documentation/*');
        expect(redirects[0].statusCode).toBe(301);
      });
      
      it('should roundtrip complex redirects through export and import', () => {
        const formatService = new FormatService();
        
        // Create a complex redirect
        const originalRedirects: Redirect[] = [
          {
            source: '/docs/*',
            destination: '/documentation/*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true,
            description: 'Wildcard path capture',
          },
          {
            source: 'https://old-domain.com/*',
            destination: 'https://new-domain.com/*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true,
            description: 'Cross-domain redirect with wildcard',
            conditions: {
              hostname: 'old-domain.com'
            }
          },
          {
            source: '/blog/:year/:month/:slug',
            destination: '/articles/:year/:month/:slug',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true,
            description: 'Multiple path parameters'
          },
          {
            source: '/legacy/:path*',
            destination: '/new/:path*',
            statusCode: 301,
            enabled: true,
            preserveQueryParams: true,
            preserveHash: true,
            description: 'Named wildcard parameter'
          }
        ];
        
        // Export to all formats
        const jsonContent = formatService.exportRedirects(
          Object.fromEntries(originalRedirects.map(r => [r.source, r])), 
          FileFormat.JSON
        );
        
        const csvContent = formatService.exportRedirects(
          Object.fromEntries(originalRedirects.map(r => [r.source, r])), 
          FileFormat.CSV
        );
        
        const terraformContent = formatService.exportRedirects(
          Object.fromEntries(originalRedirects.map(r => [r.source, r])), 
          FileFormat.TERRAFORM
        );
        
        // Import back from all formats
        const jsonRedirects = formatService.parseContent(jsonContent, FileFormat.JSON);
        const csvRedirects = formatService.parseContent(csvContent, FileFormat.CSV);
        const terraformRedirects = formatService.parseContent(terraformContent, FileFormat.TERRAFORM);
        
        // Check that we have the same number of redirects
        expect(jsonRedirects.length).toBe(originalRedirects.length);
        
        // Verify some key properties survived the roundtrip
        expect(jsonRedirects).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              source: '/docs/*',
              destination: '/documentation/*'
            }),
            expect.objectContaining({
              source: 'https://old-domain.com/*',
              destination: 'https://new-domain.com/*'
            }),
            expect.objectContaining({
              source: '/blog/:year/:month/:slug',
              destination: '/articles/:year/:month/:slug'
            }),
            expect.objectContaining({
              source: '/legacy/:path*',
              destination: '/new/:path*'
            })
          ])
        );
        
        // CSV format doesn't preserve all properties, but check the basics
        expect(csvRedirects.length).toBeGreaterThanOrEqual(4);
        expect(csvRedirects).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              source: '/docs/*',
              destination: '/documentation/*'
            })
          ])
        );
        
        // Terraform format should capture the complex redirect patterns
        expect(terraformRedirects.length).toBeGreaterThanOrEqual(4);
        expect(terraformRedirects).toEqual(
          expect.arrayContaining([
            expect.objectContaining({
              source: '/docs/*',
              destination: '/documentation/*'
            })
          ])
        );
      });
    });
    
    describe('JSON format parsing', () => {
      it('should parse JSON content with wildcards and parameters', () => {
        const formatService = new FormatService();
        const content = JSON.stringify({
          redirects: [
            {
              source: '/docs/*',
              destination: '/documentation/*',
              statusCode: 301,
              enabled: true
            },
            {
              source: '/products/:productId',
              destination: '/items/:productId',
              statusCode: 301,
              enabled: true
            },
            {
              source: '/blog/:path*',
              destination: '/articles/:path*',
              statusCode: 301,
              enabled: true
            }
          ]
        });
        
        const redirects = formatService.parseContent(content, 'json');
        expect(redirects).toHaveLength(3);
        
        // Check wildcard redirect
        expect(redirects[0].source).toBe('/docs/*');
        expect(redirects[0].destination).toBe('/documentation/*');
        
        // Check parameter redirect
        expect(redirects[1].source).toBe('/products/:productId');
        expect(redirects[1].destination).toBe('/items/:productId');
        
        // Check named wildcard parameter redirect
        expect(redirects[2].source).toBe('/blog/:path*');
        expect(redirects[2].destination).toBe('/articles/:path*');
      });
    });
    
    describe('CSV format parsing', () => {
      it('should parse CSV content with wildcards and parameters', () => {
        const formatService = new FormatService();
        const content = `source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/docs/*,/documentation/*,301,true,true,true,Wildcard path capture,
/products/:productId,/items/:productId,301,true,true,true,Dynamic path parameter capture,
/blog/:path*,/articles/:path*,301,true,true,true,Named wildcard path parameter,`;
        
        const redirects = formatService.parseContent(content, 'csv');
        expect(redirects).toHaveLength(3);
        
        // Check wildcard redirect
        expect(redirects[0].source).toBe('/docs/*');
        expect(redirects[0].destination).toBe('/documentation/*');
        
        // Check parameter redirect
        expect(redirects[1].source).toBe('/products/:productId');
        expect(redirects[1].destination).toBe('/items/:productId');
        
        // Check named wildcard parameter redirect
        expect(redirects[2].source).toBe('/blog/:path*');
        expect(redirects[2].destination).toBe('/articles/:path*');
      });
    });
  });
});