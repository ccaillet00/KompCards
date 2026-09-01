import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';

import type { AppConfig } from '../config.js';
import * as schema from './schema.js';

export type Database = MySql2Database<typeof schema>;

let pool: mysql.Pool | undefined;
let db: Database | undefined;

/**
 * Erzeugt (lazy) den Drizzle-Client auf Basis von `DATABASE_URL`.
 * Wird nur im Laufzeitpfad aufgerufen — Unit-Tests injizieren einen Mock.
 */
export function createDb(config: AppConfig): Database {
  pool = mysql.createPool({
    uri: config.databaseUrl,
    waitForConnections: true,
    connectionLimit: 10,
    namedPlaceholders: true,
  });
  return drizzle(pool, { schema, mode: 'default' });
}

/**
 * Liefert den globalen DB-Client.
 *
 * Services greifen über `getDb()` zu, damit Tests einen Mock injizieren können
 * (kein echter DB-Zugriff in Unit-Tests).
 */
export function getDb(): Database {
  if (!db) {
    throw new Error(
      'DB-Client nicht initialisiert. Rufe initDb() auf oder injiziere einen Mock (setDb).',
    );
  }
  return db;
}

/** Initialisiert den globalen DB-Client (einmalig beim Start). */
export function initDb(config: AppConfig): Database {
  db = createDb(config);
  return db;
}

/** Injiziert einen DB-Client (für Tests). */
export function setDb(instance: Database): void {
  db = instance;
}

/** Setzt den globalen DB-Client zurück (für Tests). */
export function resetDb(): void {
  db = undefined;
  void pool?.end();
  pool = undefined;
}
