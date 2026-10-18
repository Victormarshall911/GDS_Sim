import Database, { type Database as DatabaseType } from 'better-sqlite3';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { AIRLINE_TICKET_PREFIXES } from '../command-engine/command-config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let dbInstance: DatabaseType | null = null;

/**
 * Safe, idempotent database migrations for existing SQLite databases.
 */
export function migrateDatabase(db: DatabaseType): void {
  // 1. Ensure command_log has dialect column
  const tableCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='command_log'").get();
  if (tableCheck) {
    const columns = db.prepare("PRAGMA table_info(command_log)").all() as Array<{ name: string }>;
    const hasDialect = columns.some((col) => col.name === 'dialect');
    if (!hasDialect) {
      db.exec("ALTER TABLE command_log ADD COLUMN dialect TEXT NOT NULL DEFAULT 'sabre'");
    }
  }

  // 2. Ensure airline numeric codes match AIRLINE_TICKET_PREFIXES (single source of truth)
  const airlinesCheck = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='airlines'").get();
  if (airlinesCheck) {
    const updateStmt = db.prepare("UPDATE airlines SET numeric = ? WHERE code = ? AND numeric != ?");
    for (const prefix of Object.values(AIRLINE_TICKET_PREFIXES)) {
      updateStmt.run(prefix.numeric, prefix.code, prefix.numeric);
    }
  }
}

export function getDatabase(dbPath?: string): DatabaseType {
  if (dbInstance && !dbPath) {
    return dbInstance;
  }

  const resolvedPath = dbPath ?? path.resolve(__dirname, '../../data/sabre_sim.sqlite');
  
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  const schemaPath = fs.existsSync(path.resolve(__dirname, 'schema.sql'))
    ? path.resolve(__dirname, 'schema.sql')
    : path.resolve(__dirname, '../../src/db/schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  db.exec(schemaSql);

  // Run migrations safely and idempotently on startup
  migrateDatabase(db);

  if (!dbPath) {
    dbInstance = db;
  }

  return db;
}

export function closeDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

