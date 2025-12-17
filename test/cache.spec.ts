import { describe, it, expect, beforeEach } from 'vitest';
import { LRUCache } from '../src/utils/cache';

describe('LRU Cache', () => {
	describe('Basic Operations', () => {
		let cache: LRUCache<string>;

		beforeEach(() => {
			cache = new LRUCache<string>(3, 60); // Small cache for testing
		});

		it('should store and retrieve values', () => {
			cache.set('key1', 'value1');
			expect(cache.get('key1')).toBe('value1');
		});

		it('should return undefined for non-existent keys', () => {
			expect(cache.get('nonexistent')).toBeUndefined();
		});

		it('should check if key exists', () => {
			cache.set('key1', 'value1');
			expect(cache.has('key1')).toBe(true);
			expect(cache.has('nonexistent')).toBe(false);
		});

		it('should delete specific keys', () => {
			cache.set('key1', 'value1');
			expect(cache.delete('key1')).toBe(true);
			expect(cache.get('key1')).toBeUndefined();
		});

		it('should return false when deleting non-existent key', () => {
			expect(cache.delete('nonexistent')).toBe(false);
		});

		it('should clear all entries', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.clear();
			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBeUndefined();
		});
	});

	describe('LRU Eviction', () => {
		let cache: LRUCache<string>;

		beforeEach(() => {
			cache = new LRUCache<string>(3, 60);
		});

		it('should evict least recently used entry when cache is full', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');
			cache.set('key4', 'value4'); // Should evict key1

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe('value2');
			expect(cache.get('key3')).toBe('value3');
			expect(cache.get('key4')).toBe('value4');
		});

		it('should update LRU order on access', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');

			// Access key1 to make it most recently used
			cache.get('key1');

			// Add key4, should evict key2 (least recently used)
			cache.set('key4', 'value4');

			expect(cache.get('key1')).toBe('value1');
			expect(cache.get('key2')).toBeUndefined();
			expect(cache.get('key3')).toBe('value3');
			expect(cache.get('key4')).toBe('value4');
		});

		it('should update LRU order on set for existing key', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');
			cache.set('key3', 'value3');

			// Update key1 to make it most recently used
			cache.set('key1', 'value1_updated');

			// Add key4, should evict key2
			cache.set('key4', 'value4');

			expect(cache.get('key1')).toBe('value1_updated');
			expect(cache.get('key2')).toBeUndefined();
			expect(cache.get('key3')).toBe('value3');
			expect(cache.get('key4')).toBe('value4');
		});
	});

	describe('TTL Expiration', () => {
		it('should expire entries after TTL', async () => {
			const cache = new LRUCache<string>(10, 0.1); // 100ms TTL
			cache.set('key1', 'value1');

			// Should exist immediately
			expect(cache.get('key1')).toBe('value1');

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Should be expired
			expect(cache.get('key1')).toBeUndefined();
		});

		it('should not return expired entries via has()', async () => {
			const cache = new LRUCache<string>(10, 0.1); // 100ms TTL
			cache.set('key1', 'value1');

			expect(cache.has('key1')).toBe(true);

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 150));

			expect(cache.has('key1')).toBe(false);
		});

		it('should prune expired entries', async () => {
			const cache = new LRUCache<string>(10, 0.1); // 100ms TTL

			cache.set('key1', 'value1');
			cache.set('key2', 'value2');

			// Wait for expiration
			await new Promise((resolve) => setTimeout(resolve, 150));

			// Set a fresh entry
			cache.set('key3', 'value3');

			// Prune should remove expired entries
			const pruned = cache.prune();
			expect(pruned).toBe(2);

			const stats = cache.getStats();
			expect(stats.size).toBe(1); // Only key3 should remain
		});
	});

	describe('Statistics', () => {
		let cache: LRUCache<string>;

		beforeEach(() => {
			cache = new LRUCache<string>(10, 60);
		});

		it('should track cache hits', () => {
			cache.set('key1', 'value1');
			cache.get('key1');
			cache.get('key1');

			const stats = cache.getStats();
			expect(stats.hits).toBe(2);
		});

		it('should track cache misses', () => {
			cache.get('nonexistent');
			cache.get('nonexistent');

			const stats = cache.getStats();
			expect(stats.misses).toBe(2);
		});

		it('should calculate hit rate correctly', () => {
			cache.set('key1', 'value1');
			cache.get('key1'); // hit
			cache.get('key1'); // hit
			cache.get('nonexistent'); // miss

			const stats = cache.getStats();
			expect(stats.hits).toBe(2);
			expect(stats.misses).toBe(1);
			expect(stats.hitRate).toBeCloseTo(66.67, 1); // 2/3 = 66.67%
		});

		it('should track cache size', () => {
			cache.set('key1', 'value1');
			cache.set('key2', 'value2');

			const stats = cache.getStats();
			expect(stats.size).toBe(2);
			expect(stats.maxSize).toBe(10);
		});

		it('should reset stats on clear', () => {
			cache.set('key1', 'value1');
			cache.get('key1');
			cache.get('nonexistent');

			cache.clear();

			const stats = cache.getStats();
			expect(stats.hits).toBe(0);
			expect(stats.misses).toBe(0);
			expect(stats.size).toBe(0);
		});

		it('should handle zero requests without division by zero', () => {
			const stats = cache.getStats();
			expect(stats.hitRate).toBe(0);
		});
	});

	describe('Complex Data Types', () => {
		it('should handle object values', () => {
			const cache = new LRUCache<{ name: string; age: number }>(10, 60);
			const value = { name: 'Alice', age: 30 };

			cache.set('user1', value);
			expect(cache.get('user1')).toEqual(value);
		});

		it('should handle array values', () => {
			const cache = new LRUCache<string[]>(10, 60);
			const value = ['a', 'b', 'c'];

			cache.set('list1', value);
			expect(cache.get('list1')).toEqual(value);
		});

		it('should handle nested objects', () => {
			type ComplexType = {
				id: string;
				data: {
					items: Array<{ name: string }>;
					metadata: Record<string, unknown>;
				};
			};

			const cache = new LRUCache<ComplexType>(10, 60);
			const value: ComplexType = {
				id: '123',
				data: {
					items: [{ name: 'item1' }],
					metadata: { version: 1 },
				},
			};

			cache.set('complex1', value);
			expect(cache.get('complex1')).toEqual(value);
		});
	});

	describe('Edge Cases', () => {
		it('should handle cache with size 1', () => {
			const cache = new LRUCache<string>(1, 60);
			cache.set('key1', 'value1');
			cache.set('key2', 'value2'); // Should evict key1

			expect(cache.get('key1')).toBeUndefined();
			expect(cache.get('key2')).toBe('value2');
		});

		it('should handle very short TTL', async () => {
			const cache = new LRUCache<string>(10, 0.01); // 10ms TTL
			cache.set('key1', 'value1');

			await new Promise((resolve) => setTimeout(resolve, 15));

			expect(cache.get('key1')).toBeUndefined();
		});

		it('should handle empty string keys', () => {
			const cache = new LRUCache<string>(10, 60);
			cache.set('', 'empty key');
			expect(cache.get('')).toBe('empty key');
		});

		it('should handle special character keys', () => {
			const cache = new LRUCache<string>(10, 60);
			const specialKey = '!@#$%^&*()_+-=[]{}|;:,.<>?';
			cache.set(specialKey, 'special');
			expect(cache.get(specialKey)).toBe('special');
		});
	});
});
