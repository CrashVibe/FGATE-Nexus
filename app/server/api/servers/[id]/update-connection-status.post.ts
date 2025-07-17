import { messageSyncHandler } from '~/server/handlers/message/messageSyncHandler';

export default defineEventHandler(async (event) => {
    const serverId = parseInt(getRouterParam(event, 'id')!);

    if (isNaN(serverId) || serverId <= 0) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '无效的服务器ID',
            data: undefined
        };
    }

    try {
        const body = await readBody(event);
        const { type, status } = body;

        if (!['minecraft', 'onebot'].includes(type)) {
            event.node.res.statusCode = 400;
            return {
                success: false,
                message: '无效的连接类型，必须是 minecraft 或 onebot',
                data: undefined
            };
        }

        // 更新连接状态
        messageSyncHandler.updateConnectionStatus(serverId, type, {
            connected: status.connected,
            lastSeen: status.lastSeen || new Date().toISOString(),
            ...(type === 'minecraft'
                ? { playerCount: status.playerCount || 0 }
                : { groupCount: status.groupCount || 0 })
        });

        return {
            success: true,
            message: '连接状态更新成功',
            data: await messageSyncHandler.getConnectionStatus(serverId)
        };
    } catch (error) {
        console.error('[API] 更新连接状态失败:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '更新连接状态失败',
            data: undefined
        };
    }
});
