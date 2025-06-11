import type { InferSelectModel } from 'drizzle-orm';
import type { players } from '@/server/database/schema';

export type Player = InferSelectModel<typeof players>;
