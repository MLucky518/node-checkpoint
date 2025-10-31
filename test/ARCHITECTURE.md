# Test Architecture

## Test Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  TEST QUICK START                        │
│              ./test-quick-start.sh                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────┐
│              DOCKER COMPOSE                              │
│         docker-compose.test.yml                          │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────┐    │
│  │   PostgreSQL:5433    │  │     MySQL:3307       │    │
│  │  checkpoint_test DB  │  │  checkpoint_test DB  │    │
│  └──────────────────────┘  └──────────────────────┘    │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ├─────────────────────┬─────────────────┐
                  ▼                     ▼                 ▼
         ┌────────────────┐   ┌──────────────┐  ┌──────────────┐
         │  basic.test.js │   │integration.  │  │integration.  │
         │  (Unit Tests)  │   │test.js       │  │test.js       │
         │                │   │(PostgreSQL)  │  │(MySQL)       │
         └────────────────┘   └──────────────┘  └──────────────┘
                  │                     │                 │
                  ▼                     ▼                 ▼
         ┌────────────────┐   ┌──────────────┐  ┌──────────────┐
         │ Config Valid.  │   │Connect to PG │  │Connect to    │
         │ Input Valid.   │   │Create Tables │  │MySQL         │
         │ File Ops       │   │Run Migrations│  │Create Tables │
         │                │   │Verify Tables │  │Run Migrations│
         │ NO DATABASE    │   │Test Rollback │  │Verify Tables │
         │ REQUIRED       │   │              │  │Test Rollback │
         └────────────────┘   └──────────────┘  └──────────────┘
```

## What Each Component Does

### Docker Compose (docker-compose.test.yml)
- Spins up PostgreSQL on port 5433
- Spins up MySQL on port 3307
- Uses non-standard ports to avoid conflicts
- Creates test databases automatically
- Health checks ensure databases are ready

### Unit Tests (basic.test.js)
**No database required** - Tests pure logic:
- ✅ Configuration object validation
- ✅ Migration name validation (regex)
- ✅ File system operations
- ✅ Error message accuracy
- ✅ Input sanitization

### Integration Tests (integration.test.js)
**Requires databases** - Tests real operations:

#### Phase 1: Connection Testing
```
Test → Adapter.connect() → Real Database → Verify Connected
```

#### Phase 2: Table Management
```
Test → createMigrationsTable() → SQL Execute → Query DB → Verify Table Exists
```

#### Phase 3: Migration Tracking
```
Test → recordMigration() → INSERT → Query DB → Verify Record Exists
Test → getMigrations() → SELECT → Verify Order
Test → removeMigration() → DELETE → Query DB → Verify Removed
```

#### Phase 4: Full Workflow
```
Test → Create Migration Files on Disk
     ↓
Test → migrator.up()
     ↓
Execute SQL: CREATE TABLE users ...
     ↓
Query information_schema.tables
     ↓
Assert: Table exists in database ✓
     ↓
Test → migrator.down()
     ↓
Execute SQL: DROP TABLE users
     ↓
Query information_schema.tables
     ↓
Assert: Table no longer exists ✓
```

## Data Flow

### Migration Up Flow
```
User → CLI → Migrator.up()
           ↓
       Scan migrations directory
           ↓
       Get executed migrations from DB
           ↓
       Calculate pending migrations
           ↓
       For each pending migration:
         ├─→ Load migration file
         ├─→ Execute migration.up(adapter)
         ├─→ adapter.execute(SQL) → Database
         ├─→ Record migration in tracking table
         └─→ Log success
```

### Migration Down Flow
```
User → CLI → Migrator.down()
           ↓
       Get executed migrations from DB
           ↓
       Get last executed migration
           ↓
       Load migration file
           ↓
       Execute migration.down(adapter)
           ↓
       adapter.execute(SQL) → Database
           ↓
       Remove migration from tracking table
           ↓
       Log success
```

## Test Verification Points

### Integration Test Checkpoints

1. **Connection Verified**
   ```javascript
   await adapter.connect() === true
   // Actual TCP connection established ✓
   ```

2. **Table Created**
   ```javascript
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'test_users'
   // Returns 1 row → Table exists ✓
   ```

3. **Migration Recorded**
   ```javascript
   SELECT name FROM schema_migrations
   // Returns migration filename ✓
   ```

4. **Rollback Verified**
   ```javascript
   SELECT table_name FROM information_schema.tables
   WHERE table_name = 'test_users'
   // Returns 0 rows → Table removed ✓
   ```

## File Structure During Tests

```
node-checkpoint/
├── src/                           (Source code being tested)
│   ├── index.js
│   ├── cli.js
│   ├── db/
│   │   ├── postgres.js
│   │   └── mysql.js
│   └── utils/
│       └── file-scanner.js
│
├── test/                          (Test suite)
│   ├── basic.test.js
│   ├── integration.test.js
│   ├── test-config.js
│   └── migrations/                (Created during tests)
│       ├── postgres/              (Temporary)
│       │   └── 20250130120000_create_test_table.js
│       └── mysql/                 (Temporary)
│           └── 20250130120100_create_test_table.js
│
└── docker-compose.test.yml        (Test databases)
```

## Test Execution Timeline

```
0s   → Start Docker containers
10s  → Databases ready (health checks pass)
11s  → Run unit tests (fast, ~1s)
12s  → Run PostgreSQL integration tests (~5s)
       - Connect
       - Create tables
       - Run migrations
       - Verify tables exist
       - Rollback
       - Verify tables removed
17s  → Run MySQL integration tests (~5s)
       - Same as PostgreSQL
22s  → All tests complete
23s  → Stop Docker containers
```

## Why This Approach Works

1. **Isolated**: Each test creates its own tables/migrations
2. **Repeatable**: Tests clean up after themselves
3. **Realistic**: Uses real databases, not mocks
4. **Fast**: Docker containers start in ~10s
5. **Comprehensive**: Tests both unit logic and database integration
6. **Safe**: Uses test databases, won't affect production
7. **Portable**: Works on any system with Docker

## Debugging Tests

### View Test Database Contents

**PostgreSQL:**
```bash
docker exec -it checkpoint-test-postgres psql -U postgres -d checkpoint_test
\dt  # List tables
SELECT * FROM test_schema_migrations;
```

**MySQL:**
```bash
docker exec -it checkpoint-test-mysql mysql -uroot -ppassword checkpoint_test
SHOW TABLES;
SELECT * FROM test_schema_migrations;
```

### View Test Output with Details

```bash
# Run with Node.js debugging
NODE_DEBUG=* npm test

# Or run individual tests
node test/basic.test.js
node test/integration.test.js
```

## Extending Tests

To add a new test:

1. Add test to appropriate file (basic.test.js or integration.test.js)
2. Use `test()` wrapper
3. Use `assert()` for verification
4. Clean up any resources
5. Run and verify

Example:
```javascript
await test('New feature works', async () => {
  // Setup
  const migrator = new Migrator(testConfig.postgres);

  // Execute
  const result = await migrator.someNewFeature();

  // Verify
  assert(result === expected, 'Feature returns expected value');

  // Cleanup
  await cleanup();
});
```
