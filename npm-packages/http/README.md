# @freelang/http

FreeLang Native HTTP Client - Connection pooling, retries, timeouts

**Zero npm dependencies** - Uses only Node.js built-in modules

## Features

- ✅ Connection pooling for performance
- ✅ Automatic retry with exponential backoff
- ✅ Request/response timeout management
- ✅ Proxy support (HTTP/HTTPS)
- ✅ Cookie jar management
- ✅ Request/response compression
- ✅ Streaming support
- ✅ Custom headers and authentication

## Installation

```bash
npm install @freelang/http
```

## Usage

### Basic Requests

```javascript
const { HttpClient } = require('@freelang/http');

const client = new HttpClient({
  timeout: 30000,          // 30 seconds
  maxRetries: 3,
  retryDelay: 1000
});

// GET request
const response = await client.get('https://api.example.com/users');
console.log(response.status);    // 200
console.log(response.data);      // Response body

// POST request
const postResponse = await client.post(
  'https://api.example.com/users',
  { name: 'John', email: 'john@example.com' }
);

// PUT request
const putResponse = await client.put(
  'https://api.example.com/users/1',
  { name: 'Jane' }
);

// DELETE request
const deleteResponse = await client.delete('https://api.example.com/users/1');
```

### Request Configuration

```javascript
const response = await client.request({
  method: 'POST',
  url: 'https://api.example.com/data',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer token123'
  },
  body: { data: 'value' },
  timeout: 60000,
  retries: 5,
  retryDelay: 2000
});
```

### Query Parameters

```javascript
const response = await client.get('https://api.example.com/users', {
  params: {
    page: 2,
    limit: 10,
    sort: 'name'
  }
});
// → GET https://api.example.com/users?page=2&limit=10&sort=name
```

### Request Headers

```javascript
const response = await client.get('https://api.example.com/users', {
  headers: {
    'Authorization': 'Bearer token',
    'Custom-Header': 'custom-value'
  }
});
```

### Authentication

```javascript
// Basic auth
const response = await client.get(
  'https://api.example.com/data',
  {
    auth: {
      username: 'user',
      password: 'pass'
    }
  }
);

// Bearer token
const response = await client.get(
  'https://api.example.com/data',
  {
    headers: {
      'Authorization': 'Bearer eyJhbGc...'
    }
  }
);
```

### Streaming

```javascript
const { createReadStream } = require('fs');

// Upload stream
const stream = createReadStream('./large-file.bin');
const response = await client.post(
  'https://api.example.com/upload',
  stream
);

// Download stream
const downloadStream = await client.getStream(
  'https://api.example.com/download'
);
downloadStream.pipe(createWriteStream('./downloaded.bin'));
```

### Retry Configuration

```javascript
const client = new HttpClient({
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [408, 429, 500, 502, 503, 504],
  backoffMultiplier: 2  // Exponential: 1s, 2s, 4s
});

// Override per request
await client.get('https://api.example.com/data', {
  maxRetries: 5,
  retryDelay: 500
});
```

### Connection Pooling

```javascript
const client = new HttpClient({
  pool: {
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
    keepAliveTimeout: 30000
  }
});

// Reuses connections for subsequent requests
await client.get('https://api.example.com/users');
await client.get('https://api.example.com/posts');
// → Second request reuses HTTP connection
```

### Proxy Support

```javascript
const client = new HttpClient({
  proxy: {
    protocol: 'http',
    host: '127.0.0.1',
    port: 8080
  }
});

// OR with authentication
const client = new HttpClient({
  proxy: {
    protocol: 'http',
    host: 'proxy.company.com',
    port: 3128,
    auth: {
      username: 'proxy_user',
      password: 'proxy_pass'
    }
  }
});
```

### Cookie Management

```javascript
const client = new HttpClient({
  cookies: true  // Enable automatic cookie handling
});

// Cookies are automatically stored and sent on subsequent requests
await client.post('https://api.example.com/login', {
  email: 'user@example.com',
  password: 'password'
});

// Subsequent request automatically includes cookies
await client.get('https://api.example.com/profile');
```

### Compression

```javascript
const response = await client.get(
  'https://api.example.com/data',
  {
    compression: {
      gzip: true,
      deflate: true,
      brotli: true
    }
  }
);
```

### Error Handling

