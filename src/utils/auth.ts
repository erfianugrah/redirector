import { Context } from 'hono';
import { logger } from './logger';

/**
 * Authentication utilities for API key validation
 */

export enum ApiKeyType {
	ADMIN = 'admin',
	READ_ONLY = 'read_only',
}

export interface AuthResult {
	authenticated: boolean;
	keyType?: ApiKeyType;
	reason?: string;
}

/**
 * Constant-time string comparison to prevent timing attacks
 * Uses bitwise operations to ensure execution time is independent of input
 */
export function constantTimeCompare(a: string, b: string): boolean {
	// If lengths differ, comparison fails but we still compare all bytes
	// to maintain constant time
	if (a.length !== b.length) {
		// Compare against a dummy string of the same length as 'b'
		// to maintain constant execution time
		const dummy = 'x'.repeat(b.length);
		let result = 1; // Already know they don't match

		for (let i = 0; i < b.length; i++) {
			// XOR comparison - if chars match, result is 0
			result |= dummy.charCodeAt(i) ^ b.charCodeAt(i);
		}

		return false;
	}

	let result = 0;
	for (let i = 0; i < a.length; i++) {
		// XOR comparison accumulates differences
		// If all chars match, result stays 0
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}

	return result === 0;
}

/**
 * Validates API key from request headers
 * Supports two authentication methods:
 * 1. X-API-Key header (recommended)
 * 2. Authorization: Bearer <token> header
 */
export function validateApiKey(
	providedKey: string | undefined,
	adminKey: string | undefined,
	readOnlyKey?: string | undefined,
): AuthResult {
	// If no API keys are configured, authentication is disabled
	// This allows development without secrets
	if (!adminKey && !readOnlyKey) {
		logger.warn('No API keys configured - authentication disabled');
		return {
			authenticated: true,
			keyType: ApiKeyType.ADMIN,
			reason: 'No authentication configured',
		};
	}

	// If no key provided in request
	if (!providedKey || providedKey.trim() === '') {
		return {
			authenticated: false,
			reason: 'No API key provided',
		};
	}

	// Trim the key
	const trimmedKey = providedKey.trim();

	// Validate against admin key (full access)
	if (adminKey && constantTimeCompare(trimmedKey, adminKey)) {
		return {
			authenticated: true,
			keyType: ApiKeyType.ADMIN,
		};
	}

	// Validate against read-only key (limited access)
	if (readOnlyKey && constantTimeCompare(trimmedKey, readOnlyKey)) {
		return {
			authenticated: true,
			keyType: ApiKeyType.READ_ONLY,
		};
	}

	// No match
	return {
		authenticated: false,
		reason: 'Invalid API key',
	};
}

/**
 * Authentication middleware for Hono
 * Checks for API key in X-API-Key header or Authorization Bearer token
 */
export function createAuthMiddleware(options: { adminOnly?: boolean } = {}) {
	return async (c: Context, next: () => Promise<void>) => {
		// Extract API key from headers
		let apiKey = c.req.header('X-API-Key');

		// Also check Authorization header (Bearer token)
		if (!apiKey) {
			const authHeader = c.req.header('Authorization');
			if (authHeader?.startsWith('Bearer ')) {
				apiKey = authHeader.substring(7);
			}
		}

		// Get configured keys from environment
		const adminKey = c.env.ADMIN_API_KEY;
		const readOnlyKey = c.env.READ_API_KEY;

		// Validate the key
		const authResult = validateApiKey(apiKey, adminKey, readOnlyKey);

		// Log authentication attempt
		if (!authResult.authenticated) {
			logger.warn(
				{
					reason: authResult.reason,
					path: c.req.path,
					method: c.req.method,
					ip: c.req.header('CF-Connecting-IP'),
				},
				'Authentication failed',
			);

			return c.json(
				{
					error: 'Unauthorized',
					message: authResult.reason || 'Invalid or missing API key',
				},
				401,
			);
		}

		// Check if admin access is required
		if (options.adminOnly && authResult.keyType !== ApiKeyType.ADMIN) {
			logger.warn(
				{
					keyType: authResult.keyType,
					path: c.req.path,
					method: c.req.method,
				},
				'Insufficient permissions',
			);

			return c.json(
				{
					error: 'Forbidden',
					message: 'Admin access required',
				},
				403,
			);
		}

		// Store auth info in context for later use
		c.set('authKeyType', authResult.keyType);
		c.set('authenticated', true);

		// Log successful authentication
		logger.debug(
			{
				keyType: authResult.keyType,
				path: c.req.path,
				method: c.req.method,
			},
			'Authentication successful',
		);

		await next();
	};
}

/**
 * Check if request has admin access
 */
export function hasAdminAccess(c: Context): boolean {
	return c.get('authKeyType') === ApiKeyType.ADMIN;
}

/**
 * Check if request is authenticated (any level)
 */
export function isAuthenticated(c: Context): boolean {
	return c.get('authenticated') === true;
}
