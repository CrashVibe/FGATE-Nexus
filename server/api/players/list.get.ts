import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { players } from '@/server/database/schema';
import type { PlayerListResponse } from '@/server/shared/types/player/api';

export default defineEventHandler(async (): Promise<PlayerListResponse> => {
    try {
        const data = await db.select().from(players);
        return { success: true, data };
    } catch (err) {
        return { success: false, message: '获取玩家列表失败: ' + String(err) };
    }
});
