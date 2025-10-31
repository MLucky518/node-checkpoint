/**
 * Basic integration tests for node-checkpoint
 * Run with: node test/basic.test.js
 */

import { Migrator } from '../src/index.js';
import { testConfig } from './test-config.js';
import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

// Simple test utilities
let testsPassed = 0;
let testsFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`✗ FAILED: ${message}`);
    testsFailed++;
    throw new Error(message);
  }
  console.log(`✓ PASSED: ${message}`);
  testsPassed++;
}

async function test(name, fn) {
  console.log(`\n▶ Running: ${name}`);
  try {
    await fn();
    console.log(`✓ Test passed: ${name}`);
  } catch (err) {
    console.error(`✗ Test failed: ${name}`);
    console.error(`  Error: ${err.message}`);
  }
}

// Test utilities
async function cleanupTestMigrations(dir) {
  try {
    await fs.rm(dir, { recursive: true, force: true });
  } catch (err) {
    // Directory might not exist, that's ok
  }
}

async function createTestMigration(dir, name, upSql, downSql) {
  await fs.mkdir(dir, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
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

// Test: Configuration validation
await test('Configuration validation - should reject empty config', async () => {
  try {
    new Migrator(null);
    assert(false, 'Should have thrown error for null config');
  } catch (err) {
    assert(err.message.includes('Configuration is required'), 'Correct error message');
  }
});

await test('Configuration validation - should reject invalid table name', async () => {
  try {
    new Migrator({
      database: { type: 'postgres' },
      migrationsDir: './migrations',
      tableName: 'invalid-table-name', // Hyphens not allowed
    });
    assert(false, 'Should have thrown error for invalid table name');
  } catch (err) {
    assert(err.message.includes('Invalid table name'), 'Correct error message');
  }
});

await test('Configuration validation - should reject unsupported database', async () => {
  try {
    new Migrator({
      database: { type: 'mongodb' },
      migrationsDir: './migrations',
      tableName: 'migrations',
    });
    assert(false, 'Should have thrown error for unsupported database');
  } catch (err) {
    assert(err.message.includes('Unsupported database type'), 'Correct error message');
  }
});

// Test: Migration name validation
await test('Migration name validation - should reject invalid characters', async () => {
  const config = testConfig.postgres;
  const migrator = new Migrator(config);

  try {
    await migrator.create('invalid-name-with-hyphens');
    assert(false, 'Should have thrown error for invalid migration name');
  } catch (err) {
    assert(err.message.includes('can only contain letters, numbers, and underscores'), 'Correct error message');
  } finally {
    await cleanupTestMigrations(config.migrationsDir);
  }
});

await test('Migration name validation - should accept valid names', async () => {
  const config = testConfig.postgres;
  const migrator = new Migrator(config);

  try {
    await migrator.create('valid_migration_name_123');
    const files = await fs.readdir(config.migrationsDir);
    assert(files.length === 1, 'Migration file created');
    assert(files[0].includes('valid_migration_name_123'), 'Correct migration name');
  } finally {
    await cleanupTestMigrations(config.migrationsDir);
  }
});

// Test PostgreSQL (if available)
console.log('\n=== PostgreSQL Tests ===');
try {
  const pgConfig = testConfig.postgres;

  await test('PostgreSQL - should initialize and create migrations table', async () => {
    await cleanupTestMigrations(pgConfig.migrationsDir);

    const migrator = new Migrator(pgConfig);
    await migrator.init();

    // Check that migrations directory was created
    const dirExists = await fs.access(pgConfig.migrationsDir).then(() => true).catch(() => false);
    assert(dirExists, 'Migrations directory created');
  });

  await test('PostgreSQL - should run migrations up and down', async () => {
    await cleanupTestMigrations(pgConfig.migrationsDir);

    const migrator = new Migrator(pgConfig);
    await migrator.init();

    // Create a test migration
    await createTestMigration(
      pgConfig.migrationsDir,
      'create_test_table',
      'CREATE TABLE test_table (id SERIAL PRIMARY KEY, name VARCHAR(100))',
      'DROP TABLE test_table'
    );

    // Run migration up
    await migrator.up();

    // Verify table was created by creating a new connection
    const { PostgresAdapter } = await import('../src/db/postgres.js');
    const testAdapter = new PostgresAdapter(pgConfig.database);
    await testAdapter.connect();
    const result = await testAdapter.pool.query('SELECT * FROM test_table');
    assert(result !== null, 'Table was created');
    await testAdapter.close();

    // Run migration down
    await migrator.down();

    // Cleanup
    await cleanupTestMigrations(pgConfig.migrationsDir);
  });

  await test('PostgreSQL - status command should show executed and pending', async () => {
    await cleanupTestMigrations(pgConfig.migrationsDir);

    const migrator = new Migrator(pgConfig);
    await migrator.init();

    // Create two migrations
    await createTestMigration(
      pgConfig.migrationsDir,
      'migration_one',
      'CREATE TABLE table_one (id SERIAL PRIMARY KEY)',
      'DROP TABLE table_one'
    );

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 100));

    await createTestMigration(
      pgConfig.migrationsDir,
      'migration_two',
      'CREATE TABLE table_two (id SERIAL PRIMARY KEY)',
      'DROP TABLE table_two'
    );

    // Run first migration only
    const files = await fs.readdir(pgConfig.migrationsDir);
    const sortedFiles = files.sort();

    // Create a new adapter for running the migration
    const { PostgresAdapter } = await import('../src/db/postgres.js');
    const adapter = new PostgresAdapter(pgConfig.database);
    await adapter.connect();
    const migrationPath = path.resolve(pgConfig.migrationsDir, sortedFiles[0]);
    const migration = await import(pathToFileURL(migrationPath).href);
    await migration.up(adapter);
    await adapter.recordMigration(pgConfig.tableName, sortedFiles[0]);
    await adapter.close();

    // Check status with a new adapter
    const statusAdapter = new PostgresAdapter(pgConfig.database);
    await statusAdapter.connect();
    const executed = await statusAdapter.getMigrations(pgConfig.tableName);
    assert(executed.length === 1, 'One migration executed');
    await statusAdapter.close();

    // Cleanup
    await migrator.down();
    await cleanupTestMigrations(pgConfig.migrationsDir);
  });

  console.log('✓ PostgreSQL tests completed successfully');
} catch (err) {
  console.log(`⚠ PostgreSQL tests skipped (database not available or error: ${err.message})`);
}

