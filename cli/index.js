#!/usr/bin/env node

import { program } from 'commander';
import fetch from 'node-fetch';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set up CLI
program
  .name('redirector-cli')
  .description('CLI tool for managing Redirector service')
  .version('1.0.0');

// Configuration
let apiUrl = process.env.REDIRECTOR_API_URL || 'http://localhost:8787';
let remoteApiUrl = process.env.REDIRECTOR_REMOTE_API_URL || 'https://redirector-dev.workers.dev';
let kvNamespaceId = process.env.REDIRECTOR_KV_NAMESPACE_ID;
let accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

// Configure command to set API URL
program
  .command('config')
  .description('Configure the CLI')
  .option('-u, --url <url>', 'Local API URL (e.g., http://localhost:8787)')
  .option('-r, --remote-url <url>', 'Remote API URL (e.g., https://redirector.workers.dev)')
  .option('-n, --namespace <id>', 'KV Namespace ID')
  .option('-a, --account <id>', 'Cloudflare Account ID')
  .action((options) => {
    if (options.url) {
      apiUrl = options.url;
      console.log(chalk.green(`Local API URL set to: ${apiUrl}`));
    }
    
    if (options.remoteUrl) {
      remoteApiUrl = options.remoteUrl;
      console.log(chalk.green(`Remote API URL set to: ${remoteApiUrl}`));
    }
    
    if (options.namespace) {
      kvNamespaceId = options.namespace;
      console.log(chalk.green(`KV Namespace ID set to: ${kvNamespaceId}`));
    }
    
    if (options.account) {
      accountId = options.account;
      console.log(chalk.green(`Cloudflare Account ID set to: ${accountId}`));
    }
    
    // Show current configuration
    console.log(chalk.blue('\nCurrent Configuration:'));
    console.log(`Local API URL: ${apiUrl || chalk.yellow('Not set')}`);
    console.log(`Remote API URL: ${remoteApiUrl || chalk.yellow('Not set')}`);
    console.log(`KV Namespace ID: ${kvNamespaceId || chalk.yellow('Not set')}`);
    console.log(`Cloudflare Account ID: ${accountId || chalk.yellow('Not set')}`);
  });

