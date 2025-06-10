import { WebSocketManager } from '~/server/utils/websocket-manager';
export default defineEventHandler(async (event) => {
    const serverId = getRouterParam(event, 'id');

    if (!serverId) {
        throw createError({
            statusCode: 400,
            statusMessage: '服务器ID无效'
        });
    }

    try {
        const wsManager = WebSocketManager.getInstance();

        // 断开服务器连接
        await wsManager.disconnectServer(parseInt(serverId));

        return {
            success: true,
            message: '服务器数据已清空'
        };
    } catch (error) {
        console.error('清空服务器数据失败:', error);
        throw createError({
            statusCode: 500,
            statusMessage: '清空服务器数据失败'
        });
    }
});
