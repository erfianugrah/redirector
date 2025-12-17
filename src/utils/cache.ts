import { logger } from './logger';

/**
 * Cached item with expiration timestamp
 */
interface CacheEntry<T> {
	value: T;
	expiresAt: number;
}

/**
 * LRU Cache with TTL support
 * Implements Least Recently Used eviction policy with time-based expiration
 */
export class LRUCache<T> {
	private cache: Map<string, CacheEntry<T>>;
	private readonly maxSize: number;
	private readonly ttlMs: number;
	private hits: number = 0;
	private misses: number = 0;

	/**
	 * Creates a new LRU cache
	 * @param maxSize Maximum number of entries (default: 1000)
	 * @param ttlSeconds Time to live in seconds (default: 60)
	 */
	constructor(maxSize: number = 1000, ttlSeconds: number = 60) {
		this.cache = new Map();
		this.maxSize = maxSize;
		this.ttlMs = ttlSeconds * 1000;

		logger.debug(
			{ maxSize, ttlSeconds },
			'Initialized LRU cache',
		);
	}

	/**
	 * Gets a value from the cache
	 * Returns undefined if not found or expired
	 */
	get(key: string): T | undefined {
		const entry = this.cache.get(key);

		if (!entry) {
			this.misses++;
			logger.debug({ key }, 'Cache miss');
			return undefined;
		}

		// Check if expired
		const now = Date.now();
		if (now > entry.expiresAt) {
			this.cache.delete(key);
			this.misses++;
			logger.debug({ key, expired: true }, 'Cache miss (expired)');
			return undefined;
		}

		// Move to end (most recently used) by deleting and re-inserting
		this.cache.delete(key);
		this.cache.set(key, entry);
		this.hits++;
		logger.debug({ key }, 'Cache hit');
		return entry.value;
	}

	/**
	 * Sets a value in the cache
	 * Evicts least recently used entry if cache is full
	 */
	set(key: string, value: T): void {
		const now = Date.now();
		const expiresAt = now + this.ttlMs;

		// Remove existing entry if present
		if (this.cache.has(key)) {
			this.cache.delete(key);
		}

		// Evict LRU entry if cache is full
		if (this.cache.size >= this.maxSize) {
			const firstKey = this.cache.keys().next().value;
			if (firstKey !== undefined) {
				this.cache.delete(firstKey);
				logger.debug({ evictedKey: firstKey }, 'Evicted LRU cache entry');
			}
		}

		// Add new entry at the end (most recently used)
		this.cache.set(key, { value, expiresAt });
		logger.debug({ key, expiresAt: new Date(expiresAt).toISOString() }, 'Cache set');
	}

	/**
	 * Checks if a key exists and is not expired
	 */
	has(key: string): boolean {
		const entry = this.cache.get(key);
		if (!entry) {
			return false;
		}

		const now = Date.now();
		if (now > entry.expiresAt) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Deletes a specific key from the cache
	 */
	delete(key: string): boolean {
		const deleted = this.cache.delete(key);
		if (deleted) {
			logger.debug({ key }, 'Cache entry deleted');
		}
		return deleted;
	}

	/**
	 * Clears all entries from the cache
	 */
	clear(): void {
		const size = this.cache.size;
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
		logger.info({ clearedEntries: size }, 'Cache cleared');
	}

	/**
	 * Returns current cache statistics
	 */
	getStats(): {
		size: number;
		maxSize: number;
		ttlMs: number;
		hits: number;
		misses: number;
		hitRate: number;
	} {
		const totalRequests = this.hits + this.misses;
		const hitRate = totalRequests > 0 ? this.hits / totalRequests : 0;

		return {
			size: this.cache.size,
			maxSize: this.maxSize,
			ttlMs: this.ttlMs,
			hits: this.hits,
			misses: this.misses,
			hitRate: Math.round(hitRate * 10000) / 100, // Percentage with 2 decimals
		};
	}

	/**
	 * Removes all expired entries from the cache
	 * Returns the number of entries removed
	 */
	prune(): number {
		const now = Date.now();
		let pruned = 0;

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				this.cache.delete(key);
				pruned++;
			}
		}

		if (pruned > 0) {
			logger.debug({ prunedEntries: pruned }, 'Pruned expired cache entries');
		}

		return pruned;
	}
}
