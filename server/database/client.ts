import * as schema from './schema';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Initialize a Drizzle ORM database instance that works in both Bun and Node
 * environments. Bun uses `bun:sqlite` while Node falls back to `better-sqlite3`.
 * This avoids top-level await so the file can be bundled with ES2019 targets.
 */
function initDb() {
    if (typeof process.versions.bun !== 'undefined') {
        const { drizzle } = require('drizzle-orm/bun-sqlite');
        const { Database } = require('bun:sqlite');
        const sqlite = new Database('sqlite.db');
        return drizzle(sqlite, { schema });
    } else {
        const { drizzle } = require('drizzle-orm/better-sqlite3');
        const BetterSQLite3 = require('better-sqlite3');
        const sqlite = new BetterSQLite3('sqlite.db');
        return drizzle(sqlite, { schema });
    }
}

export const db = initDb();
