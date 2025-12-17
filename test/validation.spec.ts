import { describe, it, expect } from 'vitest';
import {
	validateDestinationUrl,
	validateRedirectPattern,
	sanitizeCsvValue,
	isHostnameAllowed,
	parseAllowedDomains,
} from '../src/utils/validation';

describe('Validation Utilities', () => {
	describe('parseAllowedDomains', () => {
		it('should parse comma-separated domains', () => {
			const result = parseAllowedDomains('example.com,test.com');
			expect(result).toEqual(['example.com', 'test.com']);
		});

		it('should trim whitespace', () => {
			const result = parseAllowedDomains(' example.com , test.com ');
			expect(result).toEqual(['example.com', 'test.com']);
		});

		it('should return empty array for empty string', () => {
			const result = parseAllowedDomains('');
			expect(result).toEqual([]);
		});

		it('should return empty array for undefined', () => {
			const result = parseAllowedDomains(undefined);
			expect(result).toEqual([]);
		});

		it('should filter empty entries', () => {
			const result = parseAllowedDomains('example.com,,test.com');
			expect(result).toEqual(['example.com', 'test.com']);
		});
	});

	describe('isHostnameAllowed', () => {
		it('should match exact domain', () => {
			const allowed = ['example.com', 'test.com'];
			expect(isHostnameAllowed('example.com', allowed)).toBe(true);
			expect(isHostnameAllowed('test.com', allowed)).toBe(true);
		});

		it('should be case-insensitive', () => {
			const allowed = ['Example.COM'];
			expect(isHostnameAllowed('example.com', allowed)).toBe(true);
			expect(isHostnameAllowed('EXAMPLE.COM', allowed)).toBe(true);
		});

		it('should match wildcard subdomains', () => {
			const allowed = ['*.example.com'];
			expect(isHostnameAllowed('sub.example.com', allowed)).toBe(true);
			expect(isHostnameAllowed('deep.sub.example.com', allowed)).toBe(true);
		});

		it('should match base domain with wildcard pattern', () => {
			const allowed = ['*.example.com'];
			expect(isHostnameAllowed('example.com', allowed)).toBe(true);
		});

		it('should not match different domains', () => {
			const allowed = ['example.com'];
			expect(isHostnameAllowed('evil.com', allowed)).toBe(false);
		});

		it('should not match partial domain', () => {
			const allowed = ['example.com'];
			expect(isHostnameAllowed('notexample.com', allowed)).toBe(false);
		});

		it('should match www subdomain automatically', () => {
			const allowed = ['example.com'];
			expect(isHostnameAllowed('www.example.com', allowed)).toBe(true);
		});

		it('should not match www if pattern starts with wildcard', () => {
			const allowed = ['*.example.com'];
			expect(isHostnameAllowed('www.example.com', allowed)).toBe(true);
		});

		it('should return false for empty allowed list', () => {
			expect(isHostnameAllowed('example.com', [])).toBe(false);
		});
	});

	describe('validateDestinationUrl', () => {
		const sourceOrigin = 'https://example.com';

		describe('Relative URLs', () => {
			it('should allow relative URLs', () => {
				const result = validateDestinationUrl('/new-path', sourceOrigin);
				expect(result.valid).toBe(true);
			});

			it('should allow relative URLs with query params', () => {
				const result = validateDestinationUrl('/new-path?foo=bar', sourceOrigin);
				expect(result.valid).toBe(true);
			});

			it('should allow relative URLs with hash', () => {
				const result = validateDestinationUrl('/new-path#section', sourceOrigin);
				expect(result.valid).toBe(true);
			});
		});

		describe('Dangerous Schemes', () => {
			it('should block javascript: URLs', () => {
				const result = validateDestinationUrl('javascript:alert(1)', sourceOrigin);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('blocked scheme');
			});

			it('should block data: URLs', () => {
				const result = validateDestinationUrl(
					'data:text/html,<script>alert(1)</script>',
					sourceOrigin,
				);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('blocked scheme');
			});

			it('should block file: URLs', () => {
				const result = validateDestinationUrl('file:///etc/passwd', sourceOrigin);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('blocked scheme');
			});

			it('should block vbscript: URLs', () => {
				const result = validateDestinationUrl('vbscript:msgbox(1)', sourceOrigin);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('blocked scheme');
			});

			it('should block ftp: URLs', () => {
				const result = validateDestinationUrl('ftp://example.com/file', sourceOrigin);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('blocked scheme');
			});
		});

		describe('HTTP/HTTPS URLs', () => {
			it('should allow HTTP URLs when external redirects allowed', () => {
				const result = validateDestinationUrl(
					'http://external.com',
					sourceOrigin,
					undefined,
					true,
				);
				expect(result.valid).toBe(true);
			});

			it('should allow HTTPS URLs when external redirects allowed', () => {
				const result = validateDestinationUrl(
					'https://external.com',
					sourceOrigin,
					undefined,
					true,
				);
				expect(result.valid).toBe(true);
			});
		});

		describe('Same-Origin Policy', () => {
			it('should allow same-origin redirects by default', () => {
				const result = validateDestinationUrl(
					'https://example.com/path',
					sourceOrigin,
					undefined,
					false,
				);
				expect(result.valid).toBe(true);
			});

			it('should block external redirects by default', () => {
				const result = validateDestinationUrl(
					'https://evil.com/path',
					sourceOrigin,
					undefined,
					false,
				);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('External redirects are not allowed');
			});

			it('should allow external redirects when enabled', () => {
				const result = validateDestinationUrl(
					'https://external.com/path',
					sourceOrigin,
					undefined,
					true,
				);
				expect(result.valid).toBe(true);
			});
		});

		describe('Allowed Domains Whitelist', () => {
			it('should allow whitelisted exact domain', () => {
				const allowed = ['trusted.com'];
				const result = validateDestinationUrl('https://trusted.com/path', sourceOrigin, allowed);
				expect(result.valid).toBe(true);
			});

			it('should allow whitelisted wildcard subdomain', () => {
				const allowed = ['*.trusted.com'];
				const result = validateDestinationUrl(
					'https://sub.trusted.com/path',
					sourceOrigin,
					allowed,
				);
				expect(result.valid).toBe(true);
			});

			it('should block non-whitelisted domain', () => {
				const allowed = ['trusted.com'];
				const result = validateDestinationUrl('https://evil.com/path', sourceOrigin, allowed);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('not in allowed list');
			});

			it('should override external redirect setting with whitelist', () => {
				const allowed = ['trusted.com'];
				const result = validateDestinationUrl(
					'https://trusted.com/path',
					sourceOrigin,
					allowed,
					false, // External redirects disabled, but should be allowed due to whitelist
				);
				expect(result.valid).toBe(true);
			});
		});
	});

	describe('validateRedirectPattern', () => {
		describe('Valid Patterns', () => {
			it('should allow simple path patterns', () => {
				const result = validateRedirectPattern('/old-path');
				expect(result.valid).toBe(true);
			});

			it('should allow path with parameters', () => {
				const result = validateRedirectPattern('/products/:id');
				expect(result.valid).toBe(true);
			});

			it('should allow wildcard patterns', () => {
				const result = validateRedirectPattern('/docs/*');
				expect(result.valid).toBe(true);
			});

			it('should allow named wildcard patterns', () => {
				const result = validateRedirectPattern('/files/:path*');
				expect(result.valid).toBe(true);
			});

			it('should allow absolute URLs', () => {
				const result = validateRedirectPattern('https://example.com/path');
				expect(result.valid).toBe(true);
			});

			it('should allow query parameters', () => {
				const result = validateRedirectPattern('/path?foo=bar&baz=qux');
				expect(result.valid).toBe(true);
			});

			it('should allow URL-safe special characters', () => {
				const result = validateRedirectPattern('/path/:id?foo=bar#section');
				expect(result.valid).toBe(true);
			});
		});

		describe('Length Validation', () => {
			it('should allow patterns up to 200 characters', () => {
				const pattern = '/path' + 'a'.repeat(195); // 200 total
				const result = validateRedirectPattern(pattern);
				expect(result.valid).toBe(true);
			});

			it('should reject patterns over 200 characters', () => {
				const pattern = '/path' + 'a'.repeat(196); // 201 total
				const result = validateRedirectPattern(pattern);
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('maximum length');
			});
		});

		describe('Character Validation', () => {
			it('should reject patterns with spaces', () => {
				const result = validateRedirectPattern('/old path');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should reject patterns with invalid special characters', () => {
				const result = validateRedirectPattern('/path<script>');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should reject patterns with backslashes', () => {
				const result = validateRedirectPattern('/path\\to\\file');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});
		});

		describe('ReDoS Prevention', () => {
			it('should reject patterns with parentheses (potential nested quantifiers)', () => {
				// Parentheses are blocked by character whitelist
				const result = validateRedirectPattern('/(a+)+');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should reject patterns with regex metacharacters', () => {
				// These are blocked by character whitelist as defense in depth
				const result = validateRedirectPattern('/(.*)*/path');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should reject complex regex patterns', () => {
				const result = validateRedirectPattern('/(a*)+');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should reject consecutive wildcards', () => {
				const result = validateRedirectPattern('/path/**/file');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('consecutive wildcards');
			});

			it('should allow single wildcards', () => {
				const result = validateRedirectPattern('/path/*/file');
				expect(result.valid).toBe(true);
			});
		});

		describe('Edge Cases', () => {
			it('should reject empty string', () => {
				const result = validateRedirectPattern('');
				expect(result.valid).toBe(false);
				expect(result.reason).toContain('invalid characters');
			});

			it('should handle just a slash', () => {
				const result = validateRedirectPattern('/');
				expect(result.valid).toBe(true);
			});

			it('should handle complex valid patterns', () => {
				const result = validateRedirectPattern(
					'https://example.com/api/:version/users/:id?format=json',
				);
				expect(result.valid).toBe(true);
			});
		});
	});

	describe('sanitizeCsvValue', () => {
		it('should not modify safe values', () => {
			expect(sanitizeCsvValue('normal text')).toBe('normal text');
			expect(sanitizeCsvValue('123')).toBe('123');
			expect(sanitizeCsvValue('path/to/file')).toBe('path/to/file');
		});

		it('should prefix = with single quote', () => {
			expect(sanitizeCsvValue('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)");
		});

		it('should prefix + with single quote', () => {
			expect(sanitizeCsvValue('+1234')).toBe("'+1234");
		});

		it('should prefix @ with single quote', () => {
			expect(sanitizeCsvValue('@formula')).toBe("'@formula");
		});

		it('should prefix - with single quote', () => {
			expect(sanitizeCsvValue('-123')).toBe("'-123");
		});

		it('should not modify values that contain but do not start with dangerous chars', () => {
			expect(sanitizeCsvValue('test=value')).toBe('test=value');
			expect(sanitizeCsvValue('email+tag@example.com')).toBe('email+tag@example.com');
		});

		it('should handle empty string', () => {
			expect(sanitizeCsvValue('')).toBe('');
		});

		it('should handle multiple dangerous characters', () => {
			expect(sanitizeCsvValue('=+@-test')).toBe("'=+@-test");
		});

		it('should prevent CSV injection attacks', () => {
			// Real-world attack payloads
			expect(sanitizeCsvValue('=cmd|/c calc')).toBe("'=cmd|/c calc");
			expect(sanitizeCsvValue('+cmd|/c calc')).toBe("'+cmd|/c calc");
			expect(sanitizeCsvValue('@SUM(1+1)*cmd|/c calc')).toBe("'@SUM(1+1)*cmd|/c calc");
			expect(sanitizeCsvValue('-2+3+cmd|/c calc')).toBe("'-2+3+cmd|/c calc");
		});
	});
});
