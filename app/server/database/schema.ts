import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { Adapter } from '../utils/adapters/core/types';

export const adapters = sqliteTable('adapters', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    type: text('type', {
        enum: [Adapter.Onebot, Adapter.Discord]
    }).notNull()
});

export const servers = sqliteTable('servers', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull().unique('name_idx'),
    token: text('token').notNull().unique('token_idx'),
    software: text('software'),
    version: text('version'),
    adapter_id: integer('adapter_id').references(() => adapters.id, { onDelete: 'set null' })
});

export const onebot_adapters = sqliteTable('onebot_adapters', {
    adapter_id: integer('adapter_id')
        .primaryKey()
        .references(() => adapters.id, { onDelete: 'cascade' }),
    accessToken: text('access_token').notNull().default(''),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    connectionType: text('connection_type', { enum: ['reverse', 'forward'] })
        .notNull()
        .default('reverse'),
    host: text('host').notNull(),
    port: integer('port').notNull(),
    autoReconnect: integer('auto_reconnect', { mode: 'boolean' }).notNull().default(true) // 正向连接自动重连
});

export const players = sqliteTable('players', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    uuid: text('uuid').notNull().unique('player_uuid_idx'),
    ip: text('ip'),
    socialAccountId: integer('social_account_id').references(() => social_accounts.id),
    servers: text('servers'),
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});

export const social_accounts = sqliteTable('social_accounts', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adapterType: text('adapter_type', { enum: [Adapter.Onebot, Adapter.Discord, 'minecraft'] }).notNull(),
    name: text('name').notNull(),
    uiuid: text('uiuid').notNull(),
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});

export const server_binding_configs = sqliteTable('server_binding_configs', {
    server_id: integer('server_id')
        .primaryKey()
        .references(() => servers.id, { onDelete: 'cascade' }),
    maxBindCount: integer('max_bind_count').notNull(),
    codeLength: integer('code_length').notNull(),
    codeMode: text('code_mode').notNull(),
    codeExpire: integer('code_expire').notNull(),
    allowUnbind: integer('allow_unbind', { mode: 'boolean' }).notNull(),
    prefix: text('prefix').notNull(),
    unbindPrefix: text('unbind_prefix').notNull(),
    forceBind: integer('force_bind', { mode: 'boolean' }).notNull(),
    kickMsg: text('kick_msg').notNull(),
    unbindKickMsg: text('unbind_kick_msg').notNull(),
    bindSuccessMsg: text('bind_success_msg').notNull(),
    bindFailMsg: text('bind_fail_msg').notNull(),
    unbindSuccessMsg: text('unbind_success_msg').notNull(),
    unbindFailMsg: text('unbind_fail_msg').notNull(),
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});

export const server_message_sync_configs = sqliteTable('server_message_sync_configs', {
    server_id: integer('server_id')
        .primaryKey()
        .references(() => servers.id, { onDelete: 'cascade' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(false),
    mcToQq: integer('mc_to_qq', { mode: 'boolean' }).notNull().default(true),
    qqToMc: integer('qq_to_mc', { mode: 'boolean' }).notNull().default(true),
    groupIds: text('group_ids').notNull().default('[]'), // JSON array of group IDs
    mcToQqTemplate: text('mc_to_qq_template').notNull().default('[{server}] {player}: {message}'),
    qqToMcTemplate: text('qq_to_mc_template').notNull().default('[QQ] {nickname}: {message}'),
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});

export const message_filter_rules = sqliteTable('message_filter_rules', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    server_id: integer('server_id')
        .notNull()
        .references(() => servers.id, { onDelete: 'cascade' }),
    keyword: text('keyword').notNull(),
    replacement: text('replacement').notNull().default(''),
    direction: text('direction', { enum: ['both', 'mcToQq', 'qqToMc'] })
        .notNull()
        .default('both'),
    matchMode: text('match_mode', { enum: ['exact', 'contains', 'regex'] })
        .notNull()
        .default('contains'),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});

export const message_queue = sqliteTable('message_queue', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    server_id: integer('server_id')
        .notNull()
        .references(() => servers.id, { onDelete: 'cascade' }),
    content: text('content').notNull(),
    direction: text('direction', { enum: ['mcToQq', 'qqToMc'] }).notNull(),
    status: text('status', { enum: ['pending', 'success', 'failed'] })
        .notNull()
        .default('pending'),
    retryCount: integer('retry_count').notNull().default(0),
    metadata: text('metadata').notNull().default('{}'), // JSON metadata (player name, group id, etc.)
    createdAt: text('created_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text('updated_at')
        .notNull()
        .default(sql`CURRENT_TIMESTAMP`)
});
