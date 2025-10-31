/**
 * Test configuration for node-checkpoint
 * Uses environment variables or defaults for test databases
 */

export const testConfig = {
  postgres: {
    database: {
      type: 'postgres',
      host: process.env.TEST_PG_HOST || 'localhost',
      port: parseInt(process.env.TEST_PG_PORT || '5433'), // Docker uses 5433
      user: process.env.TEST_PG_USER || 'postgres',
      password: process.env.TEST_PG_PASSWORD || 'postgres',
      database: process.env.TEST_PG_DB || 'checkpoint_test',
    },
    migrationsDir: './test/migrations/postgres',
    tableName: 'test_schema_migrations',
  },
  mysql: {
    database: {
      type: 'mysql',
      host: process.env.TEST_MYSQL_HOST || 'localhost',
      port: parseInt(process.env.TEST_MYSQL_PORT || '3307'), // Docker uses 3307
      user: process.env.TEST_MYSQL_USER || 'root',
      password: process.env.TEST_MYSQL_PASSWORD || 'password',
      database: process.env.TEST_MYSQL_DB || 'checkpoint_test',
    },
    migrationsDir: './test/migrations/mysql',
    tableName: 'test_schema_migrations',
  },
};
