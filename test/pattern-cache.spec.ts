import { describe, it, expect, beforeEach } from 'vitest';
import { RedirectService } from '../src/services/redirectService';
import type { KVNamespace } from '@cloudflare/workers-types';

// Mock KVNamespace
class MockKVNamespace implements Pick<KVNamespace, 'get' | 'put' | 'delete' | 'list'> {
	private storage: Map<string, string> = new Map();

	async get(key: string): Promise<string | null> {
		return this.storage.get(key) || null;
	}

	async put(key: string, value: string): Promise<void> {
		this.storage.set(key, value);
	}

	async delete(key: string): Promise<void> {
		this.storage.delete(key);
	}

	// biome-ignore lint: unused for testing
	async list(): Promise<any> {
		return { keys: [] };
	}
}

describe('Pattern Cache', () => {
	let mockKV: MockKVNamespace;
	let redirectService: RedirectService;

	beforeEach(() => {
		mockKV = new MockKVNamespace();
		redirectService = new RedirectService(mockKV as unknown as KVNamespace);
	});

	describe('Pattern Compilation and Caching', () => {
		it('should compile and cache patterns on first use', async () => {
			// Add a redirect with a pattern
			await redirectService.saveRedirect({
				source: '/products/:id',
				destination: '/items/:id',
				statusCode: 301,
				enabled: true,
			});

			// Match the pattern multiple times
			const url1 = new URL('http://example.com/products/123');
			const result1 = await redirectService.matchRedirect(url1, new Request(url1));

			const url2 = new URL('http://example.com/products/456');
			const result2 = await redirectService.matchRedirect(url2, new Request(url2));

			// Both should match successfully
			expect(result1.matched).toBe(true);
			expect(result2.matched).toBe(true);

			// Verify cache stats include pattern cache size
			const stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBeGreaterThan(0);
		});

		it('should cache different pattern types', async () => {
			await redirectService.saveBulkRedirects([
				{
					source: '/exact',
					destination: '/new-exact',
					statusCode: 301,
					enabled: true,
				},
				{
					source: '/with/:param',
					destination: '/new/:param',
					statusCode: 301,
					enabled: true,
				},
				{
					source: '/wildcard/*',
					destination: '/new/*',
					statusCode: 301,
					enabled: true,
				},
				{
					source: '/named/:path*',
					destination: '/new/:path*',
					statusCode: 301,
					enabled: true,
				},
			]);

			// Match each pattern type
			const url1 = new URL('http://example.com/exact');
			await redirectService.matchRedirect(url1, new Request(url1));

			const url2 = new URL('http://example.com/with/value');
			await redirectService.matchRedirect(url2, new Request(url2));

			const url3 = new URL('http://example.com/wildcard/path/to/file');
			await redirectService.matchRedirect(url3, new Request(url3));

			const url4 = new URL('http://example.com/named/deep/nested/path');
			await redirectService.matchRedirect(url4, new Request(url4));

			// Should have cached 4 patterns (plus potentially some lowercase variations)
			const stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBeGreaterThanOrEqual(4);
		});

		it('should clear pattern cache on redirect save', async () => {
			// Add initial redirect
			await redirectService.saveRedirect({
				source: '/test/:id',
				destination: '/new/:id',
				statusCode: 301,
				enabled: true,
			});

			// Match to populate cache
			const url = new URL('http://example.com/test/123');
			await redirectService.matchRedirect(url, new Request(url));

			// Verify cache has entries
			let stats = redirectService.getCacheStats();
			const initialSize = stats.patternCacheSize;
			expect(initialSize).toBeGreaterThan(0);

			// Save a new redirect
			await redirectService.saveRedirect({
				source: '/another',
				destination: '/different',
				statusCode: 301,
				enabled: true,
			});

			// Cache should be cleared
			stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBe(0);
		});

		it('should clear pattern cache on redirect delete', async () => {
			// Add redirect with pattern (not exact match)
			await redirectService.saveRedirect({
				source: '/delete-test/:id',
				destination: '/new/:id',
				statusCode: 301,
				enabled: true,
			});

			// Match to populate cache
			const url = new URL('http://example.com/delete-test/123');
			await redirectService.matchRedirect(url, new Request(url));

			// Verify cache has entries
			let stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBeGreaterThan(0);

			// Delete the redirect
			await redirectService.deleteRedirect('/delete-test/:id');

			// Cache should be cleared
			stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBe(0);
		});

		it('should clear pattern cache on bulk save', async () => {
			// Add initial redirect with pattern
			await redirectService.saveRedirect({
				source: '/initial/:id',
				destination: '/new/:id',
				statusCode: 301,
				enabled: true,
			});

			// Match to populate cache
			const url = new URL('http://example.com/initial/123');
			await redirectService.matchRedirect(url, new Request(url));

			// Verify cache has entries
			let stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBeGreaterThan(0);

			// Bulk save
			await redirectService.saveBulkRedirects([
				{
					source: '/bulk1',
					destination: '/new1',
					statusCode: 301,
					enabled: true,
				},
				{
					source: '/bulk2',
					destination: '/new2',
					statusCode: 301,
					enabled: true,
				},
			]);

			// Cache should be cleared
			stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBe(0);
		});

		it('should handle pattern cache clearing explicitly', async () => {
			// Add redirects and populate cache
			await redirectService.saveBulkRedirects([
				{
					source: '/test1/:id',
					destination: '/new1/:id',
					statusCode: 301,
					enabled: true,
				},
				{
					source: '/test2/*',
					destination: '/new2/*',
					statusCode: 301,
					enabled: true,
				},
			]);

			const url1 = new URL('http://example.com/test1/123');
			await redirectService.matchRedirect(url1, new Request(url1));

			const url2 = new URL('http://example.com/test2/path');
			await redirectService.matchRedirect(url2, new Request(url2));

			// Verify cache is populated
			let stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBeGreaterThan(0);

			// Clear pattern cache explicitly
			redirectService.clearPatternCache();

			// Cache should be empty
			stats = redirectService.getCacheStats();
			expect(stats.patternCacheSize).toBe(0);
		});
	});

	describe('Pattern Matching with Cache', () => {
		it('should match patterns correctly with caching', async () => {
			await redirectService.saveRedirect({
				source: '/users/:userId/posts/:postId',
				destination: '/content/:userId/:postId',
				statusCode: 301,
				enabled: true,
			});

			// First match - compiles and caches
			const url1 = new URL('http://example.com/users/john/posts/42');
			const result1 = await redirectService.matchRedirect(url1, new Request(url1));

			expect(result1.matched).toBe(true);
			expect(result1.params).toEqual({
				userId: 'john',
				postId: '42',
			});

			// Second match - uses cached pattern
			const url2 = new URL('http://example.com/users/jane/posts/99');
			const result2 = await redirectService.matchRedirect(url2, new Request(url2));

			expect(result2.matched).toBe(true);
			expect(result2.params).toEqual({
				userId: 'jane',
				postId: '99',
			});
		});

		it('should handle wildcard patterns with caching', async () => {
			await redirectService.saveRedirect({
				source: '/api/v1/*',
				destination: '/api/v2/*',
				statusCode: 301,
				enabled: true,
			});

			// Match multiple times
			const url1 = new URL('http://example.com/api/v1/users');
			const result1 = await redirectService.matchRedirect(url1, new Request(url1));

			expect(result1.matched).toBe(true);
			expect(result1.params?._splat0 || result1.params?.splat).toBe('users');

			const url2 = new URL('http://example.com/api/v1/posts/123');
			const result2 = await redirectService.matchRedirect(url2, new Request(url2));

			expect(result2.matched).toBe(true);
			expect(result2.params?._splat0 || result2.params?.splat).toBe('posts/123');
		});
	});
});
