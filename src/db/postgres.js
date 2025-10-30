/**
 * PostgreSQL database adapter for managing migrations
 * @module db/postgres
 */

import pg from 'pg';

/**
 * PostgreSQL adapter class implementing the database adapter interface
 */
export class PostgresAdapter {
  /**
   * Creates a PostgreSQL adapter instance
   * @param {Object} config - Database configuration
   * @param {string} config.host - Database host
   * @param {number} config.port - Database port
   * @param {string} config.user - Database user
   * @param {string} config.password - Database password
   * @param {string} config.database - Database name
   */
  constructor(config) {
    this.pool = new pg.Pool({
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    });
  }

  /**
   * Tests the database connection
   * @returns {Promise<boolean>} True if connection successful
   * @throws {Error} If connection fails
   */
  async connect() {
    try {
      await this.pool.query('SELECT NOW()');
      return true;
    } catch (err) {
      throw new Error(`PostgreSQL connection failed: ${err.message}`);
    }
  }

  /**
   * Creates the migrations tracking table if it doesn't exist
   * @param {string} tableName - Name of the migrations table
   * @throws {Error} If table creation fails
   */
  async createMigrationsTable(tableName) {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) UNIQUE NOT NULL,
        executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  /**
   * Retrieves all executed migrations in chronological order
   * @param {string} tableName - Name of the migrations table
   * @returns {Promise<string[]>} Array of migration names
   * @throws {Error} If query fails
   */
  async getMigrations(tableName) {
    const result = await this.pool.query(
      `SELECT name FROM ${tableName} ORDER BY executed_at ASC`
    );
    return result.rows.map(row => row.name);
  }

  /**
   * Records a successfully executed migration
   * @param {string} tableName - Name of the migrations table
   * @param {string} name - Migration filename
   * @throws {Error} If insert fails
   */
  async recordMigration(tableName, name) {
    await this.pool.query(
      `INSERT INTO ${tableName} (name) VALUES ($1)`,
      [name]
    );
  }

  /**
   * Removes a migration record (used during rollback)
   * @param {string} tableName - Name of the migrations table
   * @param {string} name - Migration filename
   * @throws {Error} If delete fails
   */
  async removeMigration(tableName, name) {
    await this.pool.query(
      `DELETE FROM ${tableName} WHERE name = $1`,
      [name]
    );
  }

  /**
   * Executes raw SQL (used by migrations)
   * @param {string} sql - SQL statement to execute
   * @throws {Error} If execution fails
   */
  async execute(sql) {
    await this.pool.query(sql);
  }

  /**
   * Closes the database connection pool
   * @throws {Error} If closing fails
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}