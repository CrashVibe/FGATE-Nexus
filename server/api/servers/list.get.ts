import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';
import type { InferSelectModel } from 'drizzle-orm';
import { WebSocketManager } from '@/server/utils/websocket-manager';

export default defineEventHandler(async () => {
    try {
        const result = await db.select().from(servers);
        const wsManager = WebSocketManager.getInstance();

        // 添加在线状态信息
        const serversWithStatus = result.map((server: InferSelectModel<typeof servers>) => ({
            ...server,
            isOnline: wsManager.getPeerByToken(server.token)
        }));

        return {
            success: true,
            data: serversWithStatus
        };
    } catch (err) {
        return {
            success: false,
            message: '获取服务器列表失败: ' + String(err)
        };
    }
});
