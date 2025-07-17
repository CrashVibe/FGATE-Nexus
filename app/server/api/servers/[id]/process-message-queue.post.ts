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
        const result = await messageSyncHandler.processMessageQueue(serverId);

        return {
            success: result.success,
            message: result.message,
            data: {
                processed: result.processed,
                failed: result.failed
            }
        };
    } catch (error) {
        console.error('[API] 处理消息队列失败:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '处理消息队列失败',
            data: undefined
        };
    }
});
