# @freelang/security

FreeLang Native Security - CORS, CSP, Rate-limiting middleware

**Zero npm dependencies** - Uses only Node.js built-in modules

## Features

- ✅ CORS (Cross-Origin Resource Sharing) middleware
- ✅ CSP (Content Security Policy) headers
- ✅ Rate-limiting with sliding window algorithm
- ✅ Security headers (X-Frame-Options, X-Content-Type-Options, etc.)
- ✅ IP-based blocking and whitelisting
- ✅ Request signature verification

## Installation

```bash
npm install @freelang/security
```

## Usage

### CORS Configuration

```javascript
const { corsMiddleware, corsOptions } = require('@freelang/security');

// Default CORS (allow all origins)
const cors = corsMiddleware();

// Restricted CORS (specific origins)
const restrictedCors = corsMiddleware({
  allowedOrigins: ['https://example.com', 'https://app.example.com'],
  allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  maxAge: 86400
});

// Apply to Express/Node.js server
app.use(restrictedCors);
```

### Content Security Policy (CSP)

```javascript
const { cspMiddleware } = require('@freelang/security');

const csp = cspMiddleware({
  directives: {
    "default-src": ["'self'"],
    "script-src": ["'self'", "'unsafe-inline'", "https://trusted-cdn.com"],
    "style-src": ["'self'", "https://fonts.googleapis.com"],
    "img-src": ["'self'", "data:", "https:"],
    "connect-src": ["'self'", "https://api.example.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com"],
    "frame-ancestors": ["'none'"]
  },
  reportUri: '/api/csp-report',
  reportOnly: false
});

app.use(csp);
```

### Rate Limiting

```javascript
const { rateLimitMiddleware } = require('@freelang/security');

// Basic rate limiting (100 requests per 15 minutes)
const rateLimit = rateLimitMiddleware({
  windowMs: 15 * 60 * 1000,      // 15 minutes
  maxRequests: 100,
  keyGenerator: (req) => req.ip,
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests' });
  }
});

// Strict rate limiting for login endpoint
const loginRateLimit = rateLimitMiddleware({
  windowMs: 60 * 1000,            // 1 minute
  maxRequests: 5,
  keyGenerator: (req) => req.body.email,
  skipSuccessfulRequests: false
});

app.post('/login', loginRateLimit, handleLogin);
```

### Security Headers

```javascript
const { securityHeadersMiddleware } = require('@freelang/security');

const headers = securityHeadersMiddleware({
  contentSecurityPolicy: false,  // Managed separately
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  dnsPrefetchControl: true,
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: {
    maxAge: 63072000,            // 2 years
    includeSubDomains: true,
    preload: true
  },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true
});

app.use(headers);
```

### IP Blocking & Whitelisting

```javascript
const { ipFilterMiddleware } = require('@freelang/security');

// Whitelist approach (allow specific IPs)
const ipWhitelist = ipFilterMiddleware({
  mode: 'whitelist',
  ips: ['192.168.1.100', '10.0.0.0/8'],
  handler: (req, res) => {
    res.status(403).json({ error: 'Access denied' });
  }
});

// Blacklist approach (block specific IPs)
const ipBlacklist = ipFilterMiddleware({
  mode: 'blacklist',
  ips: ['203.0.113.0/24'],
  trustProxy: true
});

app.use(ipWhitelist);
```

### Request Signature Verification

```javascript
const { verifySignature, generateSignature } = require('@freelang/security');

// Server sends signed request
const signature = generateSignature({
  method: 'POST',
  path: '/api/data',
  body: { user_id: 123 },
  secret: 'shared-secret-key'
});

// Client verifies signature
const isValid = verifySignature({
  method: 'POST',
  path: '/api/data',
  body: { user_id: 123 },
  signature: signature,
  secret: 'shared-secret-key'
});

console.log(isValid); // true
```

## API

### `corsMiddleware(options) → function`
Returns CORS middleware for Express/Node.js servers.

**Options**:
- `allowedOrigins` - Array of allowed origins (default: ['*'])
- `allowedMethods` - Array of HTTP methods (default: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'])
- `allowedHeaders` - Array of allowed headers
- `credentials` - Allow credentials (default: false)
- `maxAge` - Cache time in seconds (default: 3600)

### `cspMiddleware(options) → function`
Returns Content Security Policy middleware.

**Options**:
- `directives` - CSP directives object
- `reportUri` - URI to report violations
- `reportOnly` - Report-only mode (default: false)

### `rateLimitMiddleware(options) → function`
Returns rate-limiting middleware using sliding window algorithm.

**Options**:
- `windowMs` - Time window in milliseconds
- `maxRequests` - Max requests per window
- `keyGenerator` - Function to identify client
- `skipSuccessfulRequests` - Skip counting successful requests
- `handler` - Custom response handler

### `securityHeadersMiddleware(options) → function`
Returns security headers middleware.

### `ipFilterMiddleware(options) → function`
Returns IP filtering middleware.

**Options**:
- `mode` - 'whitelist' or 'blacklist'
- `ips` - Array of IP addresses or CIDR ranges
- `trustProxy` - Trust X-Forwarded-For header
- `handler` - Custom rejection handler

### `verifySignature(data) → boolean`
Verify HMAC signature of request.

### `generateSignature(data) → string`
Generate HMAC signature for request.

## FreeLang Integration

```freelang
import { corsMiddleware, rateLimitMiddleware, securityHeadersMiddleware } from @freelang/security

fn setup_security_middleware() {
    let cors_config = {
        "allowedOrigins": ["https://example.com"],
        "credentials": true,
        "maxAge": 3600
    }

    let rate_limit_config = {
        "windowMs": 900000,      // 15 minutes
        "maxRequests": 100
    }

    let headers_config = {
        "hsts": {
            "maxAge": 63072000,
            "includeSubDomains": true
        }
    }

    return {
        "cors": corsMiddleware(cors_config),
        "rateLimit": rateLimitMiddleware(rate_limit_config),
        "headers": securityHeadersMiddleware(headers_config)
    }
}
```

## Security Best Practices

- ⚠️ Always use HTTPS in production
- ⚠️ Set appropriate rate limits based on your API usage patterns
- ⚠️ Update CSP directives regularly as your application evolves
- ⚠️ Monitor CSP violation reports for attacks
- ⚠️ Use IP whitelisting for administrative endpoints
- ⚠️ Rotate secrets regularly for signature verification
- ⚠️ Test CORS configuration thoroughly before deployment

## Performance

- CORS check: < 0.1ms
- Rate limit check: < 0.5ms (average)
- CSP header generation: < 0.2ms
- IP filtering: < 0.3ms
- Signature verification: < 1ms (HMAC-SHA256)

## Common CORS Configuration Examples

### Public API (allow all)
```javascript
corsMiddleware({ allowedOrigins: ['*'] })
```

### Single-origin app
```javascript
corsMiddleware({
  allowedOrigins: ['https://app.example.com'],
  credentials: true
})
```

### Multiple trusted origins
```javascript
corsMiddleware({
  allowedOrigins: [
    'https://app.example.com',
    'https://admin.example.com',
    'https://staging.example.com'
  ],
  credentials: true
})
```

## License

MIT

## Related Packages

- [@freelang/auth](https://npmjs.com/package/@freelang/auth) - JWT/HMAC authentication
- [@freelang/validator](https://npmjs.com/package/@freelang/validator) - Input validation
- [@freelang/orm](https://npmjs.com/package/@freelang/orm) - Database ORM
