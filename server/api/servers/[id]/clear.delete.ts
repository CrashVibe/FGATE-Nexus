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

        await wsManager.disconnectServer(parseInt(serverId));

        return {
            success: true,
            message: '服务器数据已清空',
            data: undefined
        };
    } catch (error) {
        event.node.res.statusCode = 500;
        console.error('清空服务器数据失败:', error);
        return {
            success: false,
            message: '清空服务器数据失败',
            data: undefined
        };
    }
});
