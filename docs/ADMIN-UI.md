# Redirector Admin UI Documentation

The Redirector Admin UI provides a web-based interface for managing redirects, accessible at the `/admin` endpoint of your worker.

## Accessing the Admin UI

The Admin UI is available at:

- Local development: `http://localhost:8787/admin`
- Production: `https://your-worker-name.your-account.workers.dev/admin`

## Features

The Admin UI offers the following features:

1. **Dashboard**: View basic statistics and redirect count
2. **Upload Redirects**: Upload redirects in JSON, CSV, or Terraform format
3. **Download Redirects**: Download redirects in various formats
4. **View Redirects**: Browse the list of configured redirects
5. **Delete Redirects**: Remove individual redirects

## Dashboard

The dashboard shows the total number of redirects currently configured in the system.

## Upload Redirects

This section allows you to upload redirects from a file in one of three supported formats:

1. Select the file format (JSON, CSV, or Terraform)
2. Paste the file content into the text area
3. Choose whether to overwrite existing redirects (checkbox)
4. Click the Upload button

The system will process the file, extract redirects, and add them to the database. If successful, you'll see a success message with statistics.

### JSON Format Example

```json
{
  "redirects": [
    {
      "source": "/old-page",
      "destination": "/new-page",
      "statusCode": 301,
      "enabled": true,
      "preserveQueryParams": true,
      "preserveHash": true
    },
    {
      "source": "/another-page",
      "destination": "/destination",
      "statusCode": 302,
      "enabled": true,
      "preserveQueryParams": false,
      "preserveHash": true
    }
  ]
}
```

### CSV Format Example

```
source,destination,statusCode,enabled,preserveQueryParams,preserveHash,description,hostname
/old-page,/new-page,301,true,true,true,Page moved,example.com
/another-page,/destination,302,true,false,true,Temporary redirect,
```

### Terraform Format Example

```hcl
resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Redirects list"

  item {
    value {
      redirect {
        source_url            = "/old-page"
        target_url            = "/new-page"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }

  item {
    value {
      redirect {
        source_url            = "/another-page"
        target_url            = "/destination"
        status_code           = 302
        preserve_query_string = "disabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }
}
```

## Download Redirects

This section allows you to download all redirects in your preferred format:

1. Click the button for the format you want to download:
   - JSON: Downloads as a JSON file with the redirects array
   - CSV: Downloads as a CSV file with headers
   - Terraform: Downloads as a Terraform file compatible with Cloudflare redirects

## View Redirects

The redirects table shows all currently configured redirects with the following information:

- Source URL
- Destination URL
- Status Code (301, 302, etc.)
- Enabled Status (Yes/No)
- Actions (Delete button)

The table automatically updates when:
- You upload new redirects
- You delete a redirect
- You click the Refresh button

## Delete Redirects

To delete a redirect:

1. Find the redirect in the redirects table
2. Click the Delete button in the Actions column
3. Confirm the deletion when prompted

## Refreshing Data

To refresh the data displayed in the Admin UI:

1. Click the Refresh button in the header

This will update the statistics and the redirects table with the latest data from the server.

## Error Handling

The Admin UI provides error messages in the following cases:

- File upload errors (invalid format, parsing errors, etc.)
- Download errors
- API communication errors

Error messages are displayed in red boxes below the relevant form or button.

## Security Considerations

The current implementation does not include authentication. In a production environment, you should secure the Admin UI by:

1. Adding authentication using Cloudflare Access or another authentication system
2. Implementing API keys or JWT tokens for API access
3. Restricting access to specific IP addresses or domains

## Customization

To customize the Admin UI:

1. Edit the `/src/utils/admin-ui.ts` file
2. Modify the HTML, CSS, or JavaScript as needed
3. Deploy the updated worker

## Using with Multiple Environments

When using the Admin UI with multiple environments (development, staging, production), keep these tips in mind:

1. Use a unique KV namespace for each environment
2. Consider adding an environment indicator in the UI
3. Add configuration options to switch between environments

## Troubleshooting

If you encounter issues with the Admin UI:

1. Check the browser console for JavaScript errors
2. Verify the worker is deployed and running with `/health` check
3. Test the API endpoints directly to isolate UI vs API issues
4. Check KV namespace access and permissions