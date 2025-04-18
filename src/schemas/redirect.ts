import { z } from 'zod';

/**
 * Redirect schema using Zod 4 beta with improved features
 */
export const RedirectSchema = z.object({
	// Source URL pattern to match (can include parameters with :param syntax)
	source: z.string().trim().min(1),

	// Destination URL to redirect to (can include parameter substitutions)
	destination: z.string().trim().min(1),

	// HTTP status code for the redirect
	statusCode: z.number().int().min(300).max(399).default(301),

	// Whether this redirect is enabled
	enabled: z.boolean().default(true),

	// Optional description for this redirect
	description: z.string().optional(),

	// Optional conditions that must be met for this redirect to be applied
	conditions: z
		.object({
			// Optional hostname match
			hostname: z.string().optional(),

			// Optional query parameters that must be present
			queryParams: z.record(z.string(), z.string()).optional(),

			// Optional headers that must be present
			headers: z.record(z.string(), z.string()).optional(),

			// Optional date range when this redirect is active
			dateRange: z
				.object({
					start: z.coerce.date().optional(),
					end: z.coerce.date().optional(),
				})
				.optional(),
		})
		.optional(),

	// Optional preserve query parameters setting
	preserveQueryParams: z.boolean().default(true),

	// Optional preserve hash fragment setting
	preserveHash: z.boolean().default(true),
});

export type Redirect = z.infer<typeof RedirectSchema>;

/**
 * Schema for bulk redirect upload
 */
export const BulkRedirectsSchema = z.object({
	redirects: z.array(RedirectSchema),
});

export type BulkRedirects = z.infer<typeof BulkRedirectsSchema>;

/**
 * Schema for redirect mapping (key-value pairs)
 */
export const RedirectMapSchema = z.record(z.string(), RedirectSchema);

export type RedirectMap = z.infer<typeof RedirectMapSchema>;
