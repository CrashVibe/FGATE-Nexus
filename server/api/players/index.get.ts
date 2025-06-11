import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { players, socialAccounts } from '@/server/database/schema';
import { eq } from 'drizzle-orm';
import type { PlayerWithAccounts, PlayerListResponse } from '@/server/shared/types/player/api';

export default defineEventHandler(async (): Promise<PlayerListResponse> => {
    try {
        const playerRows = await db.select().from(players);
        const result: PlayerWithAccounts[] = [];

        for (const player of playerRows) {
            const accounts = await db
                .select()
                .from(socialAccounts)
                .where(eq(socialAccounts.playerId, player.id));
            result.push({ ...player, socialAccounts: accounts });
        }

        return { success: true, data: result };
    } catch (err) {
        return { success: false, message: '获取玩家列表失败: ' + String(err) };
    }
});
