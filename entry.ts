/* eslint-disable import/first */
// 数据库初始化
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Database } from 'bun:sqlite';
import { migrate } from 'drizzle-orm/bun-sqlite/migrator';
import fs from 'node:fs';
import path from 'node:path';

const execDir = path.dirname(path.resolve(process.execPath));
process.chdir(execDir);
console.log('💼 Working directory set to', process.cwd());
import * as meta from './migrations/meta';

async function initDatabase() {
    const dbFilePath = path.resolve('./sqlite.db');
    const isNewDatabase = !fs.existsSync(dbFilePath);

    // 创建 bun:sqlite 客户端
    const client = new Database(dbFilePath);

    const db = drizzle(client);

    if (isNewDatabase) {
        console.log('🔧 数据库不存在，正在初始化...');
    } else {
        console.log('🔄 检查并执行数据库迁移...');
    }

    try {
        // 执行迁移
        await migrate(db, {
            migrationsFolder: path.resolve('./migrations')
        });

        console.log('✅ 数据库准备就绪');
    } catch (e) {
        console.error('数据库迁移失败:', e);
        process.exit(1);
    }
}

async function startApplication() {
    try {
        await initDatabase();

        await import('./.output/server/index.mjs');
    } catch (e) {
        console.error('应用启动失败:', e);
        process.exit(1);
    }
}

// 启动应用
startApplication();
