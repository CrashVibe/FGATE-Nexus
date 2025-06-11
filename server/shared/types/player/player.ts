import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { players, playerServers, socialAccounts } from '~/server/database/schema';

export type Player = InferSelectModel<typeof players>;
export type PlayerInsert = InferInsertModel<typeof players>;

export type PlayerServer = InferSelectModel<typeof playerServers>;
export type PlayerServerInsert = InferInsertModel<typeof playerServers>;

export type SocialAccount = InferSelectModel<typeof socialAccounts>;
export type SocialAccountInsert = InferInsertModel<typeof socialAccounts>;

