import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { WebSocketManager } from '~/server/utils/websocket-manager';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));

    if (!serverId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid server ID'
        });
    }

    try {
        const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

        if (server.length === 0) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Server not found'
            });
        }

        // 获取服务器在线状态
        let serverStatus = {
            isOnline: false,
            playerCount: 0,
            lastSeen: null,
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
            data: {
                ...server[0],
                ...serverStatus
            }
        };
    } catch (error) {
        console.error('Failed to fetch server:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
});
