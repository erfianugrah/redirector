resource "cloudflare_list" "redirects" {
  kind        = "redirect"
  name        = "redirects"
  description = "Example redirects for Redirector"

  # Basic path redirect
  item {
    value {
      redirect {
        source_url            = "https://example.com/old-path"
        target_url            = "https://example.com/new-path"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }

  # Path with parameter
  item {
    value {
      redirect {
        source_url            = "https://example.com/products/:productId"
        target_url            = "https://example.com/catalog/products/:productId"
        status_code           = 302
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }

  # Cross-domain redirect with parameters
  item {
    value {
      redirect {
        source_url            = "https://example.com/blog/:year/:month/:slug"
        target_url            = "https://blog.example.com/:year/:month/:slug"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "disabled"
      }
    }
  }

  # Subdomain redirect
  item {
    value {
      redirect {
        source_url            = "https://app.example.com/*"
        target_url            = "https://example.com/app/*"
        status_code           = 302
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "enabled"
      }
    }
  }

  # Domain change redirect
  item {
    value {
      redirect {
        source_url            = "https://old-domain.com/*"
        target_url            = "https://new-domain.com/*"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "enabled"
        subpath_matching      = "enabled"
      }
    }
  }
  
  # Named wildcard parameter
  item {
    value {
      redirect {
        source_url            = "https://example.com/docs/:path*"
        target_url            = "https://example.com/documentation/:path*"
        status_code           = 301
        preserve_query_string = "enabled"
        preserve_path_suffix  = "disabled"
        include_subdomains    = "disabled"
        subpath_matching      = "enabled"
      }
    }
  }
}