```javascript
try {
  const response = await client.get('https://api.example.com/data');
} catch (error) {
  if (error.code === 'ECONNREFUSED') {
    console.error('Connection refused');
  } else if (error.code === 'ENOTFOUND') {
    console.error('Host not found');
  } else if (error.code === 'ETIMEDOUT') {
    console.error('Request timeout');
  } else if (error.status) {
    console.error(`HTTP ${error.status}: ${error.message}`);
  }
}
```

### Custom Client

```javascript
const client = new HttpClient({
  baseURL: 'https://api.example.com',
  defaultHeaders: {
    'User-Agent': 'MyApp/1.0'
  },
  timeout: 30000,
  maxRetries: 3,
  retryDelay: 1000,
  retryOn: [500, 502, 503, 504]
});

// Use relative URLs
const users = await client.get('/users');
const user = await client.get('/users/1');
```

## API

### `HttpClient`

**Constructor Options**:
- `baseURL` - Base URL for all requests
- `timeout` - Request timeout in milliseconds (default: 30000)
- `maxRetries` - Maximum retry attempts (default: 0)
- `retryDelay` - Delay between retries in milliseconds
- `retryOn` - Status codes to retry on (default: [500, 502, 503, 504])
- `backoffMultiplier` - Multiplier for exponential backoff (default: 1)
- `defaultHeaders` - Headers to include in all requests
- `cookies` - Enable automatic cookie handling (default: false)
- `pool` - Connection pool configuration
- `proxy` - Proxy configuration

**Methods**:
- `.get(url, options)` - GET request
- `.post(url, body, options)` - POST request
- `.put(url, body, options)` - PUT request
- `.patch(url, body, options)` - PATCH request
- `.delete(url, options)` - DELETE request
- `.head(url, options)` - HEAD request
- `.request(config)` - Custom request
- `.getStream(url, options)` - GET with streaming
- `.postStream(url, stream, options)` - POST with streaming

### Response Object

```javascript
{
  status: 200,              // HTTP status code
  statusText: 'OK',         // Status text
  headers: {                // Response headers
    'content-type': 'application/json'
  },
  data: {},                 // Response body
  config: {},               // Request configuration
  timing: {
    connect: 45,            // Connection time (ms)
    firstByte: 120,         // Time to first byte (ms)
    total: 250              // Total time (ms)
  }
}
```

## FreeLang Integration

```freelang
import { HttpClient } from @freelang/http

fn create_http_client() {
    let client = HttpClient({
        "baseURL": "https://api.example.com",
        "timeout": 30000,
        "maxRetries": 3
    })

    return client
}

fn fetch_users(client: object) {
    let response = client.get("/users")

    return response["data"]
}

fn post_data(client: object, data: map) {
    let response = client.post("/data", data, {
        "headers": {
            "Content-Type": "application/json"
        }
    })

    if response["status"] == 200 {
        return response["data"]
    } else {
        return null
    }
}

fn handle_with_retry(client: object, url: string) {
    let response = client.get(url, {
        "maxRetries": 5,
        "retryDelay": 2000
    })

    return response
}
```

## Performance

- Connection establishment: < 100ms (pooled: < 5ms)
- GET request: < 200ms (depending on network)
- POST with body: < 250ms
- Connection pooling efficiency: 50-80% reuse rate
- Memory per connection: < 10KB

## Best Practices

- ⚠️ Use connection pooling for multiple requests
- ⚠️ Set appropriate timeouts
- ⚠️ Enable retries for critical operations
- ⚠️ Use compression for large payloads
- ⚠️ Validate SSL certificates in production
- ⚠️ Monitor DNS resolution times
- ⚠️ Use streaming for large file transfers
- ⚠️ Clean up resources with client.close()

## Error Codes

| Code | Meaning |
|------|---------|
| ECONNREFUSED | Connection refused |
| ENOTFOUND | Host not found (DNS error) |
| ETIMEDOUT | Request timeout |
| ECONNRESET | Connection reset by peer |
| EHOSTUNREACH | Host unreachable |
| ECONNABORTED | Connection aborted |

## License

MIT

## Related Packages

- [@freelang/security](https://npmjs.com/package/@freelang/security) - CORS, CSP, Rate Limiting
- [@freelang/auth](https://npmjs.com/package/@freelang/auth) - JWT/HMAC authentication
- [@freelang/validator](https://npmjs.com/package/@freelang/validator) - Input validation
