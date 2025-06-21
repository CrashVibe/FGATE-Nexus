// TODO: 需要重新设计全局状态 API 以适配数据库版本的消息队列管理器
export default defineEventHandler(async (_event) => {
    try {
        // 数据库版本的消息队列管理器不支持全局状态查询
        // 需要通过服务器ID进行查询
        return {
            success: true,
            data: {
                timestamp: new Date().toISOString(),
                message: '请使用 /api/servers/[id]/message-queue-stats 查询特定服务器的队列状态'
            }
        };
    } catch (error) {
        console.error('[FAILED] 获取消息队列状态失败:', error);
        return {
            success: false,
            error: error instanceof Error ? error.message : '未知错误'
        };
    }
});
