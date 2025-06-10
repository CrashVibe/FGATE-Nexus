import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { onebot_adapters } from '~/server/database/schema';

export type onebot_adapters = InferSelectModel<typeof onebot_adapters> & { connected?: boolean };
export type onebot_adaptersInsert = InferInsertModel<typeof onebot_adapters>;
