import { PostgresAdapter } from './db/postgres.js';
import { MysqlAdapter } from './db/mysql.js';
import { scanMigrations, loadMigration, generateMigrationFilename } from './utils/file-scanner.js';
import fs from 'fs/promises';
import path from 'path';

/**
 * Main migration manager class
 */
export class Migrator {
  /**
   * Creates a new Migrator instance
   * @param {Object} config - Configuration object
   * @param {Object} config.database - Database configuration
   * @param {string} config.database.type - Database type ('postgres' or 'mysql')
   * @param {string} config.database.host - Database host
   * @param {number} config.database.port - Database port
   * @param {string} config.database.user - Database user
   * @param {string} config.database.password - Database password
   * @param {string} config.database.database - Database name
   * @param {string} config.migrationsDir - Directory containing migration files
   * @param {string} config.tableName - Name of the migrations tracking table
   * @throws {Error} If configuration is invalid
   */
  constructor(config) {
    if (!config) {
      throw new Error('Configuration is required');
    }
    if (!config.database) {
      throw new Error('Database configuration is required');
    }
    if (!config.migrationsDir) {
      throw new Error('Migrations directory is required');
    }
    if (!config.tableName) {
      throw new Error('Table name is required');
    }

    // Validate table name to prevent SQL injection
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(config.tableName)) {
      throw new Error('Invalid table name. Must start with a letter or underscore and contain only alphanumeric characters and underscores');
    }

    this.config = config;
    this.adapter = this.initAdapter();
  }

  /**
   * Initializes the appropriate database adapter based on configuration
   * @private
   * @returns {PostgresAdapter|MysqlAdapter} Database adapter instance
   * @throws {Error} If database type is not supported
   */
  initAdapter() {
    const dbType = this.config.database.type;

    switch (dbType) {
      case 'postgres':
        return new PostgresAdapter(this.config.database);
      case 'mysql':
        return new MysqlAdapter(this.config.database);
      default:
        throw new Error(`Unsupported database type: ${dbType}. Supported types: postgres, mysql`);
    }
  }

  /**
   * Initializes the migration system by creating the migrations table and directory
   * @throws {Error} If database connection or table creation fails
   */
  async init() {
    await this.adapter.connect();
    await this.adapter.createMigrationsTable(this.config.tableName);
    const migrationsDir = this.config.migrationsDir;
    await fs.mkdir(migrationsDir, { recursive: true });
    console.log(`✓ Checkpoint initialized`);
  }

  /**
   * Runs all pending migrations
   * @throws {Error} If migration execution fails
   */
  async up() {
    await this.adapter.connect();
    const executed = await this.adapter.getMigrations(this.config.tableName);
    const files = await scanMigrations(this.config.migrationsDir);
    const pending = files.filter(f => !executed.includes(f));

    if (pending.length === 0) {
      console.log('No pending migrations');
      await this.adapter.close();
      return;
    }

    for (const file of pending) {
      const migration = await loadMigration(this.config.migrationsDir, file);
      await migration.up(this.adapter);
      await this.adapter.recordMigration(this.config.tableName, file);
      console.log(`✓ ${file}`);
    }

    await this.adapter.close();
  }

  /**
   * Rolls back the last executed migration
   * @throws {Error} If rollback fails
   */
  async down() {
    await this.adapter.connect();
    const executed = await this.adapter.getMigrations(this.config.tableName);
    
    if (executed.length === 0) {
      console.log('No migrations to rollback');
      await this.adapter.close();
      return;
    }

    const last = executed[executed.length - 1];
    const migration = await loadMigration(this.config.migrationsDir, last);
    await migration.down(this.adapter);
    await this.adapter.removeMigration(this.config.tableName, last);
    console.log(`✓ Rolled back ${last}`);
    await this.adapter.close();
  }

  /**
   * Displays the status of all migrations (executed and pending)
   * @throws {Error} If unable to read migration status
   */
  async status() {
    await this.adapter.connect();
    const executed = await this.adapter.getMigrations(this.config.tableName);
    const files = await scanMigrations(this.config.migrationsDir);
    const pending = files.filter(f => !executed.includes(f));

    console.log('\nExecuted:');
    executed.forEach(f => console.log(`  ✓ ${f}`));
    console.log('\nPending:');
    pending.forEach(f => console.log(`  ○ ${f}`));

    await this.adapter.close();
  }

  /**
   * Creates a new migration file with a timestamp prefix
   * @param {string} name - Name of the migration (alphanumeric and underscores only)
   * @throws {Error} If name is invalid or file creation fails
   */
  async create(name) {
    if (!name || typeof name !== 'string' || name.trim() === '') {
      throw new Error('Migration name is required');
    }

    // Validate migration name (alphanumeric and underscores only)
    if (!/^[a-zA-Z0-9_]+$/.test(name)) {
      throw new Error('Migration name can only contain letters, numbers, and underscores');
    }

    const filename = generateMigrationFilename(name);
    const filepath = path.join(this.config.migrationsDir, filename);

    const template = `/**
 * Migration: ${name}
 * Created: ${new Date().toISOString()}
 */

export async function up(adapter) {
  // Write your migration here
  // Example: await adapter.execute('CREATE TABLE users (id SERIAL PRIMARY KEY, name VARCHAR(255))');
}

export async function down(adapter) {
  // Write your rollback here
  // Example: await adapter.execute('DROP TABLE users');
}
`;

    await fs.mkdir(this.config.migrationsDir, { recursive: true });
    await fs.writeFile(filepath, template);
    console.log(`✓ Created ${filename}`);
  }
}