#!/usr/bin/env node

/**
 * Command-line interface for node-checkpoint migration tool
 */

import { Migrator } from './index.js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CONFIG_NAME = 'migration.config.js';

/**
 * Loads the migration configuration file from the current working directory
 * @returns {Promise<Object>} Configuration object
 * @throws {Error} If config file is not found
 */
async function loadConfig() {
  try {
    const configPath = path.resolve(process.cwd(), DEFAULT_CONFIG_NAME);
    const config = await import(`file://${configPath}`);
    return config.default;
  } catch (err) {
    throw new Error(`Config file not found. Run 'checkpoint init' first.`);
  }
}

/**
 * Creates a default migration configuration file in the current directory
 * @throws {Error} If file creation fails
 */
async function scaffoldConfig() {
  const configPath = path.join(process.cwd(), DEFAULT_CONFIG_NAME);
  const template = `export default {
  database: {
    type: process.env.DB_TYPE || 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'mydb',
  },
  migrationsDir: process.env.MIGRATIONS_DIR || './migrations',
  tableName: 'schema_migrations',
};`;

  await fs.writeFile(configPath, template);
  console.log(`✓ Created ${DEFAULT_CONFIG_NAME}`);
}

/**
 * Main CLI entry point - parses command line arguments and executes commands
 */
async function main() {
  const [, , command, ...args] = process.argv;

  try {
    switch (command) {
      case 'init':
        await scaffoldConfig();
        const config = await loadConfig();
        const migrator = new Migrator(config);
        await migrator.init();
        break;

      case 'up':
      case 'down':
      case 'status': {
        const config = await loadConfig();
        const migrator = new Migrator(config);
        await migrator[command]();
        break;
      }

      case 'create': {
        if (!args[0]) {
          console.error('Usage: checkpoint create <name>');
          process.exit(1);
        }
        const config = await loadConfig();
        const migrator = new Migrator(config);
        await migrator.create(args[0]);
        break;
      }

      default:
        console.log(`
node-checkpoint - Rails-like database migration tool

Usage:
  checkpoint init           Initialize checkpoint in current directory
  checkpoint up             Run all pending migrations
  checkpoint down           Rollback the last migration
  checkpoint status         Show migration status (executed and pending)
  checkpoint create <name>  Create a new migration file

Examples:
  checkpoint init
  checkpoint create add_users_table
  checkpoint up
  checkpoint status
  checkpoint down

Environment Variables:
  DB_TYPE        Database type (postgres or mysql)
  DB_HOST        Database host (default: localhost)
  DB_PORT        Database port (default: 5432 for postgres, 3306 for mysql)
  DB_USER        Database user
  DB_PASSWORD    Database password
  DB_NAME        Database name
  MIGRATIONS_DIR Migrations directory (default: ./migrations)

For more information, visit: https://github.com/yourusername/node-checkpoint
        `);
        process.exit(command ? 1 : 0);
    }
  } catch (err) {
    console.error(`✗ Error: ${err.message}`);
    process.exit(1);
  }
}

main();