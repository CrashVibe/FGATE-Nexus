// server/api/adapters/[id]/forward.get.ts
import { onebotForwardClient } from '~/server/utils/adapters/onebot/OnebotForwardClient';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing adapter ID'
        });
    }

    const botId = parseInt(id, 10);
    if (isNaN(botId)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid adapter ID'
        });
    }

    try {
        const isConnected = onebotForwardClient.isConnected(botId);
        const connection = onebotForwardClient.getConnection(botId);

        return {
            success: true,
            data: {
                botId,
                connected: isConnected,
                readyState: connection?.readyState || null
            }
        };
    } catch (error) {
        console.error('获取正向连接状态失败:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to get forward connection status'
        });
    }
});
