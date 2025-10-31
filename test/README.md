# Testing node-checkpoint

This directory contains tests for node-checkpoint. Tests cover both PostgreSQL and MySQL functionality.

## Quick Start with Docker

The easiest way to run tests is using Docker Compose, which sets up test databases automatically.

### 1. Start Test Databases

```bash
# Start PostgreSQL and MySQL test databases
docker-compose -f docker-compose.test.yml up -d

# Wait for databases to be ready (about 10 seconds)
docker-compose -f docker-compose.test.yml ps
```

### 2. Run Tests

```bash
# Run all tests
npm test

# Or run directly
node test/basic.test.js
```

### 3. Stop Test Databases

```bash
# Stop and remove containers
docker-compose -f docker-compose.test.yml down

# Stop and remove containers + volumes (clean slate)
docker-compose -f docker-compose.test.yml down -v
```

## Manual Testing (Without Docker)

If you prefer to use existing databases:

### PostgreSQL Setup

```bash
# Create test database
createdb checkpoint_test

# Or using psql
psql -c "CREATE DATABASE checkpoint_test;"
```

### MySQL Setup

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE checkpoint_test;"
```

### Set Environment Variables

Create a `.env.test` file or export variables:

```bash
# PostgreSQL
export TEST_PG_HOST=localhost
export TEST_PG_PORT=5432
export TEST_PG_USER=postgres
export TEST_PG_PASSWORD=yourpassword
export TEST_PG_DB=checkpoint_test

# MySQL
export TEST_MYSQL_HOST=localhost
export TEST_MYSQL_PORT=3306
export TEST_MYSQL_USER=root
export TEST_MYSQL_PASSWORD=yourpassword
export TEST_MYSQL_DB=checkpoint_test
```

Then run tests:

```bash
node test/basic.test.js
```

## What Gets Tested

### Unit Tests
- Configuration validation
- Input validation (table names, migration names)
- Error handling
- Database adapter initialization

### Integration Tests
- Database connectivity (PostgreSQL & MySQL)
- Migration table creation
- Running migrations up
- Rolling back migrations
- Migration status tracking
- File operations

## Test Structure

```
test/
├── README.md              # This file
├── basic.test.js          # Main test suite
├── test-config.js         # Test configuration
└── migrations/            # Generated during tests (temporary)
    ├── postgres/          # PostgreSQL test migrations
    └── mysql/             # MySQL test migrations
```

## Writing New Tests

Add tests to `basic.test.js` using the helper functions:

```javascript
await test('Test description', async () => {
  // Your test code
  assert(condition, 'Assertion message');
});
```

## Test Database Ports

To avoid conflicts with existing databases, Docker uses different ports:
- PostgreSQL: `5433` (instead of default 5432)
- MySQL: `3307` (instead of default 3306)

## Troubleshooting

### Tests fail with "connection refused"

Make sure Docker containers are running:
```bash
docker-compose -f docker-compose.test.yml ps
```

All services should show "healthy" status.

### Port already in use

If ports 5433 or 3307 are in use, edit `docker-compose.test.yml` to use different ports.

### Permission denied on migrations directory

The test creates temporary migration files. Make sure you have write permissions in the test directory.

### Can't connect to database

Check that your database credentials match those in `.env.test` or your environment variables.

## CI/CD Integration

For continuous integration, you can use the Docker setup:

```yaml
# Example GitHub Actions workflow
- name: Start test databases
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for databases
  run: sleep 10

- name: Run tests
  run: npm test

- name: Stop databases
  run: docker-compose -f docker-compose.test.yml down
```

## Manual Testing Example

You can also manually test the CLI:

```bash
# Start databases
docker-compose -f docker-compose.test.yml up -d

# Create a test project directory
mkdir test-project
cd test-project

# Initialize
npx checkpoint init

# Edit migration.config.js to use test database
# (Use port 5433 for Postgres or 3307 for MySQL)

# Create a migration
npx checkpoint create add_users_table

# Edit the migration file with your SQL

# Run migration
npx checkpoint up

# Check status
npx checkpoint status

# Rollback
npx checkpoint down
```
