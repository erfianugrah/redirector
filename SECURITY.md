# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability in the Redirector Worker, please report it by:
1. **DO NOT** open a public GitHub issue
2. Email the maintainers with details of the vulnerability
3. Allow reasonable time for a patch before public disclosure

## Security Features

### Authentication & Authorization

The Redirector Worker implements API key-based authentication:

- **Tamper-Proof**: Uses constant-time string comparison to prevent timing attacks
- **Flexible Access Control**: Supports both admin and read-only API keys
- **Secure Storage**: Secrets stored in Wrangler secrets, never in code
- **Session Management**: Browser-based session storage for Admin UI

**Setting Up Authentication:**
```bash
wrangler secret put ADMIN_API_KEY
wrangler secret put READ_API_KEY  # Optional
```

### Open Redirect Prevention

Prevents attackers from abusing your redirects for phishing:

- **Scheme Validation**: Only HTTP and HTTPS allowed
- **Dangerous Schemes Blocked**: javascript:, data:, file:, vbscript:, etc.
- **Same-Origin Default**: External redirects disabled by default
- **Domain Whitelist**: Optional allowed domains with wildcard support

**Configuration:**
```bash
# wrangler.jsonc
{
  "vars": {
    "ALLOWED_DOMAINS": "example.com,*.trusted.com",
    "ALLOW_EXTERNAL_REDIRECTS": "false"
  }
}
```

**Blocked Examples:**
```
javascript:alert(document.cookie)  ❌
data:text/html,<script>...</script> ❌
file:///etc/passwd ❌
https://phishing-site.com/fake-login ❌ (unless whitelisted)
```

### ReDoS (Regular Expression Denial of Service) Prevention

Protects against CPU exhaustion attacks:

- **Length Limits**: Maximum 200 characters per pattern
- **Character Whitelist**: Only safe URL characters allowed
- **Nested Quantifier Detection**: Blocks patterns like `(a+)+`, `(.*)*`
- **Validation Before Save**: All patterns validated before storage

**Safe Patterns:**
```
/old-path ✅
/products/:id ✅
/docs/* ✅
/files/:path* ✅
```

**Dangerous Patterns (Blocked):**
```
/(a+)+ ❌ Nested quantifiers
/path/**/file ❌ Consecutive wildcards
/path<script> ❌ Invalid characters
```

### CSV Injection Prevention

Protects exported redirects from formula injection:

- **Automatic Sanitization**: Values starting with `=`, `+`, `@`, `-` are prefixed with `'`
- **Excel/Sheets Protection**: Prevents code execution when opening CSV files
- **Transparent**: No impact on redirect functionality

**Example:**
```csv
Original: =SUM(A1:A10)
Exported: '=SUM(A1:A10)
```

### Input Validation

All API inputs validated with Zod schemas:

- **Type Safety**: Runtime type checking with TypeScript
- **Schema Validation**: Strict validation rules for all redirects
- **Error Messages**: Clear, actionable validation errors
- **Batch Validation**: Entire batch rejected if any redirect is invalid

## Security Best Practices

### For Administrators

1. **Use Strong API Keys**
   - Generate cryptographically random keys (32+ characters)
   - Never commit keys to version control
   - Rotate keys regularly (every 90 days)

2. **Restrict Access**
   - Use `ALLOWED_DOMAINS` to limit external redirects
   - Keep `ALLOW_EXTERNAL_REDIRECTS` disabled unless necessary
   - Use Cloudflare Access for IP-based restrictions

3. **Monitor Logs**
   - Review authentication failures regularly
   - Watch for blocked redirect attempts
   - Set up alerts for suspicious patterns

4. **Secure Deployment**
   - Always use HTTPS in production
   - Enable Cloudflare's security features (WAF, DDoS protection)
   - Keep dependencies updated

### For Developers

1. **Never Bypass Validation**
   - Don't disable security checks
   - Validate all user inputs
   - Use provided security utilities

2. **Follow Secure Coding Practices**
   - Use constant-time comparisons for secrets
   - Sanitize all outputs (CSV, HTML, etc.)
   - Log security events appropriately

3. **Test Security Features**
   - Run security test suite: `npm test test/validation.spec.ts test/auth.spec.ts`
   - Test with malicious inputs
   - Verify all validations work

## Known Limitations

### Current Scope

The security features protect against:
- ✅ Open redirect attacks
- ✅ ReDoS attacks
- ✅ CSV injection
- ✅ Timing attacks on authentication
- ✅ Unauthorized access

The security features do NOT protect against:
- ❌ Distributed Denial of Service (DDoS) - use Cloudflare's DDoS protection
- ❌ Rate limiting - implement at Cloudflare level or use Rate Limiting API
- ❌ Advanced persistent threats (APT)
- ❌ Social engineering attacks

### Future Enhancements

Planned security improvements:
- Built-in rate limiting per API key
- CAPTCHA integration for Admin UI
- Two-factor authentication support
- Audit log persistence (currently logs only)
- IP-based access restrictions

## Security Checklist

Before deploying to production:

- [ ] Set `ADMIN_API_KEY` secret
- [ ] Configure `ALLOWED_DOMAINS` appropriately
- [ ] Set `ALLOW_EXTERNAL_REDIRECTS=false` unless needed
- [ ] Enable HTTPS only
- [ ] Review and test all redirects
- [ ] Set up log monitoring
- [ ] Document access procedures
- [ ] Plan key rotation schedule
- [ ] Test security features in staging
- [ ] Review Cloudflare security settings

## Compliance

### OWASP Top 10

Protection against relevant OWASP Top 10 vulnerabilities:

- **A01: Broken Access Control** ✅ API key authentication
- **A03: Injection** ✅ Input validation, CSV sanitization
- **A05: Security Misconfiguration** ✅ Secure defaults
- **A07: Identification and Authentication Failures** ✅ Tamper-proof auth
- **A10: Server-Side Request Forgery (SSRF)** ✅ URL validation

### GDPR Considerations

The Redirector Worker:
- Does NOT store personal data
- Logs may contain IP addresses (review retention policies)
- API keys are secrets (treat as sensitive data)

## Version History

- **v1.1.0** (2025-12-17): Added comprehensive security features
  - API key authentication
  - URL validation
  - ReDoS prevention
  - CSV injection protection

- **v1.0.0** (Initial): Basic redirect functionality

## Credits

Security features implemented following:
- OWASP Secure Coding Practices
- Cloudflare Workers Security Best Practices
- Modern authentication patterns
- Defense in depth principles

## Contact

For security concerns, contact the maintainers through the appropriate secure channels.