// Upload file command
program
  .command('upload <file>')
  .description('Upload redirects from a file (JSON, CSV, or Terraform)')
  .option('-f, --format <format>', 'File format (json, csv, terraform)', (val) => {
    if (!['json', 'csv', 'terraform'].includes(val.toLowerCase())) {
      throw new Error('Format must be one of: json, csv, terraform');
    }
    return val.toLowerCase();
  })
  .option('-o, --overwrite', 'Overwrite existing redirects')
  .option('--to-worker', 'Upload to worker API (default)', true)
  .option('--to-kv', 'Upload directly to KV using wrangler', false)
  .option('--remote', 'Use remote worker instead of local development server')
  .action(async (filePath, options) => {
    try {
      const format = options.format || inferFormatFromFilename(filePath);
      if (!format) {
        console.error(chalk.red('Could not determine file format. Please specify with --format.'));
        return;
      }
      
      if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`File not found: ${filePath}`));
        return;
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      if (options.toWorker) {
        // Choose API URL based on remote flag
        const url = options.remote ? remoteApiUrl : apiUrl;
        console.log(chalk.blue(`Uploading ${format} file to worker API (${options.remote ? 'remote' : 'local'})...`));
        
        const response = await fetch(`${url}/api/files/upload`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format,
            content,
            overwrite: options.overwrite || false,
          }),
        });
        
        const result = await response.json();
        
        if (response.ok) {
          console.log(chalk.green(`Success: ${result.message}`));
          if (result.stats) {
            console.log(`Uploaded: ${result.stats.uploaded}`);
            console.log(`Unique: ${result.stats.unique}`);
            console.log(`Total: ${result.stats.total}`);
          }
        } else {
          console.error(chalk.red(`Error: ${result.message}`));
        }
      } else if (options.toKv) {
        // Upload directly to KV using wrangler
        if (!kvNamespaceId) {
          console.error(chalk.red('KV Namespace ID not set. Use the config command to set it.'));
          return;
        }
        
        // For KV, we need to convert to JSON first if it's not already
        let jsonContent = content;
        if (format === 'csv' || format === 'terraform') {
          // First upload to worker API to convert
          console.log(chalk.blue(`Converting ${format} to JSON...`));
          
          const convertResponse = await fetch(`${apiUrl}/api/files/upload`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              format,
              content,
              overwrite: true, // Just for conversion
            }),
          });
          
          if (!convertResponse.ok) {
            const result = await convertResponse.json();
            console.error(chalk.red(`Error converting to JSON: ${result.message}`));
            return;
          }
          
          // Now download as JSON
          const downloadResponse = await fetch(`${apiUrl}/api/files/download`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              format: 'json',
            }),
          });
          
          if (!downloadResponse.ok) {
            console.error(chalk.red('Error downloading JSON'));
            return;
          }
          
          jsonContent = await downloadResponse.text();
        }
        
        // Write to temporary file
        const tempFilePath = path.join(__dirname, 'temp_redirects.json');
        fs.writeFileSync(tempFilePath, jsonContent);
        
        try {
          // Use wrangler to upload to KV
          console.log(chalk.blue('Uploading to KV using wrangler...'));
          const command = `wrangler kv key put redirects "${jsonContent.replace(/"/g, '\\"')}" --namespace-id=${kvNamespaceId}`;
          
          execSync(command, { stdio: 'inherit' });
          console.log(chalk.green('Successfully uploaded to KV!'));
        } catch (error) {
          console.error(chalk.red('Error uploading to KV:'), error.message);
        } finally {
          // Clean up temp file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
          }
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Download file command
program
  .command('download')
  .description('Download redirects in specified format')
  .requiredOption('-f, --format <format>', 'File format (json, csv, terraform)', (val) => {
    if (!['json', 'csv', 'terraform'].includes(val.toLowerCase())) {
      throw new Error('Format must be one of: json, csv, terraform');
    }
    return val.toLowerCase();
  })
  .option('-o, --output <file>', 'Output file path')
  .option('--from-worker', 'Download from worker API (default)', true)
  .option('--from-kv', 'Download directly from KV using wrangler', false)
  .option('--remote', 'Use remote worker instead of local development server')
  .action(async (options) => {
    try {
      const format = options.format;
      
      if (options.fromWorker) {
        // Choose API URL based on remote flag
        const url = options.remote ? remoteApiUrl : apiUrl;
        console.log(chalk.blue(`Downloading redirects in ${format} format from ${options.remote ? 'remote' : 'local'} worker...`));
        
        const response = await fetch(`${url}/api/files/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format,
          }),
        });
        
        if (response.ok) {
          const content = await response.text();
          
          // Default output filename based on format
          const outputPath = options.output || `redirects.${format === 'terraform' ? 'tf' : format}`;
          
          fs.writeFileSync(outputPath, content);
          console.log(chalk.green(`Downloaded redirects to ${outputPath}`));
        } else {
          const result = await response.json();
          console.error(chalk.red(`Error: ${result.message}`));
        }
      } else if (options.fromKv) {
        // Download directly from KV using wrangler
        if (!kvNamespaceId) {
          console.error(chalk.red('KV Namespace ID not set. Use the config command to set it.'));
          return;
        }
        
        console.log(chalk.blue('Downloading from KV using wrangler...'));
        
        try {
          // Use wrangler to get from KV
          const result = execSync(`wrangler kv key get redirects --namespace-id=${kvNamespaceId}`).toString();
          
          // Parse the JSON content
          const jsonData = JSON.parse(result);
          
          // If not JSON format, convert using the worker API
          if (format !== 'json') {
            console.log(chalk.blue(`Converting JSON to ${format}...`));
            
            const convertResponse = await fetch(`${apiUrl}/api/files/download`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                format,
              }),
            });
            
            if (!convertResponse.ok) {
              console.error(chalk.red('Error converting format'));
              return;
            }
            
            const convertedContent = await convertResponse.text();
            const outputPath = options.output || `redirects.${format === 'terraform' ? 'tf' : format}`;
            fs.writeFileSync(outputPath, convertedContent);
            console.log(chalk.green(`Downloaded and converted redirects to ${outputPath}`));
          } else {
            // Direct JSON output
            const outputPath = options.output || 'redirects.json';
            fs.writeFileSync(outputPath, JSON.stringify(jsonData, null, 2));
            console.log(chalk.green(`Downloaded redirects to ${outputPath}`));
          }
        } catch (error) {
          console.error(chalk.red('Error downloading from KV:'), error.message);
        }
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// List redirects command
program
  .command('list')
  .description('List all redirects')
  .option('--remote', 'Use remote worker instead of local development server')
  .action(async (options) => {
    try {
      // Choose API URL based on remote flag
      const url = options.remote ? remoteApiUrl : apiUrl;
      console.log(chalk.blue(`Fetching redirects from ${options.remote ? 'remote' : 'local'} worker...`));
      
      const response = await fetch(`${url}/api/redirects`);
      const result = await response.json();
      
      if (response.ok) {
        const redirects = result.redirects || {};
        const count = Object.keys(redirects).length;
        
        if (count === 0) {
          console.log(chalk.yellow('No redirects found.'));
          return;
        }
        
        console.log(chalk.green(`Found ${count} redirects:`));
        console.log(chalk.blue('Source'.padEnd(30) + 'Destination'.padEnd(30) + 'Status'));
        console.log('='.repeat(70));
        
        for (const [source, redirect] of Object.entries(redirects)) {
          const enabled = redirect.enabled ? '' : chalk.red(' [DISABLED]');
          console.log(
            `${source.padEnd(30)} ${redirect.destination.padEnd(30)} ${redirect.statusCode}${enabled}`
          );
        }
      } else {
        console.error(chalk.red('Error fetching redirects.'));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Add a redirect command
program
  .command('add <source> <destination>')
  .description('Add a new redirect')
  .option('-s, --status <code>', 'HTTP status code', parseInt, 301)
  .option('-q, --preserve-query', 'Preserve query parameters', true)
  .option('-h, --preserve-hash', 'Preserve hash fragment', true)
  .option('--no-enabled', 'Disable this redirect')
  .option('--remote', 'Use remote worker instead of local development server')
  .action(async (source, destination, options) => {
    try {
      // Choose API URL based on remote flag
      const url = options.remote ? remoteApiUrl : apiUrl;
      console.log(chalk.blue(`Adding redirect from ${source} to ${destination} on ${options.remote ? 'remote' : 'local'} worker...`));
      
      const redirect = {
        source,
        destination,
        statusCode: options.status,
        enabled: options.enabled !== false,
        preserveQueryParams: options.preserveQuery !== false,
        preserveHash: options.preserveHash !== false,
      };
      
      const response = await fetch(`${url}/api/redirects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(redirect),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(chalk.green('Redirect added successfully!'));
      } else {
        console.error(chalk.red(`Error: ${result.message}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Delete a redirect command
program
  .command('delete <source>')
  .description('Delete a redirect')
  .option('--remote', 'Use remote worker instead of local development server')
  .action(async (source, options) => {
    try {
      // Choose API URL based on remote flag
      const url = options.remote ? remoteApiUrl : apiUrl;
      console.log(chalk.blue(`Deleting redirect for ${source} from ${options.remote ? 'remote' : 'local'} worker...`));
      
      const response = await fetch(`${url}/api/redirects/${encodeURIComponent(source)}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();
      
      if (response.ok) {
        console.log(chalk.green('Redirect deleted successfully!'));
      } else {
        console.error(chalk.red(`Error: ${result.message}`));
      }
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Setup project command
program
  .command('setup')
  .description('Set up the Redirector project (create KV namespaces, etc.)')
  .action(async () => {
    try {
      console.log(chalk.blue('Setting up Redirector project...'));
      
      // Create KV namespaces
      console.log(chalk.blue('Creating Cloudflare KV namespaces...'));
      try {
        execSync('wrangler kv namespace create REDIRECTS_KV', { stdio: 'inherit' });
        execSync('wrangler kv namespace create REDIRECTS_KV --preview', { stdio: 'inherit' });
      } catch (error) {
        console.error(chalk.red('Error creating KV namespaces:'), error.message);
        console.log(chalk.yellow('You may need to login first with: wrangler login'));
        return;
      }
      
      // Create a .env.local file for development
      console.log(chalk.blue('Creating .env.local file...'));
      fs.writeFileSync('.env.local', `# Redirector local environment variables
REDIRECTOR_API_URL=http://localhost:8787
# Add your KV namespace ID here if you need to access it directly
# REDIRECTOR_KV_NAMESPACE_ID=your-kv-namespace-id
`);
      
      console.log(chalk.green('Setup complete! Next steps:'));
      console.log('1. Update wrangler.jsonc with your KV namespace IDs');
      console.log('2. Start the development server: npm run dev');
      console.log('3. Access the Admin UI: http://localhost:8787/admin');
      console.log('4. Upload sample redirects: npm run cli upload samples/json/full_example.json');
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Extract sample command
program
  .command('extract-sample <source-file>')
  .description('Extract a sample of redirects from a file')
  .option('-o, --output-dir <dir>', 'Output directory', './samples')
  .option('-c, --count <number>', 'Number of redirects to extract', parseInt, 10)
  .action(async (sourceFile, options) => {
    try {
      console.log(chalk.blue(`Extracting ${options.count} redirects from ${sourceFile}...`));
      
      // Read the source file
      if (!fs.existsSync(sourceFile)) {
        console.error(chalk.red(`Source file not found: ${sourceFile}`));
        return;
      }
      
      const content = fs.readFileSync(sourceFile, 'utf8');
      const format = inferFormatFromFilename(sourceFile);
      
      if (!format) {
        console.error(chalk.red('Could not determine file format'));
        return;
      }
      
      // Create output directories
      const samplesDir = options.outputDir;
      if (!fs.existsSync(samplesDir)) {
        fs.mkdirSync(samplesDir, { recursive: true });
      }
      
      ['json', 'csv', 'terraform'].forEach(fmt => {
        const dir = path.join(samplesDir, fmt);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      });
      
      // Parse the file using formatService
      // For simplicity, we'll use the API to convert formats
      const url = apiUrl;
      
      // First upload to get the redirects
      const uploadResponse = await fetch(`${url}/api/files/upload`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          format,
          content,
          overwrite: true,
        }),
      });
      
      if (!uploadResponse.ok) {
        console.error(chalk.red('Error uploading file for conversion'));
        return;
      }
      
      // Extract samples in each format
      for (const outputFormat of ['json', 'csv', 'terraform']) {
        const downloadResponse = await fetch(`${url}/api/files/download`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            format: outputFormat,
          }),
        });
        
        if (!downloadResponse.ok) {
          console.error(chalk.red(`Error downloading in ${outputFormat} format`));
          continue;
        }
        
        const outputContent = await downloadResponse.text();
        const extension = outputFormat === 'terraform' ? 'tf' : outputFormat;
        const outputPath = path.join(samplesDir, outputFormat, `extracted_sample.${extension}`);
        
        fs.writeFileSync(outputPath, outputContent);
        console.log(chalk.green(`Extracted sample saved to ${outputPath}`));
      }
      
      console.log(chalk.green('Sample extraction complete!'));
    } catch (error) {
      console.error(chalk.red('Error:'), error.message);
    }
  });

// Helper function to infer format from filename
function inferFormatFromFilename(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  
  switch (ext) {
    case '.json':
      return 'json';
    case '.csv':
      return 'csv';
    case '.tf':
      return 'terraform';
    default:
      return null;
  }
}

// Parse command line arguments
program.parse(process.argv);

// Show help if no arguments provided
if (process.argv.length === 2) {
  program.help();
}