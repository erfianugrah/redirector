// Script to extract a sample of redirects from a Terraform file
const fs = require('fs');
const path = require('path');

// Path to the Terraform file
const terraformFilePath = path.join(__dirname, '..', '..', 'redirect_list.tf');

// Read the file
const content = fs.readFileSync(terraformFilePath, 'utf8');

// Extract redirect items using regex
const itemRegex = /item\s*{([^}]*)}/g;
const redirects = [];
let match;

let count = 0;
const MAX_REDIRECTS = 10; // Extract just 10 redirects for the sample

while ((match = itemRegex.exec(content)) !== null && count < MAX_REDIRECTS) {
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
  
  // Create redirect
  const redirect = {
    source: sourceMatch[1],
    destination: targetMatch[1],
    statusCode,
    enabled: true,
    preserveQueryParams,
    preserveHash: true,
  };
  
  redirects.push(redirect);
  count++;
}

// Create samples directory if it doesn't exist
const samplesDir = path.join(__dirname, '..', '..', 'samples');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
  fs.mkdirSync(path.join(samplesDir, 'json'), { recursive: true });
  fs.mkdirSync(path.join(samplesDir, 'csv'), { recursive: true });
  fs.mkdirSync(path.join(samplesDir, 'terraform'), { recursive: true });
}

// Create JSON file with the sample
const outputPath = path.join(samplesDir, 'json', 'extracted_sample.json');
fs.writeFileSync(
  outputPath, 
  JSON.stringify({ redirects }, null, 2)
);

console.log(`Extracted ${redirects.length} redirects to ${outputPath}`);

// Create CSV file with the sample
const csvOutputPath = path.join(samplesDir, 'csv', 'extracted_sample.csv');
let csvContent = 'source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description\n';

for (const redirect of redirects) {
  csvContent += `${redirect.source},${redirect.destination},${redirect.statusCode},${redirect.enabled},${redirect.preserveQueryParams},${redirect.preserveHash},"${redirect.description || ''}"\n`;
}

fs.writeFileSync(csvOutputPath, csvContent);
console.log(`Extracted ${redirects.length} redirects to ${csvOutputPath}`);

// Create a small Terraform file with the sample
const tfOutputPath = path.join(samplesDir, 'terraform', 'extracted_sample.tf');
let tfContent = 'resource "cloudflare_list" "redirects" {\n';
tfContent += '  kind        = "redirect"\n';
tfContent += '  name        = "sample_redirects"\n';
tfContent += '  description = "Sample redirects for testing"\n\n';

for (const redirect of redirects) {
  tfContent += 'item {\n';
  tfContent += '  value {\n';
  tfContent += '    redirect {\n';
  tfContent += `      source_url            = "${redirect.source}"\n`;
  tfContent += `      target_url            = "${redirect.destination}"\n`;
  tfContent += `      status_code           = ${redirect.statusCode}\n`;
  tfContent += `      preserve_query_string = "${redirect.preserveQueryParams ? 'enabled' : 'disabled'}"\n`;
  tfContent += '      preserve_path_suffix  = "disabled"\n';
  tfContent += '      include_subdomains    = "disabled"\n';
  tfContent += '      subpath_matching      = "disabled"\n';
  tfContent += '    }\n';
  tfContent += '  }\n';
  tfContent += '}\n\n';
}

tfContent += '}\n';

fs.writeFileSync(tfOutputPath, tfContent);
console.log(`Extracted ${redirects.length} redirects to ${tfOutputPath}`);