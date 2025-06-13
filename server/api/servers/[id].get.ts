import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { WebSocketManager } from '~/server/utils/websocket-manager';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));

    if (!serverId) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: 'Invalid server ID',
            data: undefined
        };
    }

    try {
        const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

        if (server.length === 0) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: 'Server not found',
                data: undefined
            };
        }

        // 获取服务器在线状态
        let serverStatus = {
            isOnline: false,
            playerCount: 0,
            lastSeen: null as Date | null,
            supportsRcon: false,
            software: server[0].software || 'Unknown',
            version: server[0].version || 'Unknown'
        };

        try {
            const wsManager = WebSocketManager.getInstance();
            const status = await wsManager.getServerStatus(serverId);
            serverStatus = {
                isOnline: status.isOnline,
                playerCount: status.playerCount || 0,
                lastSeen: status.lastSeen,
                supportsRcon: status.supportsRcon || false,
                software: status.software || server[0].software || 'Unknown',
                version: status.version || server[0].version || 'Unknown'
            };
        } catch (statusError) {
            console.warn('Failed to fetch server status:', statusError);
            // 使用默认状态，不抛出错误
        }

        return {
            success: true,
            message: '获取服务器信息成功',
            data: {
                ...server[0],
                ...serverStatus
            }
        };
    } catch (error) {
        event.node.res.statusCode = 500;
        console.error('Failed to fetch server:', error);
        return {
            success: false,
            message: '获取服务器信息失败: ' + String(error),
            data: undefined
        };
    }
});
