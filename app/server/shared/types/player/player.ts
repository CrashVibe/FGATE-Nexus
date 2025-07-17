import type { InferSelectModel } from 'drizzle-orm';
import type { players } from '@/server/database/schema';

export type Player = InferSelectModel<typeof players>;

// 增强版玩家信息，包含服务器名字列表
export interface EnhancedPlayer extends Player {
    serverNames: string[]; // 服务器名字列表
    displayName: string; // 格式化的显示名称 "账号名称(UUID)"
    socialAccountDisplay: string; // 社交账号显示信息 "名字(UUID)" 或 "未绑定"
}
