import { logger } from './logger';

/**
 * URL validation utilities to prevent open redirect vulnerabilities
 */

export interface ValidationResult {
	valid: boolean;
	reason?: string;
}

/**
 * Parse allowed domains configuration from environment variable
 * Supports wildcards: *.example.com, example.com
 */
export function parseAllowedDomains(allowedDomainsConfig?: string): string[] {
	if (!allowedDomainsConfig) {
		return [];
	}

	return allowedDomainsConfig
		.split(',')
		.map(d => d.trim())
		.filter(d => d.length > 0);
}

/**
 * Check if a hostname matches an allowed domain pattern
 * Supports wildcard patterns: *.example.com matches sub.example.com
 */
export function isHostnameAllowed(hostname: string, allowedDomains: string[]): boolean {
	// Normalize hostname to lowercase
	const normalizedHostname = hostname.toLowerCase();

	for (const pattern of allowedDomains) {
		const normalizedPattern = pattern.toLowerCase();

		// Exact match
		if (normalizedHostname === normalizedPattern) {
			return true;
		}

		// Wildcard match: *.example.com
		if (normalizedPattern.startsWith('*.')) {
			const baseDomain = normalizedPattern.substring(2); // Remove "*."

			// Check if hostname ends with .baseDomain
			if (normalizedHostname.endsWith(`.${baseDomain}`)) {
				return true;
			}

			// Also match the base domain itself
			if (normalizedHostname === baseDomain) {
				return true;
			}
		}

		// Wildcard match: example.com should also match www.example.com
		// (only if pattern doesn't start with *)
		if (!normalizedPattern.startsWith('*')) {
			if (normalizedHostname === `www.${normalizedPattern}`) {
				return true;
			}
		}
	}

	return false;
}

/**
 * Validate a destination URL to prevent open redirect attacks
 *
 * Security rules:
 * 1. Block javascript:, data:, file:, and other dangerous schemes
 * 2. Only allow http: and https: protocols
 * 3. If allowedDomains is configured, only allow those domains
 * 4. If allowExternalRedirects is false, only allow same-origin redirects
 */
export function validateDestinationUrl(
	destination: string,
	sourceOrigin: string,
	allowedDomains?: string[],
	allowExternalRedirects: boolean = false,
): ValidationResult {
	// Parse destination URL
	let destUrl: URL;
	try {
		// Try parsing as absolute URL
		destUrl = new URL(destination);
	} catch {
		// If parsing fails, treat as relative URL (which is safe)
		// Relative URLs are always allowed
		return { valid: true };
	}

	// Block dangerous schemes
	const dangerousSchemes = [
		'javascript:',
		'data:',
		'file:',
		'vbscript:',
		'about:',
		'blob:',
		'ftp:',
	];

	const scheme = destUrl.protocol.toLowerCase();
	if (dangerousSchemes.some(s => scheme.startsWith(s))) {
		logger.warn(
			{
				destination,
				scheme,
			},
			'Blocked dangerous URL scheme',
		);
		return {
			valid: false,
			reason: `Destination URL uses blocked scheme: ${destUrl.protocol}`,
		};
	}

	// Only allow HTTP and HTTPS
	if (scheme !== 'http:' && scheme !== 'https:') {
		logger.warn(
			{
				destination,
				scheme,
			},
			'Blocked non-HTTP(S) URL scheme',
		);
		return {
			valid: false,
			reason: `Only HTTP and HTTPS protocols are allowed`,
		};
	}

	// Parse source origin for comparison
	const sourceUrl = new URL(sourceOrigin);

	// If allowedDomains is configured, check against whitelist
	if (allowedDomains && allowedDomains.length > 0) {
		if (!isHostnameAllowed(destUrl.hostname, allowedDomains)) {
			logger.warn(
				{
					destination,
					hostname: destUrl.hostname,
					allowedDomains,
				},
				'Blocked redirect to non-whitelisted domain',
			);
			return {
				valid: false,
				reason: `Destination domain not in allowed list`,
			};
		}
		return { valid: true };
	}

	// If external redirects are disabled, only allow same-origin
	if (!allowExternalRedirects) {
		if (destUrl.hostname !== sourceUrl.hostname) {
			logger.warn(
				{
					destination,
					destHostname: destUrl.hostname,
					sourceHostname: sourceUrl.hostname,
				},
				'Blocked external redirect',
			);
			return {
				valid: false,
				reason: `External redirects are not allowed. Destination must be on the same domain.`,
			};
		}
	}

	return { valid: true };
}

/**
 * Validate a redirect pattern to prevent ReDoS attacks
 *
 * Security rules:
 * 1. Limit pattern length to prevent resource exhaustion
 * 2. Only allow safe characters
 * 3. Detect nested quantifiers that could cause exponential backtracking
 */
export function validateRedirectPattern(pattern: string): ValidationResult {
	const MAX_PATTERN_LENGTH = 200;

	// Check pattern length
	if (pattern.length > MAX_PATTERN_LENGTH) {
		return {
			valid: false,
			reason: `Pattern exceeds maximum length of ${MAX_PATTERN_LENGTH} characters`,
		};
	}

	// Allowed characters: alphanumeric, :, /, *, _, -, ., and URL-safe chars
	const ALLOWED_PATTERN_REGEX = /^[a-zA-Z0-9:/*_.\-?&=#+%@!~]+$/;

	if (!ALLOWED_PATTERN_REGEX.test(pattern)) {
		return {
			valid: false,
			reason: `Pattern contains invalid characters. Only alphanumeric, :, /, *, _, -, ., and common URL characters are allowed`,
		};
	}

	// Detect dangerous nested quantifiers that could cause ReDoS
	// Patterns like (a+)+, (.*)+, (a*)+, etc.
	const NESTED_QUANTIFIER_REGEX = /\([^)]*[*+][^)]*\)[*+]/;

	if (NESTED_QUANTIFIER_REGEX.test(pattern)) {
		return {
			valid: false,
			reason: `Pattern contains nested quantifiers which could cause performance issues`,
		};
	}

	// Detect multiple consecutive wildcards
	if (pattern.includes('**')) {
		return {
			valid: false,
			reason: `Pattern contains consecutive wildcards which are not allowed`,
		};
	}

	return { valid: true };
}

/**
 * Sanitize CSV value to prevent injection attacks
 * Prefixes dangerous characters with single quote
 */
export function sanitizeCsvValue(value: string): string {
	if (!value) return '';

	// If value starts with dangerous characters, prefix with single quote
	if (/^[=+@-]/.test(value)) {
		return `'${value}`;
	}

	return value;
}
