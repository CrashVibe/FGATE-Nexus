import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const servers = sqliteTable('servers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull().unique('name_idx'),
  token: text('token').notNull().unique('token_idx'),
  software: text('software'),
  version: text('version'),
  adapter_id: integer('adapter_id').references(() => onebot_adapters.id, { onDelete: 'set null' }) // 新增字段，允许为null
});

export const onebot_adapters = sqliteTable('onebot_adapters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  adapterType: text('adapter_type').notNull(),
  botId: integer('bot_id').notNull().unique('bot_id_idx'),
  accessToken: text('access_token'),
  responseTimeout: integer('response_timeout').notNull(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true)
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
  adapterType: text('adapter_type').notNull(),
  name: text('name').notNull(),
  uiuid: text('uiuid').notNull(),
  createdAt: text('created_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text('updated_at')
    .notNull()
    .default(sql`CURRENT_TIMESTAMP`)
});
