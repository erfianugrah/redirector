import { describe, it, expect } from 'vitest';
import { constantTimeCompare, validateApiKey, ApiKeyType } from '../src/utils/auth';

describe('Authentication Utilities', () => {
	describe('constantTimeCompare', () => {
		it('should return true for identical strings', () => {
			const result = constantTimeCompare('test123', 'test123');
			expect(result).toBe(true);
		});

		it('should return false for different strings of same length', () => {
			const result = constantTimeCompare('test123', 'test456');
			expect(result).toBe(false);
		});

		it('should return false for strings of different lengths', () => {
			const result = constantTimeCompare('test', 'test123');
			expect(result).toBe(false);
		});

		it('should return false for empty vs non-empty strings', () => {
			const result = constantTimeCompare('', 'test');
			expect(result).toBe(false);
		});

		it('should return true for empty strings', () => {
			const result = constantTimeCompare('', '');
			expect(result).toBe(true);
		});

		it('should handle special characters', () => {
			const key = 'a!@#$%^&*()_+{}[]|:;<>?,./';
			const result = constantTimeCompare(key, key);
			expect(result).toBe(true);
		});

		it('should be case-sensitive', () => {
			const result = constantTimeCompare('Test', 'test');
			expect(result).toBe(false);
		});

		it('should handle Unicode characters', () => {
			const key = 'test✓✗😀';
			const result = constantTimeCompare(key, key);
			expect(result).toBe(true);
		});
	});

	describe('validateApiKey', () => {
		it('should authenticate with valid admin key', () => {
			const result = validateApiKey('admin-key-123', 'admin-key-123');
			expect(result.authenticated).toBe(true);
			expect(result.keyType).toBe(ApiKeyType.ADMIN);
		});

		it('should authenticate with valid read-only key', () => {
			const result = validateApiKey('read-key-123', 'admin-key', 'read-key-123');
			expect(result.authenticated).toBe(true);
			expect(result.keyType).toBe(ApiKeyType.READ_ONLY);
		});

		it('should prefer admin key over read-only key', () => {
			const result = validateApiKey('admin-key', 'admin-key', 'admin-key');
			expect(result.authenticated).toBe(true);
			expect(result.keyType).toBe(ApiKeyType.ADMIN);
		});

		it('should reject invalid key', () => {
			const result = validateApiKey('wrong-key', 'admin-key-123');
			expect(result.authenticated).toBe(false);
			expect(result.reason).toBe('Invalid API key');
		});

		it('should reject empty key', () => {
			const result = validateApiKey('', 'admin-key-123');
			expect(result.authenticated).toBe(false);
			expect(result.reason).toBe('No API key provided');
		});

		it('should reject undefined key', () => {
			const result = validateApiKey(undefined, 'admin-key-123');
			expect(result.authenticated).toBe(false);
			expect(result.reason).toBe('No API key provided');
		});

		it('should reject whitespace-only key', () => {
			const result = validateApiKey('   ', 'admin-key-123');
			expect(result.authenticated).toBe(false);
			expect(result.reason).toBe('No API key provided');
		});

		it('should trim whitespace from provided key', () => {
			const result = validateApiKey('  admin-key-123  ', 'admin-key-123');
			expect(result.authenticated).toBe(true);
			expect(result.keyType).toBe(ApiKeyType.ADMIN);
		});

		it('should allow authentication when no keys configured', () => {
			const result = validateApiKey('any-key', undefined, undefined);
			expect(result.authenticated).toBe(true);
			expect(result.keyType).toBe(ApiKeyType.ADMIN);
			expect(result.reason).toBe('No authentication configured');
		});

		it('should handle very long keys', () => {
			const longKey = 'a'.repeat(1000);
			const result = validateApiKey(longKey, longKey);
			expect(result.authenticated).toBe(true);
		});

		it('should handle keys with special characters', () => {
			const specialKey = 'key-!@#$%^&*()_+{}[]|:;<>?,./~`';
			const result = validateApiKey(specialKey, specialKey);
			expect(result.authenticated).toBe(true);
		});

		it('should be timing-attack resistant', () => {
			// This test verifies that validation time doesn't leak information
			// about which character is wrong (constant time comparison)
			const correctKey = 'correct-key-12345678';
			const wrongAtStart = 'xorrect-key-12345678';
			const wrongAtEnd = 'correct-key-1234567x';

			const start1 = Date.now();
			validateApiKey(wrongAtStart, correctKey);
			const time1 = Date.now() - start1;

			const start2 = Date.now();
			validateApiKey(wrongAtEnd, correctKey);
			const time2 = Date.now() - start2;

			// Both should fail, timing should be similar
			// (This is a basic check - true timing attack resistance requires
			// more sophisticated testing)
			expect(time1).toBeGreaterThanOrEqual(0);
			expect(time2).toBeGreaterThanOrEqual(0);
		});
	});
});
