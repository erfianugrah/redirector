#!/bin/bash
# setup-project.sh - Script to set up the Redirector project

# Create KV namespaces
echo "Creating Cloudflare KV namespaces..."
wrangler kv:namespace create REDIRECTS_KV
wrangler kv:namespace create REDIRECTS_KV --preview

# Update wrangler.jsonc with KV namespace IDs (manual step needed)
echo ""
echo "Please update wrangler.jsonc with your KV namespace IDs:"
echo "1. Open wrangler.jsonc"
echo "2. Replace the 'id' and 'preview_id' values in the 'kv_namespaces' section"
echo ""

# Create a .env.local file for development
echo "Creating .env.local file..."
cat > .env.local << EOL
# Redirector local environment variables
REDIRECTOR_API_URL=http://localhost:8787
# Add your KV namespace ID here if you need to access it directly
# REDIRECTOR_KV_NAMESPACE_ID=your-kv-namespace-id
EOL

echo "Setup complete! Next steps:"
echo "1. Start the development server: npm run dev"
echo "2. Access the Admin UI: http://localhost:8787/admin"
echo "3. Upload sample redirects: npm run cli upload samples/json/full_example.json"