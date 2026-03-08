# @freelang/validator

FreeLang Native Input Validator - express-validator replacement

**Zero npm dependencies** - Uses only Node.js built-in modules

## Features

- ✅ Schema-based validation
- ✅ Field-level validation with custom rules
- ✅ Automatic error formatting
- ✅ Chainable API for fluent validation
- ✅ Custom error messages support
- ✅ Pre-built validators (email, URL, numeric range, etc.)

## Installation

```bash
npm install @freelang/validator
```

## Usage

### Basic Field Validation

```javascript
const { validateField, ValidationError } = require('@freelang/validator');

// Validate email
const result = validateField('email', 'user@example.com', {
  type: 'email',
  required: true
});

if (result.valid) {
  console.log('Email is valid');
} else {
  console.log('Errors:', result.errors);
  // → { field: 'email', message: 'Invalid email format' }
}
```

### Validate Multiple Fields

```javascript
const { validateSchema } = require('@freelang/validator');

const schema = {
  email: { type: 'email', required: true },
  password: { type: 'string', min: 8, max: 128 },
  age: { type: 'number', min: 18, max: 120 },
  website: { type: 'url', required: false }
};

const data = {
  email: 'john@example.com',
  password: 'SecurePass123!',
  age: 25,
  website: 'https://example.com'
};

const validation = validateSchema(schema, data);
if (validation.isValid) {
  console.log('All fields valid');
} else {
  validation.errors.forEach(err => {
    console.log(`${err.field}: ${err.message}`);
  });
}
```

### Custom Validators

```javascript
const { createValidator } = require('@freelang/validator');

// Create custom validator
const phoneValidator = createValidator('phone', (value) => {
  const phoneRegex = /^\+?[\d\s\-()]{10,}$/;
  return phoneRegex.test(value);
}, 'Invalid phone number');

// Use in schema
const schema = {
  phone: { validator: phoneValidator, required: true }
};
```

### Built-in Validators

```javascript
const { validate } = require('@freelang/validator');

// Email
validate('email', 'user@example.com').isEmail()

// URL
validate('website', 'https://example.com').isUrl()

// Numeric range
validate('age', 25).isNumber().min(0).max(150)

// String length
validate('username', 'john_doe').isString().min(3).max(20)

// Alphanumeric
validate('code', 'ABC123').isAlphanumeric()

// Date
validate('birthdate', '1990-01-15').isDate()

// Custom regex
validate('code', 'FL-12345').matches(/^[A-Z]{2}-\d{5}$/)
```

## API

### `validateField(fieldName, value, rules) → object`
Validate single field with specified rules.

Returns: `{ valid: boolean, errors: array }`

### `validateSchema(schema, data) → object`
Validate multiple fields against schema.

Returns: `{ isValid: boolean, errors: array, data: object }`

### `createValidator(name, fn, message) → function`
Create reusable custom validator.

### `validate(fieldName, value) → ChainableValidator`
Fluent API for field validation.

**Methods**:
- `.isEmail() → ChainableValidator`
- `.isUrl() → ChainableValidator`
- `.isNumber() → ChainableValidator`
- `.isString() → ChainableValidator`
- `.isBoolean() → ChainableValidator`
- `.isDate() → ChainableValidator`
- `.isAlphanumeric() → ChainableValidator`
- `.min(n) → ChainableValidator`
- `.max(n) → ChainableValidator`
- `.matches(regex) → ChainableValidator`
- `.custom(fn) → ChainableValidator`
- `.error(message) → ChainableValidator`
- `.validate() → { valid: boolean, errors: array }`

## FreeLang Integration

```freelang
import { validateField, validateSchema } from @freelang/validator

fn validate_user_registration(req: map) {
    let data = {
        "email": map_get(req, "email"),
        "password": map_get(req, "password"),
        "age": map_get(req, "age")
    }

    let schema = {
        "email": { "type": "email", "required": true },
        "password": { "type": "string", "min": 8 },
        "age": { "type": "number", "min": 18 }
    }

    let result = validateSchema(schema, data)

    if result["isValid"] {
        return { "status": "ok", "data": result["data"] }
    } else {
        return { "status": "error", "errors": result["errors"] }
    }
}

fn validate_email_field(email: string) {
    let result = validateField("email", email, {
        "type": "email",
        "required": true
    })

    return result["valid"]
}
```

## Error Messages

Custom error messages for localization:

```javascript
const schema = {
  email: {
    type: 'email',
    required: true,
    message: 'Please enter a valid email address'
  },
  password: {
    type: 'string',
    min: 8,
    message: 'Password must be at least 8 characters'
  }
};
```

## Performance

- Field validation: < 0.1ms
- Schema validation (5 fields): < 1ms
- Memory: < 50KB for typical validation
- Supports 100+ simultaneous validations

## Supported Data Types

- `email` - Standard email format
- `url` - HTTP/HTTPS URLs
- `number` - Integer or float
- `string` - Text with length constraints
- `boolean` - True/false values
- `date` - ISO 8601 date format
- `alphanumeric` - Letters and numbers only
- `phone` - Phone number format
- `uuid` - UUID v4 format
- `ipv4` - IPv4 address format
- `json` - Valid JSON string
- `custom` - User-defined validation

## Security Notes

- ⚠️ Validate on both client and server
- ⚠️ Never trust client-side validation alone
- ⚠️ Sanitize inputs before database operations
- ⚠️ Set appropriate field length limits
- ⚠️ Use HTTPS for sensitive data transmission

## License

MIT

## Related Packages

- [@freelang/auth](https://npmjs.com/package/@freelang/auth) - JWT/HMAC authentication
- [@freelang/security](https://npmjs.com/package/@freelang/security) - CORS, CSP, Rate Limiting
- [@freelang/orm](https://npmjs.com/package/@freelang/orm) - Database ORM
