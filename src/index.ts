import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { RedirectSchema, BulkRedirectsSchema, Redirect } from './schemas/redirect';
import { RedirectService } from './services/redirectService';
import { FormatService } from './services/formatService';
import { logger } from './utils/logger';
import { z } from 'zod';
import { FileUploadSchema, FileDownloadSchema, FileFormat } from './schemas/file-formats';
import { getAdminHtml } from './utils/admin-ui';

// Cloudflare type references are handled via TSConfig and ESLint config

// Define environment bindings for type safety
type Env = {
  REDIRECTS_KV: Cloudflare.KVNamespace;
  LOG_LEVEL?: string;
};

// Create the Hono app with typed environment
const app = new Hono<{ Bindings: Env }>();

// Configure logging middleware
app.use('*', async (c, next) => {
  const { req } = c;
  const startTime = Date.now();
  
  // Configure logger based on environment
  logger.level = c.env.LOG_LEVEL || 'info';
  
  // Log the request
  logger.info({
    method: req.method,
    url: req.url,
    cf: req.raw.cf,
  }, 'Request received');
  
  try {
    await next();
  } catch (err) {
    logger.error({ err }, 'Error processing request');
    return c.text('Internal Server Error', 500);
  }
  
  // Log the response time
  const responseTime = Date.now() - startTime;
  logger.info({ responseTime }, 'Request completed');
});

// Health check endpoint
app.get('/health', (c) => {
  return c.json({ status: 'ok' });
});

// Admin UI
app.get('/admin', async (c) => {
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  const redirects = await redirectService.getRedirectMap();
  const redirectCount = redirects ? Object.keys(redirects).length : 0;
  
  return c.html(getAdminHtml(redirectCount));
});

// Handle redirects - this must be before the API routes
app.get('*', async (c, next) => {
  const url = new URL(c.req.url);
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  
  // Skip API routes
  if (url.pathname.startsWith('/api')) {
    return next();
  }
  
  // Match and process redirect
  const redirectResult = await redirectService.matchRedirect(url, c.req.raw);
  
  if (redirectResult.matched) {
    return redirectService.processRedirect(redirectResult, url);
  }
  
  // If no redirect matched, continue to next handler
  return next();
});

// API routes
// Create a new redirect
app.post('/api/redirects', zValidator('json', RedirectSchema), async (c) => {
  const redirect = c.req.valid('json');
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  
  await redirectService.saveRedirect(redirect);
  return c.json({ success: true, redirect }, 201);
});

// Bulk upload redirects
app.post('/api/redirects/bulk', zValidator('json', BulkRedirectsSchema), async (c) => {
  const { redirects } = c.req.valid('json');
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  
  await redirectService.saveBulkRedirects(redirects);
  return c.json({ success: true, count: redirects.length }, 201);
});

// Get all redirects
app.get('/api/redirects', async (c) => {
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  const redirects = await redirectService.getRedirectMap();
  
  return c.json({ redirects: redirects || {} });
});

// Upload redirects from file
app.post('/api/files/upload', zValidator('json', FileUploadSchema), async (c) => {
  const { format, content, overwrite } = c.req.valid('json');
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  const formatService = new FormatService();
  
  try {
    // Parse the uploaded content
    const redirects = formatService.parseContent(content, format);
    
    if (redirects.length === 0) {
      return c.json({ success: false, message: 'No valid redirects found in the uploaded file' }, 400);
    }
    
    // Get existing redirects if not overwriting
    let existingRedirects: Record<string, Redirect> = {};
    if (!overwrite) {
      existingRedirects = await redirectService.getRedirectMap() || {};
    }
    
    // Merge with existing redirects
    const mergedRedirects = [...Object.values(existingRedirects), ...redirects];
    
    // Remove duplicates by source
    const uniqueRedirects: Record<string, Redirect> = {};
    for (const redirect of mergedRedirects) {
      uniqueRedirects[redirect.source] = redirect;
    }
    
    // Save all redirects
    await redirectService.saveBulkRedirects(Object.values(uniqueRedirects));
    
    return c.json({
      success: true,
      message: `Successfully processed ${redirects.length} redirects from ${format} file`,
      stats: {
        uploaded: redirects.length,
        unique: Object.keys(uniqueRedirects).length,
        total: Object.keys(uniqueRedirects).length
      }
    }, 200);
  } catch (error) {
    logger.error({ error, format }, 'Error processing file upload');
    return c.json({
      success: false,
      message: `Failed to process ${format} file: ${error instanceof Error ? error.message : String(error)}`
    }, 400);
  }
});

// Delete a redirect
app.delete('/api/redirects/:source', async (c) => {
  const source = c.req.param('source');
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  
  const deleted = await redirectService.deleteRedirect(decodeURIComponent(source));
  if (!deleted) {
    return c.json({ success: false, message: 'Redirect not found' }, 404);
  }
  
  return c.json({ success: true });
});

// Download redirects as file
app.post('/api/files/download', zValidator('json', FileDownloadSchema), async (c) => {
  const { format } = c.req.valid('json');
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  const formatService = new FormatService();
  
  try {
    const redirects = await redirectService.getRedirectMap() || {};
    
    if (Object.keys(redirects).length === 0) {
      return c.json({ success: false, message: 'No redirects found to export' }, 404);
    }
    
    // Export to the requested format
    const content = formatService.exportRedirects(redirects, format);
    
    // Set appropriate content type and filename
    let contentType: string;
    let filename: string;
    
    switch (format) {
      case FileFormat.JSON:
        contentType = 'application/json';
        filename = 'redirects.json';
        break;
      case FileFormat.CSV:
        contentType = 'text/csv';
        filename = 'redirects.csv';
        break;
      case FileFormat.TERRAFORM:
        contentType = 'text/plain';
        filename = 'redirects.tf';
        break;
      default:
        contentType = 'text/plain';
        filename = 'redirects.txt';
    }
    
    // Return the file content
    c.header('Content-Type', contentType);
    c.header('Content-Disposition', `attachment; filename="${filename}"`);
    return c.body(content);
  } catch (error) {
    logger.error({ error, format }, 'Error exporting redirects');
    return c.json({
      success: false,
      message: `Failed to export redirects to ${format}: ${error instanceof Error ? error.message : String(error)}`
    }, 500);
  }
});

// Test a redirect without applying it
app.post('/api/redirects/test', zValidator('json', z.object({
  url: z.string().url(),
  headers: z.record(z.string()).optional(),
})), async (c) => {
  const { url: urlString, headers = {} } = c.req.valid('json');
  const url = new URL(urlString);
  
  // Create a mock request with the provided headers
  const mockRequest = new Request(urlString, {
    headers: new Headers(headers),
  });
  
  const redirectService = new RedirectService(c.env.REDIRECTS_KV);
  const redirectResult = await redirectService.matchRedirect(url, mockRequest);
  
  if (!redirectResult.matched) {
    return c.json({ matched: false });
  }
  
  // Process the redirect but don't return an actual redirect response
  const response = redirectService.processRedirect(redirectResult, url);
  const location = response.headers.get('Location');
  
  return c.json({
    matched: true,
    redirect: redirectResult.redirect,
    params: redirectResult.params,
    location,
    statusCode: response.status,
  });
});

// 404 fallback
app.notFound((c) => {
  return c.text('Not Found', 404);
});

// Error handler
app.onError((err, c) => {
  logger.error({ err }, 'Unhandled error');
  return c.text('Internal Server Error', 500);
});

// Export for Cloudflare Workers
export default {
  fetch: app.fetch,
};