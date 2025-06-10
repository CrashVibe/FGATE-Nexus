import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { servers } from '~/server/database/schema';

export type Server = InferSelectModel<typeof servers>;
export type ServerInsert = InferInsertModel<typeof servers>;
