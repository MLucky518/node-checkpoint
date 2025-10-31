/**
 * Integration tests that verify actual database operations
 * These tests require running databases (use docker-compose.test.yml)
 *
 * Run with: node test/integration.test.js
 */

import { Migrator } from '../src/index.js';
import { PostgresAdapter } from '../src/db/postgres.js';
import { MysqlAdapter } from '../src/db/mysql.js';
import { testConfig } from './test-config.js';
import fs from 'fs/promises';
import path from 'path';

// Test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  console.log(`✓ ${message}`);
  testsPassed++;
}

async function test(name, fn) {
  console.log(`\n▶ ${name}`);
  try {
    await fn();
    console.log(`✓ Test passed: ${name}`);
  } catch (err) {
    console.error(`✗ Test failed: ${name}`);
    console.error(`  Error: ${err.message}`);
    if (err.stack) {
      console.error(`  Stack: ${err.stack.split('\n').slice(0, 3).join('\n')}`);
    }
  }
}

async function cleanupMigrations(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    // Ignore
  }
}

async function createMigration(dir, name, upSql, downSql) {
  await fs.mkdir(dir, { recursive: true });
  const timestamp = Date.now().toString().padStart(14, '0');
  const filename = `${timestamp}_${name}.js`;
  const content = `
export async function up(adapter) {
  await adapter.execute(\`${upSql}\`);
}

export async function down(adapter) {
  await adapter.execute(\`${downSql}\`);
}
`;
  await fs.writeFile(path.join(dir, filename), content);
  return filename;
}

// PostgreSQL Integration Tests
console.log('\n' + '='.repeat(60));
console.log('PostgreSQL Integration Tests');
console.log('='.repeat(60));

try {
  const pgConfig = testConfig.postgres;

  await test('PostgreSQL: Database connection', async () => {
    const adapter = new PostgresAdapter(pgConfig.database);
    const connected = await adapter.connect();
    assert(connected === true, 'Connected to PostgreSQL');
    await adapter.close();
  });

  await test('PostgreSQL: Create migrations tracking table', async () => {
    const adapter = new PostgresAdapter(pgConfig.database);
    await adapter.connect();

    // Drop table if exists from previous tests
    try {
      await adapter.execute(`DROP TABLE IF EXISTS ${pgConfig.tableName}`);
    } catch (err) {
      // Ignore
    }

    await adapter.createMigrationsTable(pgConfig.tableName);

    // Verify table exists by querying it
    const result = await adapter.pool.query(`SELECT COUNT(*) FROM ${pgConfig.tableName}`);
    assert(result.rows[0].count === '0', 'Migrations table is empty');

    await adapter.close();
  });

  await test('PostgreSQL: Record and retrieve migrations', async () => {
    const adapter = new PostgresAdapter(pgConfig.database);
    await adapter.connect();

    // Clear any existing migrations
    await adapter.execute(`DELETE FROM ${pgConfig.tableName}`);

    // Record migrations
    await adapter.recordMigration(pgConfig.tableName, '001_first.js');
    await adapter.recordMigration(pgConfig.tableName, '002_second.js');
    await adapter.recordMigration(pgConfig.tableName, '003_third.js');

    // Retrieve migrations
    const migrations = await adapter.getMigrations(pgConfig.tableName);
    assert(migrations.length === 3, 'Retrieved 3 migrations');
    assert(migrations[0] === '001_first.js', 'First migration correct');
    assert(migrations[1] === '002_second.js', 'Second migration correct');
    assert(migrations[2] === '003_third.js', 'Third migration correct');

    await adapter.close();
  });

  await test('PostgreSQL: Remove migration', async () => {
    const adapter = new PostgresAdapter(pgConfig.database);
    await adapter.connect();

    // Should have 3 migrations from previous test
    let migrations = await adapter.getMigrations(pgConfig.tableName);
    assert(migrations.length === 3, 'Started with 3 migrations');

    // Remove last migration
    await adapter.removeMigration(pgConfig.tableName, '003_third.js');

    migrations = await adapter.getMigrations(pgConfig.tableName);
    assert(migrations.length === 2, 'Now have 2 migrations');
    assert(!migrations.includes('003_third.js'), 'Third migration removed');

    await adapter.close();
  });

  await test('PostgreSQL: Full migration workflow', async () => {
    await cleanupMigrations(pgConfig.migrationsDir);

    // Clear migration records from previous tests
    const cleanAdapter = new PostgresAdapter(pgConfig.database);
    await cleanAdapter.connect();
    await cleanAdapter.execute(`DELETE FROM ${pgConfig.tableName}`);
    await cleanAdapter.close();

    const migrator = new Migrator(pgConfig);
    await migrator.init();

    try {
      // Create test migrations
      await createMigration(
        pgConfig.migrationsDir,
        'create_users',
        'CREATE TABLE pg_test_users (id SERIAL PRIMARY KEY, name VARCHAR(100) NOT NULL)',
        'DROP TABLE pg_test_users'
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await createMigration(
        pgConfig.migrationsDir,
        'create_posts',
        'CREATE TABLE pg_test_posts (id SERIAL PRIMARY KEY, title VARCHAR(255), user_id INT)',
        'DROP TABLE pg_test_posts'
      );

      // Run migrations up
      await migrator.up();

      // Verify tables exist with a new connection
      const adapter = new PostgresAdapter(pgConfig.database);
      await adapter.connect();

      const usersResult = await adapter.pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_test_users'"
      );
      assert(usersResult.rows.length === 1, 'Users table exists');

      const postsResult = await adapter.pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_test_posts'"
      );
      assert(postsResult.rows.length === 1, 'Posts table exists');

      // Verify migrations were recorded
      const executed = await adapter.getMigrations(pgConfig.tableName);
      assert(executed.length === 2, 'Both migrations recorded');

      await adapter.close();

      // Rollback one migration
      await migrator.down();

      // Verify posts table is gone with a new connection
      const adapter2 = new PostgresAdapter(pgConfig.database);
      await adapter2.connect();
      const afterDown = await adapter2.pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_test_posts'"
      );
      assert(afterDown.rows.length === 0, 'Posts table removed');

      // But users table still exists
      const usersStillExists = await adapter2.pool.query(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pg_test_users'"
      );
      assert(usersStillExists.rows.length === 1, 'Users table still exists');

      await adapter2.close();

      // Cleanup - rollback remaining migration
      // Create a new migrator since the adapter was closed
      const cleanupMigrator = new Migrator(pgConfig);
      try {
        await cleanupMigrator.down();
      } catch (err) {
        // Ignore errors during cleanup
      }
    } finally {
      // Always clean up migration files
      await cleanupMigrations(pgConfig.migrationsDir);
    }
  });

  console.log('\n✅ All PostgreSQL tests passed');
} catch (err) {
  console.error(`\n❌ PostgreSQL tests failed or database not available: ${err.message}`);
  console.error('Make sure PostgreSQL is running: docker-compose -f docker-compose.test.yml up -d');
}

