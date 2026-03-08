# @freelang/orm

FreeLang Native ORM - Sequelize replacement with pre-compiled SQL

**Zero npm dependencies** - Uses only Node.js built-in modules

## Features

- ✅ SQL query builder with pre-compilation
- ✅ Model definition and relationships
- ✅ Transaction support
- ✅ Connection pooling
- ✅ Query caching
- ✅ Multi-database support (PostgreSQL, MySQL, SQLite)
- ✅ Migration framework
- ✅ Eager/lazy loading

## Installation

```bash
npm install @freelang/orm
```

## Usage

### Database Connection

```javascript
const { createConnection, defineModel } = require('@freelang/orm');

// PostgreSQL
const db = createConnection({
  dialect: 'postgres',
  host: 'localhost',
  port: 5432,
  database: 'freelang_app',
  username: 'postgres',
  password: 'password'
});

// MySQL
const mysqlDb = createConnection({
  dialect: 'mysql',
  host: 'localhost',
  port: 3306,
  database: 'freelang_app',
  username: 'root',
  password: 'password'
});

// SQLite
const sqliteDb = createConnection({
  dialect: 'sqlite',
  storage: '/path/to/database.db'
});
```

### Define Models

```javascript
const { defineModel, DataTypes } = require('@freelang/orm');

// Define User model
const User = defineModel(db, 'user', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    notNull: true
  },
  username: {
    type: DataTypes.STRING,
    notNull: true
  },
  password: {
    type: DataTypes.STRING,
    notNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: () => new Date()
  }
});

// Define Post model
const Post = defineModel(db, 'post', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  title: {
    type: DataTypes.STRING,
    notNull: true
  },
  content: {
    type: DataTypes.TEXT
  },
  userId: {
    type: DataTypes.INTEGER,
    foreignKey: true,
    references: { model: User, key: 'id' }
  }
});
```

### Define Relationships

```javascript
// One-to-many
User.hasMany(Post, { foreignKey: 'userId' });
Post.belongsTo(User, { foreignKey: 'userId' });

// Many-to-many
const Tag = defineModel(db, 'tag', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: { type: DataTypes.STRING }
});

User.belongsToMany(Tag, {
  through: 'user_tags',
  foreignKey: 'userId',
  otherKey: 'tagId'
});
```

### Query Operations

```javascript
// Create
const user = await User.create({
  email: 'john@example.com',
  username: 'john_doe',
  password: 'hashed_password'
});

// Read
const foundUser = await User.findByPk(1);
const users = await User.findAll();

// Update
await user.update({ username: 'jane_doe' });
await User.update(
  { username: 'jane_doe' },
  { where: { id: 1 } }
);

// Delete
await user.destroy();
await User.destroy({ where: { id: 1 } });
```

### Query Builder

```javascript
// WHERE clauses
const users = await User.findAll({
  where: {
    email: { [Op.like]: '%@example.com' },
    id: { [Op.gte]: 10 }
  }
});

// SELECT specific columns
const users = await User.findAll({
  attributes: ['id', 'email', 'username']
});

// LIMIT and OFFSET
const users = await User.findAll({
  limit: 10,
  offset: 20
});

// ORDER BY
const users = await User.findAll({
  order: [['createdAt', 'DESC']]
});

// JOIN (eager loading)
const users = await User.findAll({
  include: [{
    model: Post,
    attributes: ['id', 'title']
  }]
});
```

### Transactions

```javascript
const transaction = await db.transaction();

try {
  const user = await User.create({
    email: 'jane@example.com',
    username: 'jane'
  }, { transaction });

  const post = await Post.create({
    title: 'First Post',
    userId: user.id
  }, { transaction });

  await transaction.commit();
  console.log('Transaction committed');
} catch (error) {
  await transaction.rollback();
  console.error('Transaction rolled back', error);
}
```

### Query Caching

```javascript
const User = defineModel(db, 'user', attributes, {
  cache: {
    ttl: 300,          // 5 minutes
    key: 'user:all'
  }
});

// First query hits database, subsequent queries use cache
const users1 = await User.findAll();  // Cache miss
const users2 = await User.findAll();  // Cache hit
```

### Raw Queries

