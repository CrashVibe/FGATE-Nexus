import * as schema from './schema';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let client: any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let drizzle: any;

if (typeof Bun !== 'undefined') {
    // Bun 环境，使用 bun:sqlite
    const { Database } = await import('bun:sqlite');
    const { drizzle: drizzleBun } = await import('drizzle-orm/bun-sqlite');
    const dbFile = new Database('sqlite.db');
    client = dbFile;
    drizzle = drizzleBun;
} else {
    // 非 Bun 环境，使用 better-sqlite3
    const Database = await import('better-sqlite3');
    const { drizzle: drizzleLibsql } = await import('drizzle-orm/better-sqlite3');
    client = new Database.default('sqlite.db');
    drizzle = drizzleLibsql;
}

export const db = drizzle(client, { schema });
