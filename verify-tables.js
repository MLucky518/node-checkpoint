#!/usr/bin/env node

/**
 * Script to verify database tables exist
 * Usage: node verify-tables.js [postgres|mysql|both]
 */

import { PostgresAdapter } from './src/db/postgres.js';
import { MysqlAdapter } from './src/db/mysql.js';
import { testConfig } from './test/test-config.js';

const dbType = process.argv[2] || 'both';

async function verifyPostgres() {
  console.log('\n=== PostgreSQL Verification ===');
  try {
    const adapter = new PostgresAdapter(testConfig.postgres.database);
    await adapter.connect();
    console.log('✓ Connected to PostgreSQL');

    // List all tables
    const result = await adapter.pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\nFound ${result.rows.length} tables:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.table_name}`);
    });

    // Check for migrations table
    const migrationsTable = result.rows.find(r => r.table_name === testConfig.postgres.tableName);
    if (migrationsTable) {
      console.log(`\n✓ Migrations table '${testConfig.postgres.tableName}' exists`);

      // Get migration records
      const migrations = await adapter.getMigrations(testConfig.postgres.tableName);
      console.log(`  Executed migrations: ${migrations.length}`);
      migrations.forEach(m => console.log(`    - ${m}`));
    } else {
      console.log(`\n✗ Migrations table '${testConfig.postgres.tableName}' NOT found`);
    }

    await adapter.close();
  } catch (err) {
    console.error(`✗ PostgreSQL Error: ${err.message}`);
  }
}

async function verifyMysql() {
  console.log('\n=== MySQL Verification ===');
  try {
    const adapter = new MysqlAdapter(testConfig.mysql.database);
    await adapter.connect();
    console.log('✓ Connected to MySQL');

    // List all tables
    const [tables] = await adapter.connection.execute(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = ?
      ORDER BY table_name
    `, [testConfig.mysql.database.database]);

    console.log(`\nFound ${tables.length} tables:`);
    tables.forEach(row => {
      console.log(`  - ${row.TABLE_NAME || row.table_name}`);
    });

    // Check for migrations table
    const migrationsTable = tables.find(r =>
      (r.TABLE_NAME || r.table_name) === testConfig.mysql.tableName
    );

    if (migrationsTable) {
      console.log(`\n✓ Migrations table '${testConfig.mysql.tableName}' exists`);

      // Get migration records
      const migrations = await adapter.getMigrations(testConfig.mysql.tableName);
      console.log(`  Executed migrations: ${migrations.length}`);
      migrations.forEach(m => console.log(`    - ${m}`));
    } else {
      console.log(`\n✗ Migrations table '${testConfig.mysql.tableName}' NOT found`);
    }

    await adapter.close();
  } catch (err) {
    console.error(`✗ MySQL Error: ${err.message}`);
  }
}

// Main
(async () => {
  console.log('🔍 Database Table Verification');
  console.log('================================');

  if (dbType === 'postgres' || dbType === 'both') {
    await verifyPostgres();
  }

  if (dbType === 'mysql' || dbType === 'both') {
    await verifyMysql();
  }

  console.log('\n================================');
  console.log('✓ Verification complete\n');
})();
