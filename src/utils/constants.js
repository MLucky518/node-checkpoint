/**
 * Application-wide constants
 */

export const SUPPORTED_DATABASES = ['postgres', 'mysql'];

export const DEFAULT_CONFIG = {
  tableName: 'schema_migrations',
  migrationsDir: './migrations',
};

export const DATABASE_PORTS = {
  postgres: 5432,
  mysql: 3306,
};

export const VALIDATION_PATTERNS = {
  tableName: /^[a-zA-Z_][a-zA-Z0-9_]*$/,
  migrationName: /^[a-zA-Z0-9_]+$/,
};

export const ERROR_MESSAGES = {
  CONFIG_REQUIRED: 'Configuration is required',
  DATABASE_CONFIG_REQUIRED: 'Database configuration is required',
  MIGRATIONS_DIR_REQUIRED: 'Migrations directory is required',
  TABLE_NAME_REQUIRED: 'Table name is required',
  INVALID_TABLE_NAME: 'Invalid table name. Must start with a letter or underscore and contain only alphanumeric characters and underscores',
  UNSUPPORTED_DB_TYPE: (type) => `Unsupported database type: ${type}. Supported types: ${SUPPORTED_DATABASES.join(', ')}`,
  MIGRATION_NAME_REQUIRED: 'Migration name is required',
  INVALID_MIGRATION_NAME: 'Migration name can only contain letters, numbers, and underscores',
  CONFIG_NOT_FOUND: "Config file not found. Run 'checkpoint init' first.",
};
