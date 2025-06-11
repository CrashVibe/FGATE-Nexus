import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';

export const servers = sqliteTable('servers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique('name_idx'),
    token: text('token').notNull().unique('token_idx'),
    software: text('software'),
    version: text('version')
});

// 适配器配置表
export const onebot_adapters = sqliteTable('onebot_adapters', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adapterType: text('adapter_type').notNull(), // 适配器名称（用于识别）
    botId: integer('bot_id').notNull().unique('bot_id_idx'), // 机器人的账号
    accessToken: text('access_token'), // 访问令牌（用于验证）
    listenPath: text('listen_path').notNull(), // 服务器监听的路径
    responseTimeout: integer('response_timeout').notNull(), // 等待响应的时间（毫秒）
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true) // 是否启用
});

// 高级配置表 - 简化版本
export const advancedConfigs = sqliteTable('advanced_configs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serverId: integer('server_id')
        .notNull()
        .unique('advanced_server_id_idx'), // 关联的服务器ID
    // maxPlayers 字段已移除
});

// 玩家信息表
export const players = sqliteTable('players', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    uuid: text('uuid').notNull().unique('player_uuid_idx'),
    name: text('name').notNull(),
    ip: text('ip'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

// 玩家与服务器多对多关联表
export const playerServers = sqliteTable('player_servers', {
    playerId: integer('player_id')
        .notNull()
        .references(() => players.id, { onDelete: 'cascade' }),
    serverId: integer('server_id')
        .notNull()
        .references(() => servers.id, { onDelete: 'cascade' }),
    joinedAt: integer('joined_at', { mode: 'timestamp' })
}, (table) => ({
    pk: primaryKey({ columns: [table.playerId, table.serverId] })
}));

// 玩家社交账号表
export const socialAccounts = sqliteTable('social_accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    playerId: integer('player_id')
        .notNull()
        .references(() => players.id, { onDelete: 'cascade' }),
    adapterType: text('adapter_type').notNull(),
    name: text('name'),
    uiuid: text('uiuid').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull()
});

