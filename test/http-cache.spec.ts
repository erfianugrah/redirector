import { describe, it, expect, beforeEach } from 'vitest';
import { RedirectService } from '../src/services/redirectService';
import type { KVNamespace } from '@cloudflare/workers-types';
import type { Redirect } from '../src/schemas/redirect';

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

describe('HTTP Response Caching', () => {
	let mockKV: MockKVNamespace;
	let redirectService: RedirectService;

	beforeEach(() => {
		mockKV = new MockKVNamespace();
		redirectService = new RedirectService(mockKV as unknown as KVNamespace);
	});

	describe('Cache-Control Headers', () => {
		it('should add cache headers for 301 permanent redirects', async () => {
			const redirect: Redirect = {
				source: '/old',
				destination: '/new',
				statusCode: 301,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/old');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(301);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000');
			expect(response.headers.get('CDN-Cache-Control')).toBe('public, max-age=31536000');
		});

		it('should add cache headers for 302 temporary redirects', async () => {
			const redirect: Redirect = {
				source: '/temp',
				destination: '/destination',
				statusCode: 302,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/temp');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(302);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
			expect(response.headers.get('CDN-Cache-Control')).toBe('public, max-age=3600');
		});

		it('should add cache headers for 307 temporary redirects', async () => {
			const redirect: Redirect = {
				source: '/temp-preserve',
				destination: '/new-location',
				statusCode: 307,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/temp-preserve');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(307);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
			expect(response.headers.get('CDN-Cache-Control')).toBe('public, max-age=3600');
		});

		it('should add cache headers for 308 permanent redirects', async () => {
			const redirect: Redirect = {
				source: '/permanent-preserve',
				destination: '/final-location',
				statusCode: 308,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/permanent-preserve');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(308);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000');
			expect(response.headers.get('CDN-Cache-Control')).toBe('public, max-age=31536000');
		});

		it('should preserve location header from redirect response', async () => {
			const redirect: Redirect = {
				source: '/source',
				destination: '/destination',
				statusCode: 301,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/source');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.headers.get('Location')).toBe('http://example.com/destination');
		});
	});

	describe('Cache TTL by Status Code', () => {
		it('should use 1 year cache for 301 redirects', async () => {
			const redirect: Redirect = {
				source: '/perm',
				destination: '/new',
				statusCode: 301,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/perm');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			const cacheControl = response.headers.get('Cache-Control');
			expect(cacheControl).toContain('max-age=31536000'); // 1 year in seconds
		});

		it('should use 1 hour cache for 302 redirects', async () => {
			const redirect: Redirect = {
				source: '/temp',
				destination: '/new',
				statusCode: 302,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/temp');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			const cacheControl = response.headers.get('Cache-Control');
			expect(cacheControl).toContain('max-age=3600'); // 1 hour in seconds
		});
	});

	describe('Cache Headers with Dynamic Redirects', () => {
		it('should add cache headers for pattern-based redirects', async () => {
			const redirect: Redirect = {
				source: '/products/:id',
				destination: '/items/:id',
				statusCode: 301,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/products/123');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(301);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=31536000');
			expect(response.headers.get('Location')).toBe('http://example.com/items/123');
		});

		it('should add cache headers for wildcard redirects', async () => {
			const redirect: Redirect = {
				source: '/old/*',
				destination: '/new/*',
				statusCode: 302,
				enabled: true,
			};

			await redirectService.saveRedirect(redirect);

			const url = new URL('http://example.com/old/path/to/file');
			const result = await redirectService.matchRedirect(url, new Request(url));
			const response = redirectService.processRedirect(result, url);

			expect(response.status).toBe(302);
			expect(response.headers.get('Cache-Control')).toBe('public, max-age=3600');
			expect(response.headers.get('Location')).toBe('http://example.com/new/path/to/file');
		});
	});
});
