# Redirector Scripts

This directory contains utility scripts for the Redirector project.

## Directory Structure

- `utils/`: Utility scripts
  - `extract_sample.js`: Extract sample redirects from a Terraform file

## Scripts

### extract_sample.js

This script extracts a sample of redirects from a Terraform file and exports them in JSON, CSV, and Terraform formats.

#### Usage

```bash
# Run the script
node scripts/utils/extract_sample.js
```

#### Purpose

This script is useful for:
- Creating sample data for testing
- Converting between redirect formats
- Extracting a subset of redirects from a large configuration file

#### How It Works

1. Reads a Terraform file with redirects
2. Extracts a specified number of redirects (defaults to 10)
3. Converts the extracted redirects to:
   - JSON format (`samples/json/extracted_sample.json`)
   - CSV format (`samples/csv/extracted_sample.csv`)
   - Terraform format (`samples/terraform/extracted_sample.tf`)

#### Customization

You can modify the script to:
- Change the number of redirects to extract by modifying the `MAX_REDIRECTS` constant
- Target a different input file by changing the `terraformFilePath` variable
- Change the output format or paths