# node-checkpoint

A lightweight, Rails-like SQL migration runner for PostgreSQL and MySQL.

## Features

- Simple, timestamp-based migration files
- Support for PostgreSQL and MySQL
- Rails-like CLI commands
- Transaction support per migration
- Zero configuration required (with sensible defaults)
- ES modules support

## Installation

```bash
npm install node-checkpoint
```

## Quick Start

### 1. Initialize checkpoint in your project

```bash
npx checkpoint init
```

This creates:
- A `migration.config.js` configuration file
- A `migrations/` directory
- The migrations tracking table in your database

### 2. Create your first migration

```bash
npx checkpoint create create_users_table
```

This generates a timestamped migration file like `20250130120000_create_users_table.js`:

```javascript
/**
 * Migration: create_users_table
 * Created: 2025-01-30T12:00:00.000Z
 */

export async function up(adapter) {
  // Write your migration here
  await adapter.execute(`
    CREATE TABLE users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

export async function down(adapter) {
  // Write your rollback here
  await adapter.execute('DROP TABLE users');
}
```

### 3. Run migrations

```bash
npx checkpoint up
```

### 4. Check migration status

```bash
npx checkpoint status
```

### 5. Rollback the last migration

```bash
npx checkpoint down
```

## Configuration

The `migration.config.js` file supports environment variables:

```javascript
export default {
  database: {
    type: process.env.DB_TYPE || 'postgres', // 'postgres' or 'mysql'
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
  },
  migrationsDir: process.env.MIGRATIONS_DIR || './migrations',
  tableName: 'schema_migrations',
};
```

You can use a `.env` file with the `dotenv` package:

```env
DB_TYPE=postgres
DB_HOST=localhost
DB_PORT=5432
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=mydb
MIGRATIONS_DIR=./migrations
```

## CLI Commands

| Command | Description |
|---------|-------------|
| `checkpoint init` | Initialize checkpoint in the current directory |
| `checkpoint up` | Run all pending migrations |
| `checkpoint down` | Rollback the last migration |
| `checkpoint status` | Show migration status (executed and pending) |
| `checkpoint create <name>` | Create a new migration file |

## Migration Files

Migration files must export two functions:

- `up(adapter)`: Applies the migration
- `down(adapter)`: Reverts the migration

The `adapter` parameter provides an `execute(sql)` method to run SQL commands.

### PostgreSQL Example

```javascript
export async function up(adapter) {
  await adapter.execute(`
    CREATE TABLE products (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await adapter.execute(`
    CREATE INDEX idx_products_name ON products(name)
  `);
}

export async function down(adapter) {
  await adapter.execute('DROP TABLE products');
}
```

### MySQL Example

```javascript
export async function up(adapter) {
  await adapter.execute(`
    CREATE TABLE products (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      price DECIMAL(10, 2) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await adapter.execute(`
    CREATE INDEX idx_products_name ON products(name)
  `);
}

export async function down(adapter) {
  await adapter.execute('DROP TABLE products');
}
```

## Programmatic Usage

You can also use checkpoint programmatically in your Node.js code:

```javascript
import { Migrator } from 'node-checkpoint';

const config = {
  database: {
    type: 'postgres',
    host: 'localhost',
    port: 5432,
    user: 'myuser',
    password: 'mypassword',
    database: 'mydb',
  },
  migrationsDir: './migrations',
  tableName: 'schema_migrations',
};

const migrator = new Migrator(config);

// Initialize
await migrator.init();

// Run migrations
await migrator.up();

// Check status
await migrator.status();

// Rollback
await migrator.down();

// Create new migration
await migrator.create('add_users_table');
```

## Database Support

### PostgreSQL
- Uses connection pooling
- Supports all PostgreSQL data types and features
- Tested with PostgreSQL 12+

### MySQL
- Uses mysql2/promise for async/await support
- Supports all MySQL data types and features
- Tested with MySQL 8+

## Security

node-checkpoint includes several security measures:

1. **Table name validation**: The migrations table name is validated to prevent SQL injection
2. **Parameterized queries**: All migration tracking uses parameterized queries
3. **Isolated migrations**: Each migration runs independently with proper error handling

**Important**: The `adapter.execute()` method in migrations runs raw SQL. Always validate and sanitize any dynamic values before including them in SQL statements.

## Best Practices

1. **Always include a down migration**: This allows you to rollback changes if needed.

2. **One logical change per migration**: Keep migrations focused and atomic.

3. **Test migrations in development first**: Always test both up and down migrations before applying to production.

4. **Use descriptive migration names**: Names like `create_users_table` or `add_email_to_users` are clear and self-documenting.

5. **Don't modify existing migrations**: Once a migration is committed and deployed, create a new migration instead of modifying the old one.

6. **Backup your database**: Always backup before running migrations in production.

## Migration Naming Convention

Migration files follow the format: `{timestamp}_{name}.js`

Example: `20250130120000_create_users_table.js`

The timestamp ensures migrations run in chronological order.

## Error Handling

If a migration fails:
- The error is displayed in the console
- The migration is not recorded as executed
- You can fix the migration and run `checkpoint up` again

## Requirements

- Node.js >= 18.0.0
- PostgreSQL or MySQL database

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
