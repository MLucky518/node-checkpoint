/**
 * Example migration configuration file
 * Copy this to migration.config.js and adjust values as needed
 */

export default {
  database: {
    // Database type: 'postgres' or 'mysql'
    type: process.env.DB_TYPE || 'postgres',

    // Database connection settings
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432, // 5432 for Postgres, 3306 for MySQL
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
  },

  // Directory containing migration files
  migrationsDir: process.env.MIGRATIONS_DIR || './migrations',

  // Name of the table used to track migrations
  tableName: 'schema_migrations',
};
