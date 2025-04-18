import { describe, it, expect } from 'vitest';
import { FormatService } from '../src/services/formatService';
import { FileFormat } from '../src/schemas/file-formats';
import { Redirect } from '../src/schemas/redirect';

describe('FormatService', () => {
  const formatService = new FormatService();
  
  describe('JSON Format', () => {
    it('should parse JSON array of redirects', () => {
      const content = JSON.stringify([
        {
          source: '/old-page',
          destination: '/new-page',
          statusCode: 301,
          enabled: true
        }
      ]);
      
      const redirects = formatService.parseContent(content, FileFormat.JSON);
      
      expect(redirects).toHaveLength(1);
      expect(redirects[0].source).toBe('/old-page');
      expect(redirects[0].destination).toBe('/new-page');
    });
    
    it('should parse JSON bulk redirects object', () => {
      const content = JSON.stringify({
        redirects: [
          {
            source: '/old-page',
            destination: '/new-page',
            statusCode: 301,
            enabled: true
          }
        ]
      });
      
      const redirects = formatService.parseContent(content, FileFormat.JSON);
      
      expect(redirects).toHaveLength(1);
      expect(redirects[0].source).toBe('/old-page');
    });
    
    it('should export redirects to JSON', () => {
      const redirects: Record<string, Redirect> = {
        '/old-page': {
          source: '/old-page',
          destination: '/new-page',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        }
      };
      
      const json = formatService.exportRedirects(redirects, FileFormat.JSON);
      const parsed = JSON.parse(json);
      
      expect(parsed).toHaveProperty('redirects');
      expect(parsed.redirects).toHaveLength(1);
      expect(parsed.redirects[0].source).toBe('/old-page');
    });
  });
  
  describe('CSV Format', () => {
    it('should parse CSV content', () => {
      const content = 'source,destination,statusCode,enabled\n/old-page,/new-page,301,true';
      
      const redirects = formatService.parseContent(content, FileFormat.CSV);
      
      expect(redirects).toHaveLength(1);
      expect(redirects[0].source).toBe('/old-page');
      expect(redirects[0].destination).toBe('/new-page');
    });
    
    it('should export redirects to CSV', () => {
      const redirects: Record<string, Redirect> = {
        '/old-page': {
          source: '/old-page',
          destination: '/new-page',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        }
      };
      
      const csv = formatService.exportRedirects(redirects, FileFormat.CSV);
      const lines = csv.split('\n').filter(line => line.trim() !== '');
      
      expect(lines).toHaveLength(2); // Header + 1 data row
      expect(lines[0]).toContain('source,destination,statusCode');
      expect(lines[1]).toContain('/old-page,/new-page,301');
    });
  });
  
  describe('Terraform Format', () => {
    it('should parse Terraform content', () => {
      const content = `
      resource "cloudflare_list" "redirects" {
        kind = "redirect"
        name = "redirects"
        
        item {
          value {
            redirect {
              source_url = "/old-page"
              target_url = "/new-page"
              status_code = 301
              preserve_query_string = "enabled"
            }
          }
        }
      }`;
      
      const redirects = formatService.parseContent(content, FileFormat.TERRAFORM);
      
      expect(redirects).toHaveLength(1);
      expect(redirects[0].source).toBe('/old-page');
      expect(redirects[0].destination).toBe('/new-page');
    });
    
    it('should export redirects to Terraform', () => {
      const redirects: Record<string, Redirect> = {
        '/old-page': {
          source: '/old-page',
          destination: '/new-page',
          statusCode: 301,
          enabled: true,
          preserveQueryParams: true,
          preserveHash: true
        }
      };
      
      const tf = formatService.exportRedirects(redirects, FileFormat.TERRAFORM);
      
      expect(tf).toContain('resource "cloudflare_list"');
      expect(tf).toContain('source_url            = "/old-page"');
      expect(tf).toContain('target_url            = "/new-page"');
    });
  });
});