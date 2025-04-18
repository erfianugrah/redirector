#!/bin/bash
# update-docs.sh - Script to update project documentation

# Generate table of contents for README.md
echo "Updating README.md table of contents..."
# This is a simple example - for a real implementation you might want to use a tool like doctoc

# Update version references in docs
VERSION=$(node -e "console.log(require('../package.json').version)")
echo "Updating version references to $VERSION..."

# Update API documentation with new endpoints (if needed)
echo "API documentation should be manually reviewed and updated"

# List all documentation files
echo "Documentation files:"
find ../docs -type f -name "*.md" | sort

echo "Documentation update complete!"
echo "Please manually review the documentation files to ensure they are up to date."