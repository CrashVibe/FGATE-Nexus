import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';
import { WebSocketManager } from '@/server/utils/websocket-manager';

export default defineEventHandler(async (event) => {
    try {
        const result = await db.select().from(servers);
        const wsManager = WebSocketManager.getInstance();

        // 添加在线状态信息
        const serversWithStatus = result.map((server: typeof servers.$inferSelect) => ({
            ...server,
            isOnline: wsManager.getPeerByToken(server.token)
        }));

        return {
            success: true,
            message: '获取服务器列表成功',
            data: serversWithStatus
        };
    } catch (err) {
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '获取服务器列表失败: ' + String(err),
            data: undefined
        };
    }
});
