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
        const connectionStatus = await messageSyncHandler.getConnectionStatus(serverId);

        return {
            success: true,
            message: '获取连接状态成功',
            data: connectionStatus
        };
    } catch (error) {
        console.error('[API] 获取连接状态失败:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '获取连接状态失败',
            data: undefined
        };
    }
});
