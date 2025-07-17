import { WebSocketManager } from '~/server/utils/websocket-manager';

export default defineEventHandler(async (event) => {
    const serverId = getRouterParam(event, 'id');

    if (!serverId) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '服务器ID无效',
            data: undefined
        };
    }

    try {
        const wsManager = WebSocketManager.getInstance();
        const result = await wsManager.disconnectServer(parseInt(serverId));

        if (result.success) {
            return {
                success: true,
                message: '服务器连接已断开',
                data: undefined
            };
        } else {
            event.node.res.statusCode = 422;
            return {
                success: false,
                message: result.error || '断开连接失败',
                data: undefined
            };
        }
    } catch (error) {
        event.node.res.statusCode = 500;
        console.error('断开服务器连接失败:', error);
        return {
            success: false,
            message: '断开服务器连接失败',
            data: undefined
        };
    }
});
