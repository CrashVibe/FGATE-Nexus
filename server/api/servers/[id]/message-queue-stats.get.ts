import MessageQueueManager from '~/server/utils/messageQueueManager';

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
        const queueManager = MessageQueueManager.getInstance(serverId);
        const stats = await queueManager.getQueueStats();

        return {
            success: true,
            message: '获取消息队列统计成功',
            data: stats
        };
    } catch (error) {
        console.error('Failed to get queue stats:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '获取消息队列统计失败: ' + (error instanceof Error ? error.message : String(error)),
            data: undefined
        };
    }
});
