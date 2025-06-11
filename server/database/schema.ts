import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const servers = sqliteTable('servers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique('name_idx'),
    token: text('token').notNull().unique('token_idx'),
    software: text('software'),
    version: text('version')
});

export const onebot_adapters = sqliteTable('onebot_adapters', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adapterType: text('adapter_type').notNull(),
    botId: integer('bot_id').notNull().unique('bot_id_idx'),
    accessToken: text('access_token'),
    responseTimeout: integer('response_timeout').notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true)
});

export const advancedConfigs = sqliteTable('advanced_configs', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    serverId: integer('server_id').notNull().unique('advanced_server_id_idx')
});