import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

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
    serverId: integer('server_id').notNull().unique('advanced_server_id_idx') // 关联的服务器ID
    // maxPlayers 字段已移除
});
