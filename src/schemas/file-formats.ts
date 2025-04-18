import { z } from 'zod';
// Using this schema in validation code
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { RedirectSchema } from './redirect';

/**
 * Schema for CSV file format
 */
export const CsvRedirectSchema = z.object({
	source: z.string().min(1),
	destination: z.string().min(1),
	statusCode: z.coerce.number().int().default(301),
	enabled: z
		.enum(['true', 'false'])
		.default('true')
		.transform(v => v === 'true'),
	preserveQueryParams: z
		.enum(['true', 'false'])
		.default('true')
		.transform(v => v === 'true'),
	preserveHash: z
		.enum(['true', 'false'])
		.default('true')
		.transform(v => v === 'true'),
	description: z.string().optional(),
	hostname: z.string().optional(),
});

export type CsvRedirect = z.infer<typeof CsvRedirectSchema>;

/**
 * Schema for Terraform redirect item
 */
export const TerraformRedirectItemSchema = z.object({
	value: z.object({
		redirect: z.object({
			source_url: z.string().min(1),
			target_url: z.string().min(1),
			status_code: z.number().int().min(300).max(399).default(301),
			include_subdomains: z.enum(['enabled', 'disabled']).default('disabled'),
			preserve_path_suffix: z.enum(['enabled', 'disabled']).default('disabled'),
			preserve_query_string: z.enum(['enabled', 'disabled']).default('disabled'),
			subpath_matching: z.enum(['enabled', 'disabled']).default('disabled'),
		}),
	}),
});

export type TerraformRedirectItem = z.infer<typeof TerraformRedirectItemSchema>;

/**
 * Schema for Terraform redirect list
 */
export const TerraformRedirectListSchema = z.object({
	resource: z.record(
		z.string(),
		z.record(
			z.string(),
			z.object({
				account_id: z.string().optional(),
				kind: z.literal('redirect'),
				name: z.string(),
				description: z.string().optional(),
				item: z.array(TerraformRedirectItemSchema),
			})
		)
	),
});

export type TerraformRedirectList = z.infer<typeof TerraformRedirectListSchema>;

/**
 * Supported file formats for redirect lists
 */
export enum FileFormat {
	JSON = 'json',
	CSV = 'csv',
	TERRAFORM = 'terraform',
}

/**
 * Schema for file upload request
 */
export const FileUploadSchema = z.object({
	format: z.nativeEnum(FileFormat),
	content: z.string().min(1),
	overwrite: z.boolean().default(false),
});

export type FileUpload = z.infer<typeof FileUploadSchema>;

/**
 * Schema for file download request
 */
export const FileDownloadSchema = z.object({
	format: z.nativeEnum(FileFormat),
});

export type FileDownload = z.infer<typeof FileDownloadSchema>;