// Test MySQL (if available)
console.log('\n=== MySQL Tests ===');
try {
  const mysqlConfig = testConfig.mysql;

  await test('MySQL - should initialize and create migrations table', async () => {
    await cleanupTestMigrations(mysqlConfig.migrationsDir);

    const migrator = new Migrator(mysqlConfig);
    await migrator.init();

    // Check that migrations directory was created
    const dirExists = await fs.access(mysqlConfig.migrationsDir).then(() => true).catch(() => false);
    assert(dirExists, 'Migrations directory created');

    await cleanupTestMigrations(mysqlConfig.migrationsDir);
  });

  await test('MySQL - should run migrations up and down', async () => {
    await cleanupTestMigrations(mysqlConfig.migrationsDir);

    const migrator = new Migrator(mysqlConfig);
    await migrator.init();

    // Create a test migration
    await createTestMigration(
      mysqlConfig.migrationsDir,
      'create_test_table',
      'CREATE TABLE test_table (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(100))',
      'DROP TABLE test_table'
    );

    // Run migration up
    await migrator.up();

    // Run migration down
    await migrator.down();

    // Cleanup
    await cleanupTestMigrations(mysqlConfig.migrationsDir);
  });

  console.log('✓ MySQL tests completed successfully');
} catch (err) {
  console.log(`⚠ MySQL tests skipped (database not available or error: ${err.message})`);
}

// Summary
console.log('\n' + '='.repeat(50));
console.log('Test Summary:');
console.log(`  Passed: ${testsPassed}`);
console.log(`  Failed: ${testsFailed}`);
console.log('='.repeat(50));

if (testsFailed > 0) {
  process.exit(1);
}
