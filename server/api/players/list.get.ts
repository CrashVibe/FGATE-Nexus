import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { players } from '@/server/database/schema';
import type { Player } from '~/server/shared/types/player/player';
import type { ApiResponse } from '~/server/shared/types/server/api';

export default defineEventHandler(async (): Promise<ApiResponse<Player[]>> => {
  try {
    const data = await db.select().from(players);
    return { success: true, message: '获取玩家列表成功', data };
  } catch (err) {
    return { success: false, message: '获取玩家列表失败: ' + String(err), data: undefined };
  }
});
