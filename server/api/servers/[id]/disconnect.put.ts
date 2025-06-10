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
        const result = await wsManager.disconnectServer(parseInt(serverId));

        if (result.success) {
            return {
                success: true,
                message: '服务器连接已断开'
            };
        } else {
            throw createError({
                statusCode: 500,
                statusMessage: result.error || '断开连接失败'
            });
        }
    } catch (error) {
        console.error('断开服务器连接失败:', error);
        throw createError({
            statusCode: 500,
            statusMessage: '断开连接失败'
        });
    }
});
