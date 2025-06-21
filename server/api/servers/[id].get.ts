import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { WebSocketManager } from '~/server/utils/websocket-manager';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));

    if (!serverId || isNaN(serverId) || serverId <= 0) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: 'Invalid server ID: ID must be a positive number',
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
            if (!status) {
                console.warn('No status found for server:', serverId);
                // 使用默认状态，不抛出错误
                return {
                    success: true,
                    message: '获取服务器信息成功，但未找到在线状态',
                    data: {
                        ...server[0],
                        ...serverStatus
                    }
                };
            }
            serverStatus = {
                isOnline: status.isAlive || false,
                playerCount: status.playerCount || 0,
                lastSeen: status.lastPing ? new Date(status.lastPing) : null,
                supportsRcon: status.serverInfo?.supports_rcon || false,
                software: status.serverInfo?.server_type || server[0].software || 'Unknown',
                version: status.serverInfo?.minecraft_version || server[0].version || 'Unknown'
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
