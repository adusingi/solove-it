import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultDbFile = path.resolve(__dirname, '..', 'data', 'demo.sqlite');
const configuredDbFile = process.env.DB_FILE
  ? path.resolve(process.cwd(), process.env.DB_FILE)
  : defaultDbFile;

fs.mkdirSync(path.dirname(configuredDbFile), { recursive: true });

export const db = new Database(configuredDbFile);
db.pragma('foreign_keys = ON');

export function initDb() {
  const schemaPath = path.resolve(__dirname, '..', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

export function nowIso() {
  return new Date().toISOString();
}
