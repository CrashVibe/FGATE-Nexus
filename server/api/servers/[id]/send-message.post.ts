import { messageSyncHandler } from '~/server/handlers/message/messageSyncHandler';
import { z } from 'zod';

// 请求验证模式
const MessageSchema = z.object({
    content: z.string().min(1, '消息内容不能为空'),
    sender: z.string().min(1, '发送者不能为空'),
    source: z.enum(['minecraft', 'qq']),
    groupId: z.string().optional()
});

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

        // 验证请求数据
        const validationResult = MessageSchema.safeParse(body);
        if (!validationResult.success) {
            const errors = validationResult.error.errors
                .map((err) => `${err.path.join('.')}: ${err.message}`)
                .join('；');

            event.node.res.statusCode = 400;
            return {
                success: false,
                message: `请求数据验证失败：${errors}`,
                data: undefined
            };
        }

        const { content, sender, source, groupId } = validationResult.data;

        // 处理消息
        const result = await messageSyncHandler.handleMessage({
            serverId,
            content,
            sender,
            timestamp: new Date(),
            source,
            groupId
        });

        return {
            success: result.success,
            message: result.message,
            data: {
                queued: result.queued || false
            }
        };
    } catch (error) {
        console.error('[API] 处理消息失败:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '处理消息失败',
            data: undefined
        };
    }
});