```javascript
const results = await db.query(
  'SELECT * FROM users WHERE email = ? LIMIT 1',
  ['john@example.com'],
  { type: QueryTypes.SELECT }
);

const count = await db.query(
  'UPDATE users SET username = ? WHERE id = ?',
  ['newname', 1],
  { type: QueryTypes.UPDATE }
);
```

## API

### `createConnection(options) → Connection`
Create database connection.

**Options**:
- `dialect` - 'postgres', 'mysql', or 'sqlite'
- `host` - Database host
- `port` - Database port
- `database` - Database name
- `username` - Database user
- `password` - Database password
- `storage` - File path (SQLite only)
- `pool` - Connection pool settings

### `defineModel(connection, name, attributes, options) → Model`
Define data model.

### `DataTypes`
Available column types:
- `INTEGER`, `BIGINT`, `SMALLINT`
- `STRING`, `VARCHAR`, `TEXT`
- `BOOLEAN`
- `DATE`, `DATETIME`, `TIME`
- `FLOAT`, `DECIMAL`
- `JSON`, `JSONB`
- `UUID`

### Model Methods

**CRUD**:
- `.create(data, options) → Promise<Model>`
- `.findByPk(id, options) → Promise<Model|null>`
- `.findAll(options) → Promise<Array<Model>>`
- `.findOne(options) → Promise<Model|null>`
- `.update(values, options) → Promise<number>`
- `.destroy(options) → Promise<number>`

**Relationships**:
- `.hasMany(target, options)`
- `.belongsTo(target, options)`
- `.belongsToMany(target, options)`
- `.hasOne(target, options)`

## FreeLang Integration

```freelang
import { createConnection, defineModel, DataTypes } from @freelang/orm

fn setup_database() {
    let db = createConnection({
        "dialect": "postgres",
        "host": "localhost",
        "port": 5432,
        "database": "freelang_app",
        "username": "postgres",
        "password": env("DB_PASSWORD")
    })

    return db
}

fn create_user(db: object, email: string, username: string) {
    let User = defineModel(db, "user", {
        "id": { "type": "INTEGER", "primaryKey": true },
        "email": { "type": "STRING", "notNull": true },
        "username": { "type": "STRING" }
    })

    let user = User.create({
        "email": email,
        "username": username
    })

    return user
}

fn find_user_by_email(db: object, email: string) {
    let User = defineModel(db, "user", {})
    let user = User.findOne({
        "where": {
            "email": email
        }
    })

    return user
}
```

## Performance

- Query pre-compilation: < 1ms
- Single row fetch: < 2ms (with connection pool)
- Bulk operations (1000 rows): < 50ms
- Connection pooling: up to 10 concurrent queries
- Cache hit rate: < 0.1ms

## Database Support

| Database | Status | Version |
|----------|--------|---------|
| PostgreSQL | ✅ Fully Supported | 12+ |
| MySQL | ✅ Fully Supported | 8.0+ |
| SQLite | ✅ Fully Supported | 3.40+ |
| MariaDB | ✅ Compatible | 10.5+ |

## Migration Example

```javascript
const { Migration } = require('@freelang/orm');

class CreateUsersTable extends Migration {
  up(db) {
    return db.createTable('users', {
      id: { type: 'INTEGER', primaryKey: true },
      email: { type: 'STRING', unique: true },
      createdAt: { type: 'DATE', defaultValue: () => new Date() }
    });
  }

  down(db) {
    return db.dropTable('users');
  }
}
```

## Best Practices

- ⚠️ Always use transactions for multi-step operations
- ⚠️ Index frequently queried columns
- ⚠️ Use connection pooling for production
- ⚠️ Validate input before database operations
- ⚠️ Use parametrized queries to prevent SQL injection
- ⚠️ Configure appropriate cache TTL values
- ⚠️ Monitor slow queries in production

## License

MIT

## Related Packages

- [@freelang/validator](https://npmjs.com/package/@freelang/validator) - Input validation
- [@freelang/auth](https://npmjs.com/package/@freelang/auth) - JWT/HMAC authentication
- [@freelang/security](https://npmjs.com/package/@freelang/security) - CORS, CSP, Rate Limiting
