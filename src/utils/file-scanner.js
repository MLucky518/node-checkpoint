import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';

/**
 * Scans the migrations directory and returns a sorted list of migration files
 * @param {string} migrationsDir - Path to the migrations directory
 * @returns {Promise<string[]>} Sorted array of migration filenames
 * @throws {Error} If migrations directory does not exist
 */
export async function scanMigrations(migrationsDir) {
  try {
    const files = await fs.readdir(migrationsDir);
    return files.filter(file => file.endsWith('.js')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') {
      throw new Error(`Migrations directory not found: ${migrationsDir}`);
    }
    throw err;
  }
}

/**
 * Dynamically loads a migration module from the filesystem
 * @param {string} migrationsDir - Path to the migrations directory
 * @param {string} filename - Name of the migration file
 * @returns {Promise<{up: Function, down: Function}>} Migration module with up and down functions
 * @throws {Error} If migration file cannot be loaded
 */
export async function loadMigration(migrationsDir, filename) {
  const filepath = path.resolve(migrationsDir, filename);
  const fileUrl = pathToFileURL(filepath).href;
  const module = await import(fileUrl);
  return module.default || module;
}

/**
 * Generates a timestamped migration filename
 * @param {string} name - Base name for the migration
 * @returns {string} Filename in format: YYYYMMDDHHmmss_name.js
 */
export function generateMigrationFilename(name) {
  const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
  return `${timestamp}_${name}.js`;
}