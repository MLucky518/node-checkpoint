/**
 * MySQL database adapter for managing migrations
 * @module db/mysql
 */

import mysql from 'mysql2/promise';

/**
 * MySQL adapter class implementing the database adapter interface
 */
export class MysqlAdapter {
  /**
   * Creates a MySQL adapter instance
   * @param {Object} config - Database configuration
   * @param {string} config.host - Database host
   * @param {number} config.port - Database port
   * @param {string} config.user - Database user
   * @param {string} config.password - Database password
   * @param {string} config.database - Database name
   */
  constructor(config) {
    this.config = {
      host: config.host,
      port: config.port,
      user: config.user,
      password: config.password,
      database: config.database,
    };
    this.connection = null;
  }

  /**
   * Tests the database connection
   * @returns {Promise<boolean>} True if connection successful
   * @throws {Error} If connection fails
   */
  async connect() {
    try {
      this.connection = await mysql.createConnection(this.config);
      await this.connection.ping();
      return true;
    } catch (err) {
      throw new Error(`MySQL connection failed: ${err.message}`);
    }
  }

  /**
   * Creates the migrations tracking table if it doesn't exist
   * @param {string} tableName - Name of the migrations table
   * @throws {Error} If table creation fails
   */
  async createMigrationsTable(tableName) {
    await this.connection.execute(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id INT AUTO_INCREMENT PRIMARY KEY,
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
    const [rows] = await this.connection.execute(
      `SELECT name FROM ${tableName} ORDER BY executed_at ASC`
    );
    return rows.map(row => row.name);
  }

  /**
   * Records a successfully executed migration
   * @param {string} tableName - Name of the migrations table
   * @param {string} name - Migration filename
   * @throws {Error} If insert fails
   */
  async recordMigration(tableName, name) {
    await this.connection.execute(
      `INSERT INTO ${tableName} (name) VALUES (?)`,
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
    await this.connection.execute(
      `DELETE FROM ${tableName} WHERE name = ?`,
      [name]
    );
  }

  /**
   * Executes raw SQL (used by migrations)
   * @param {string} sql - SQL statement to execute
   * @throws {Error} If execution fails
   */
  async execute(sql) {
    await this.connection.execute(sql);
  }

  /**
   * Closes the database connection
   * @throws {Error} If closing fails
   */
  async close() {
    if (this.connection) {
      await this.connection.end();
    }
  }
}