// MySQL Integration Tests
console.log('\n' + '='.repeat(60));
console.log('MySQL Integration Tests');
console.log('='.repeat(60));

try {
  const mysqlConfig = testConfig.mysql;

  await test('MySQL: Database connection', async () => {
    const adapter = new MysqlAdapter(mysqlConfig.database);
    const connected = await adapter.connect();
    assert(connected === true, 'Connected to MySQL');
    await adapter.close();
  });

  await test('MySQL: Create migrations tracking table', async () => {
    const adapter = new MysqlAdapter(mysqlConfig.database);
    await adapter.connect();

    // Drop table if exists from previous tests
    try {
      await adapter.execute(`DROP TABLE IF EXISTS ${mysqlConfig.tableName}`);
    } catch (err) {
      // Ignore
    }

    await adapter.createMigrationsTable(mysqlConfig.tableName);

    // Verify table exists by querying it
    const [result] = await adapter.connection.execute(`SELECT COUNT(*) as count FROM ${mysqlConfig.tableName}`);
    assert(result[0].count === 0, 'Migrations table is empty');

    await adapter.close();
  });

  await test('MySQL: Record and retrieve migrations', async () => {
    const adapter = new MysqlAdapter(mysqlConfig.database);
    await adapter.connect();

    // Clear any existing migrations
    await adapter.execute(`DELETE FROM ${mysqlConfig.tableName}`);

    // Record migrations
    await adapter.recordMigration(mysqlConfig.tableName, '001_first.js');
    await adapter.recordMigration(mysqlConfig.tableName, '002_second.js');
    await adapter.recordMigration(mysqlConfig.tableName, '003_third.js');

    // Retrieve migrations
    const migrations = await adapter.getMigrations(mysqlConfig.tableName);
    assert(migrations.length === 3, 'Retrieved 3 migrations');
    assert(migrations[0] === '001_first.js', 'First migration correct');
    assert(migrations[1] === '002_second.js', 'Second migration correct');
    assert(migrations[2] === '003_third.js', 'Third migration correct');

    await adapter.close();
  });

  await test('MySQL: Remove migration', async () => {
    const adapter = new MysqlAdapter(mysqlConfig.database);
    await adapter.connect();

    // Should have 3 migrations from previous test
    let migrations = await adapter.getMigrations(mysqlConfig.tableName);
    assert(migrations.length === 3, 'Started with 3 migrations');

    // Remove last migration
    await adapter.removeMigration(mysqlConfig.tableName, '003_third.js');

    migrations = await adapter.getMigrations(mysqlConfig.tableName);
    assert(migrations.length === 2, 'Now have 2 migrations');
    assert(!migrations.includes('003_third.js'), 'Third migration removed');

    await adapter.close();
  });

  await test('MySQL: Full migration workflow', async () => {
    await cleanupMigrations(mysqlConfig.migrationsDir);

    // Clear migration records from previous tests
    const cleanAdapter = new MysqlAdapter(mysqlConfig.database);
    await cleanAdapter.connect();
    await cleanAdapter.execute(`DELETE FROM ${mysqlConfig.tableName}`);
    await cleanAdapter.close();

    const migrator = new Migrator(mysqlConfig);
    await migrator.init();

    try {
      // Create test migrations
      await createMigration(
        mysqlConfig.migrationsDir,
        'create_users',
        'CREATE TABLE mysql_test_users (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100) NOT NULL)',
        'DROP TABLE mysql_test_users'
      );

      await new Promise(resolve => setTimeout(resolve, 10));

      await createMigration(
        mysqlConfig.migrationsDir,
        'create_posts',
        'CREATE TABLE mysql_test_posts (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), user_id INT)',
        'DROP TABLE mysql_test_posts'
      );

      // Run migrations up
      await migrator.up();

      // Verify tables exist with a new connection
      const adapter = new MysqlAdapter(mysqlConfig.database);
      await adapter.connect();

      const [usersResult] = await adapter.connection.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'mysql_test_users'",
        [mysqlConfig.database.database]
      );
      assert(usersResult.length === 1, 'Users table exists');

      const [postsResult] = await adapter.connection.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'mysql_test_posts'",
        [mysqlConfig.database.database]
      );
      assert(postsResult.length === 1, 'Posts table exists');

      // Verify migrations were recorded
      const executed = await adapter.getMigrations(mysqlConfig.tableName);
      assert(executed.length === 2, 'Both migrations recorded');

      await adapter.close();

      // Rollback one migration
      await migrator.down();

      // Verify posts table is gone with a new connection
      const adapter2 = new MysqlAdapter(mysqlConfig.database);
      await adapter2.connect();
      const [afterDown] = await adapter2.connection.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'mysql_test_posts'",
        [mysqlConfig.database.database]
      );
      assert(afterDown.length === 0, 'Posts table removed');

      // But users table still exists
      const [usersStillExists] = await adapter2.connection.execute(
        "SELECT table_name FROM information_schema.tables WHERE table_schema = ? AND table_name = 'mysql_test_users'",
        [mysqlConfig.database.database]
      );
      assert(usersStillExists.length === 1, 'Users table still exists');

      await adapter2.close();

      // Cleanup - rollback remaining migration
      // Create a new migrator since the adapter was closed
      const cleanupMigrator = new Migrator(mysqlConfig);
      try {
        await cleanupMigrator.down();
      } catch (err) {
        // Ignore errors during cleanup
      }
    } finally {
      // Always clean up migration files
      await cleanupMigrations(mysqlConfig.migrationsDir);
    }
  });

  console.log('\n✅ All MySQL tests passed');
} catch (err) {
  console.error(`\n❌ MySQL tests failed or database not available: ${err.message}`);
  console.error('Make sure MySQL is running: docker-compose -f docker-compose.test.yml up -d');
}

// Summary
console.log('\n' + '='.repeat(60));
console.log('Test Summary');
console.log('='.repeat(60));
console.log(`Total Assertions Passed: ${testsPassed}`);
console.log(`Total Assertions Failed: ${testsFailed}`);
console.log('='.repeat(60));

if (testsFailed > 0) {
  console.error('\n❌ Some tests failed');
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!');
  process.exit(0);
}
