import type { InferSelectModel } from 'drizzle-orm';
import type { social_accounts } from '@/server/database/schema';

export type SocialAccount = InferSelectModel<typeof social_accounts>;
