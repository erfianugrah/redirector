import { Redirect } from '../schemas/redirect';
import { FileFormat } from '../schemas/file-formats';
import { logger } from '../utils/logger';

// These types are used in the type checking but not directly
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { BulkRedirects, RedirectMap } from '../schemas/redirect';
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { CsvRedirect, TerraformRedirectItem, TerraformRedirectList } from '../schemas/file-formats';

export class FormatService {
  /**
   * Parse content in various formats into redirects
   */
  parseContent(content: string, format: FileFormat): Redirect[] {
    try {
      switch (format) {
        case FileFormat.JSON:
          return this.parseJsonContent(content);
        case FileFormat.CSV:
          return this.parseCsvContent(content);
        case FileFormat.TERRAFORM:
          return this.parseTerraformContent(content);
        default:
          throw new Error(`Unsupported format: ${format}`);
      }
    } catch (error) {
      logger.error({ error, format }, 'Error parsing content');
      throw new Error(`Failed to parse ${format} content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Export redirects to the specified format
   */
  exportRedirects(redirects: Record<string, Redirect>, format: FileFormat): string {
    try {
      const redirectArray = Object.values(redirects);
      switch (format) {
        case FileFormat.JSON:
          return this.exportAsJson(redirectArray);
        case FileFormat.CSV:
          return this.exportAsCsv(redirectArray);
        case FileFormat.TERRAFORM:
          return this.exportAsTerraform(redirectArray);
        default:
          throw new Error(`Unsupported export format: ${format}`);
      }
    } catch (error) {
      logger.error({ error, format }, 'Error exporting redirects');
      throw new Error(`Failed to export to ${format}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Parse JSON content
   */
  private parseJsonContent(content: string): Redirect[] {
    try {
      const parsed = JSON.parse(content);
      
      // Handle multiple formats
      if (Array.isArray(parsed)) {
        // Direct array of redirects
        return parsed;
      } else if (parsed.redirects && Array.isArray(parsed.redirects)) {
        // BulkRedirects format
        return parsed.redirects;
      } else if (typeof parsed === 'object') {
        // RedirectMap format
        return Object.values(parsed);
      }
      
      throw new Error('Invalid JSON format: expected array or object with redirects');
    } catch (error) {
      logger.error({ error }, 'Error parsing JSON');
      throw error;
    }
  }

  /**
   * Parse CSV content into redirects
   */
  private parseCsvContent(content: string): Redirect[] {
    try {
      // Split by lines and filter out empty lines
      const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
      
      if (lines.length === 0) {
        return [];
      }
      
      // Get headers from first line
      const headers = lines[0].split(',').map(header => header.trim());
      
      // Validate required headers
      if (!headers.includes('source') || !headers.includes('destination')) {
        throw new Error('CSV missing required headers: source and destination');
      }
      
      const redirects: Redirect[] = [];
      
      // Process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = this.parseCSVLine(lines[i]);
        
        // Create object mapping headers to values
        const row: Record<string, string> = {};
        for (let j = 0; j < headers.length; j++) {
          row[headers[j]] = values[j] || '';
        }
        
        // Convert to Redirect object
        const redirect: Redirect = {
          source: row.source,
          destination: row.destination,
          statusCode: parseInt(row.statusCode || '301', 10),
          enabled: row.enabled !== 'false',
          preserveQueryParams: row.preserveQueryParams !== 'false',
          preserveHash: row.preserveHash !== 'false',
        };
        
        // Add optional fields if present
        if (row.description) redirect.description = row.description;
        
        if (row.hostname) {
          redirect.conditions = {
            hostname: row.hostname,
            ...(redirect.conditions || {})
          };
        }
        
        redirects.push(redirect);
      }
      
      return redirects;
    } catch (error) {
      logger.error({ error }, 'Error parsing CSV');
      throw error;
    }
  }

  /**
   * Parse a CSV line handling quoted values
   */
  private parseCSVLine(line: string): string[] {
    const values: string[] = [];
    let currentValue = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      
      if (char === '"') {
        // Toggle quotes state
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        // End of field
        values.push(currentValue.trim());
        currentValue = '';
      } else {
        // Add to current value
        currentValue += char;
      }
    }
    
    // Add the last value
    values.push(currentValue.trim());
    
    return values;
  }

  /**
   * Parse Terraform content into redirects
   */
  private parseTerraformContent(content: string): Redirect[] {
    try {
      // Simple HCL parser that extracts redirect items
      const redirects: Redirect[] = [];
      
      // Extract item blocks with regex
      const itemRegex = /item\s*{([^}]*)}/g;
      let match;
      
      while ((match = itemRegex.exec(content)) !== null) {
        const itemContent = match[1];
        
        // Extract source_url
        const sourceMatch = /source_url\s*=\s*"([^"]*)"/.exec(itemContent);
        if (!sourceMatch) continue;
        
        // Extract target_url
        const targetMatch = /target_url\s*=\s*"([^"]*)"/.exec(itemContent);
        if (!targetMatch) continue;
        
        // Extract status_code (optional)
        const statusMatch = /status_code\s*=\s*(\d+)/.exec(itemContent);
        const statusCode = statusMatch ? parseInt(statusMatch[1], 10) : 301;
        
        // Extract preserve_query_string (optional)
        const preserveQueryMatch = /preserve_query_string\s*=\s*"([^"]*)"/.exec(itemContent);
        const preserveQueryParams = preserveQueryMatch ? preserveQueryMatch[1] === 'enabled' : true;
        
        // Extract subpath_matching (for wildcards)
        const subpathMatch = /subpath_matching\s*=\s*"([^"]*)"/.exec(itemContent);
        const subpathMatching = subpathMatch ? subpathMatch[1] === 'enabled' : false;
        
        // Handle include_subdomains
        const subdomainsMatch = /include_subdomains\s*=\s*"([^"]*)"/.exec(itemContent);
        const includeSubdomains = subdomainsMatch ? subdomainsMatch[1] === 'enabled' : false;
        
        // Transform source and destination to handle Terraform-specific patterns
        let source = sourceMatch[1];
        let destination = targetMatch[1];
        
        // Handle wildcard parameter in Terraform
        if (destination.includes('*')) {
          // Make sure source has a * wildcard if target has wildcard
          if (!source.includes('*') && subpathMatching) {
            // Add wildcard at the end if subpath_matching is enabled and no wildcard exists
            source = source.endsWith('/') ? `${source}*` : `${source}/*`;
          }
        }
        
        // Create redirect
        const redirect: Redirect = {
          source,
          destination,
          statusCode,
          enabled: true,
          preserveQueryParams,
          preserveHash: true,
        };
        
        // Add hostname condition based on domain in source_url
        if (source.startsWith('http')) {
          try {
            const sourceUrl = new URL(source);
            if (sourceUrl.hostname) {
              redirect.conditions = {
                ...redirect.conditions,
                hostname: sourceUrl.hostname
              };
            }
          } catch (error) {
            // If URL parsing fails, continue without hostname condition
            logger.warn({ error, source }, 'Failed to parse source URL for hostname condition');
          }
        }
        
        redirects.push(redirect);
      }
      
      return redirects;
    } catch (error) {
      logger.error({ error }, 'Error parsing Terraform');
      throw error;
    }
  }

  /**
   * Export redirects as JSON
   */
  private exportAsJson(redirects: Redirect[]): string {
    return JSON.stringify({ redirects }, null, 2);
  }

  /**
   * Export redirects as CSV
   */
  private exportAsCsv(redirects: Redirect[]): string {
    // Define headers
    const headers = [
      'source',
      'destination',
      'statusCode',
      'enabled',
      'preserveQueryParams',
      'preserveHash',
      'description',
      'hostname'
    ];
    
    // Start with headers
    let csv = headers.join(',') + '\n';
    
    // Add data rows
    for (const redirect of redirects) {
      const row = [
        this.escapeCsvValue(redirect.source),
        this.escapeCsvValue(redirect.destination),
        redirect.statusCode.toString(),
        redirect.enabled.toString(),
        redirect.preserveQueryParams.toString(),
        redirect.preserveHash.toString(),
        this.escapeCsvValue(redirect.description || ''),
        this.escapeCsvValue(redirect.conditions?.hostname || '')
      ];
      
      csv += row.join(',') + '\n';
    }
    
    return csv;
  }

  /**
   * Escape CSV value
   */
  private escapeCsvValue(value: string): string {
    if (!value) return '';
    
    // If value contains comma, newline or quote, wrap in quotes and escape quotes
    if (value.includes(',') || value.includes('\n') || value.includes('"')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    
    return value;
  }

  /**
   * Export redirects as Terraform
   */
  private exportAsTerraform(redirects: Redirect[]): string {
    let tf = 'resource "cloudflare_list" "redirects" {\n';
    tf += '  kind        = "redirect"\n';
    tf += '  name        = "redirects"\n';
    tf += '  description = "Generated by Redirector"\n\n';
    
    for (const redirect of redirects) {
      // Determine if this redirect has wildcards or path parameters
      const hasWildcard = redirect.source.includes('*');
      const hasPathParams = redirect.source.includes(':');
      
      // Use the destination as-is, keeping * for Terraform format
      let destination = redirect.destination;
      
      // Determine if subpath matching should be enabled
      const enableSubpathMatching = hasWildcard || hasPathParams;
      
      // Determine if subdomains should be included
      const includeSubdomains = redirect.conditions?.hostname ? 
        redirect.source.startsWith('http') && !redirect.source.includes('*') : false;
      
      tf += 'item {\n';
      tf += '  value {\n';
      tf += '    redirect {\n';
      tf += `      source_url            = "${redirect.source}"\n`;
      tf += `      target_url            = "${destination}"\n`;
      tf += `      status_code           = ${redirect.statusCode}\n`;
      tf += `      preserve_query_string = "${redirect.preserveQueryParams ? 'enabled' : 'disabled'}"\n`;
      
      // Handle preserve_path_suffix based on whether we have wildcards
      // This is important for Cloudflare's redirect handling
      const preservePathSuffix = hasWildcard && !destination.includes('*');
      tf += `      preserve_path_suffix  = "${preservePathSuffix ? 'enabled' : 'disabled'}"\n`;
      
      tf += `      include_subdomains    = "${includeSubdomains ? 'enabled' : 'disabled'}"\n`;
      tf += `      subpath_matching      = "${enableSubpathMatching ? 'enabled' : 'disabled'}"\n`;
      
      // If there are specific conditions, add them as comments
      if (redirect.conditions) {
        if (redirect.conditions.hostname) {
          tf += `      # Hostname condition: ${redirect.conditions.hostname}\n`;
        }
        if (redirect.conditions.queryParams) {
          tf += `      # Query param conditions: ${JSON.stringify(redirect.conditions.queryParams)}\n`;
        }
        if (redirect.conditions.headers) {
          tf += `      # Header conditions: ${JSON.stringify(redirect.conditions.headers)}\n`;
        }
      }
      
      // Add optional description as a comment
      if (redirect.description) {
        tf += `      # ${redirect.description}\n`;
      }
      
      tf += '    }\n';
      tf += '  }\n';
      tf += '}\n\n';
    }
    
    tf += '}\n';
    
    return tf;
  }
}