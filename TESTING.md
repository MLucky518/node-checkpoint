# Testing Guide for node-checkpoint

This document explains how the testing infrastructure works and what it verifies.

## Test Architecture

```
test/
├── basic.test.js          # Unit tests (no database required)
├── integration.test.js    # Integration tests (database required)
├── test-config.js         # Test configuration
└── README.md              # Detailed testing instructions
```

## What Gets Tested

### Unit Tests ([basic.test.js](test/basic.test.js))

These tests run WITHOUT requiring a database and verify:

✅ **Configuration Validation**
- Rejects null/empty configuration
- Validates required fields (database, migrationsDir, tableName)
- Validates table name format (SQL injection prevention)
- Rejects unsupported database types

✅ **Migration Name Validation**
- Rejects invalid characters (hyphens, spaces, etc.)
- Accepts valid names (alphanumeric + underscores)

✅ **File Operations**
- Creates migration files with correct format
- Generates proper timestamps
- Creates migrations directory

### Integration Tests ([integration.test.js](test/integration.test.js))

These tests require running databases and verify actual database operations:

#### PostgreSQL Tests
✅ **Connection**
- Successfully connects to PostgreSQL
- Properly closes connections

✅ **Migrations Table**
- Creates migrations tracking table
- Table has correct schema (id, name, executed_at)

✅ **Migration Tracking**
- Records executed migrations
- Retrieves migrations in chronological order
- Removes migrations on rollback

✅ **Full Workflow**
- Creates actual database tables via migrations
- Applies multiple migrations in order
- Verifies tables exist in database schema
- Rolls back migrations (removes tables)
- Maintains proper state after each operation

#### MySQL Tests
✅ **Connection**
- Successfully connects to MySQL
- Properly closes connections

✅ **Migrations Table**
- Creates migrations tracking table
- Table has correct schema

✅ **Migration Tracking**
- Records executed migrations
- Retrieves migrations in chronological order
- Removes migrations on rollback

✅ **Full Workflow**
- Creates actual database tables via migrations
- Applies multiple migrations in order
- Verifies tables exist in database schema
- Rolls back migrations (removes tables)
- Maintains proper state after each operation

## How Integration Tests Verify Database Operations

The integration tests actually:

1. **Connect to real databases** (PostgreSQL and MySQL running in Docker)
2. **Execute real SQL** to create tables, indexes, etc.
3. **Query system catalogs** to verify tables exist:
   - PostgreSQL: `information_schema.tables`
   - MySQL: `information_schema.tables`
4. **Verify migration tracking** by checking the migrations table
5. **Test rollbacks** by dropping tables and verifying they're gone
6. **Clean up** all test data after each test

### Example: What the "Full workflow" test does

```javascript
// 1. Initialize migrator (creates migrations table)
await migrator.init();

// 2. Create test migration files on disk
createMigration('create_users', 'CREATE TABLE ...', 'DROP TABLE ...');

// 3. Run migrations (executes SQL, creates real table)
await migrator.up();

// 4. VERIFY: Query database to confirm table exists
const result = await db.query(
  "SELECT table_name FROM information_schema.tables WHERE ..."
);
assert(result.length === 1); // Table actually exists!

// 5. Rollback migration (drops table)
await migrator.down();

// 6. VERIFY: Query database to confirm table is gone
const afterDown = await db.query(...);
assert(afterDown.length === 0); // Table is actually gone!
```

## Running Tests

### Option 1: Quick Start (Easiest)

```bash
./test-quick-start.sh
```

This handles everything automatically.

### Option 2: Step by Step

```bash
# 1. Start databases
docker-compose -f docker-compose.test.yml up -d

# 2. Wait for them to be ready
sleep 10

# 3. Run unit tests (no database needed)
npm run test:unit

# 4. Run integration tests (uses databases)
npm run test:integration

# 5. Stop databases
docker-compose -f docker-compose.test.yml down
```

### Option 3: Use Your Own Databases

If you already have PostgreSQL/MySQL running:

```bash
# Set environment variables
export TEST_PG_HOST=localhost
export TEST_PG_PORT=5432
export TEST_PG_USER=postgres
export TEST_PG_PASSWORD=yourpassword
export TEST_PG_DB=checkpoint_test

export TEST_MYSQL_HOST=localhost
export TEST_MYSQL_PORT=3306
export TEST_MYSQL_USER=root
export TEST_MYSQL_PASSWORD=yourpassword
export TEST_MYSQL_DB=checkpoint_test

# Run tests
npm test
```

## Test Output

### Successful Test Output

```
▶ PostgreSQL: Database connection
✓ Connected to PostgreSQL
✓ Test passed: PostgreSQL: Database connection

▶ PostgreSQL: Full migration workflow
✓ Users table exists
✓ Posts table exists
✓ Both migrations recorded
✓ Posts table removed
✓ Users table still exists
✓ Test passed: PostgreSQL: Full migration workflow

========================================
Test Summary
========================================
Total Assertions Passed: 45
Total Assertions Failed: 0
========================================

✅ All tests passed!
```

### When Tests Fail

If a database isn't available:
```
❌ PostgreSQL tests failed or database not available: connect ECONNREFUSED
Make sure PostgreSQL is running: docker-compose -f docker-compose.test.yml up -d
```

## What This Proves

The test suite proves that:

1. ✅ The package correctly validates all inputs
2. ✅ Database connections work for both PostgreSQL and MySQL
3. ✅ Migrations are tracked correctly in the database
4. ✅ SQL is executed correctly and creates real tables
5. ✅ Rollbacks work and actually remove tables
6. ✅ The migration order is preserved
7. ✅ Error handling works correctly
8. ✅ File operations work correctly

## Adding New Tests

To add a new test:

```javascript
await test('Test description', async () => {
  // Your test code
  assert(condition, 'What this verifies');
});
```

## CI/CD Integration

For GitHub Actions or other CI/CD:

```yaml
- name: Start test databases
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for databases
  run: sleep 10

- name: Run tests
  run: npm test

- name: Cleanup
  run: docker-compose -f docker-compose.test.yml down
```

## Troubleshooting

**Tests hang or timeout?**
- Check if Docker containers are running: `docker ps`
- Check container logs: `docker-compose -f docker-compose.test.yml logs`

**Connection refused errors?**
- Wait longer for databases to start (increase sleep time)
- Check if ports are already in use

**Permission errors?**
- Make test script executable: `chmod +x test-quick-start.sh`
- Check write permissions in test directory

## Further Reading

- [test/README.md](test/README.md) - Detailed testing documentation
- [docker-compose.test.yml](docker-compose.test.yml) - Database configuration
- [test/test-config.js](test/test-config.js) - Test configuration
