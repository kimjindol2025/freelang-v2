# @freelang/auth

FreeLang Native Authentication - JWT/HMAC token engine

**Zero npm dependencies** - Uses only Node.js built-in crypto

## Features

- ✅ HMAC-SHA256 token signing & verification
- ✅ JWT-compatible token format (header.payload.signature)
- ✅ Timing-safe comparison (tamper detection)
- ✅ Token expiration support
- ✅ Claims extraction

## Installation

```bash
npm install @freelang/auth
```

## Usage

### Basic Authentication

```javascript
const { tokenSign, tokenVerify, tokenDecode } = require('@freelang/auth');

// Sign a token (3600 seconds = 1 hour)
const token = tokenSign(
  { user: "john@example.com", role: "admin" },
  "your-secret-key",
  3600
);
console.log(token);
// → "eyJhbGc..."

// Verify token
const claims = tokenVerify(token, "your-secret-key");
if (claims) {
  console.log("User:", claims.user, "Role:", claims.role);
} else {
  console.log("Invalid or expired token");
}

// Decode token (without verification)
const decoded = tokenDecode(token);
console.log(decoded); // { user: "john@example.com", role: "admin" }
```

### Check Expiration

```javascript
const { tokenExpired } = require('@freelang/auth');

if (tokenExpired(token)) {
  console.log("Token has expired");
}
```

### Get Claims

```javascript
const { tokenClaimsGet } = require('@freelang/auth');

const role = tokenClaimsGet(token, "role");
console.log(role); // "admin"
```

## API

### `tokenSign(claims, secret, expiresSeconds) → string`
Sign a token with claims and secret.

### `tokenVerify(token, secret) → object|null`
Verify and decode token. Returns claims if valid, null if invalid or expired.

### `tokenDecode(token) → object`
Decode token without verification (use for debugging only).

### `tokenExpired(token) → boolean`
Check if token has expired.

### `tokenClaimsGet(token, key) → any`
Extract a specific claim from token.

### `hmacSha256(key, data) → string`
Compute HMAC-SHA256 hash (hex).

### `sha256Hex(data) → string`
Compute SHA-256 hash (hex).

## Security Notes

- ⚠️ Use strong secrets (32+ characters)
- ⚠️ Never expose secrets in client-side code
- ⚠️ Use HTTPS to transmit tokens
- ⚠️ Set appropriate expiration times
- ⚠️ Rotate secrets regularly

## FreeLang Integration

```freelang
import { tokenSign, tokenVerify } from @freelang/auth

fn authenticate(email: string, password: string) {
    // Validate credentials...

    let token = tokenSign(
        { "user": email, "role": "user" },
        env("AUTH_SECRET"),
        3600
    )

    return { "token": token }
}

fn validate_request(req: map) {
    let auth_header = map_get(req, "authorization")
    if auth_header == null {
        return null
    }

    let token = string_slice(auth_header, 7)  // Remove "Bearer "
    let claims = tokenVerify(token, env("AUTH_SECRET"))

    return claims  // Returns claims if valid, null if invalid
}
```

## Performance

- Token signing: < 1ms
- Token verification: < 1ms
- Memory: < 100KB for 1000 tokens

## License

MIT

## Related Packages

- [@freelang/validator](https://npmjs.com/package/@freelang/validator) - Input validation
- [@freelang/security](https://npmjs.com/package/@freelang/security) - CORS, CSP, Rate Limiting
- [@freelang/orm](https://npmjs.com/package/@freelang/orm) - Database ORM
