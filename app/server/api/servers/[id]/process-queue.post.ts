/**
 * 手动处理消息队列的API端点
 */

import { messageSyncHandler } from '~/server/handlers/message/messageSyncHandler';

export default defineEventHandler(async (event) => {
    try {
        const serverId = parseInt(getRouterParam(event, 'id') as string);

        if (isNaN(serverId)) {
            event.node.res.statusCode = 400;
            return {
                success: false,
                message: '无效的服务器ID'
            };
        }

        console.log(`[API] 手动处理服务器 ${serverId} 的消息队列`);

        // 处理消息队列
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
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
});
