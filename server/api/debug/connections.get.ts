import type { ApiResponse } from '~/server/shared/types/server/api';

export default defineEventHandler(async (): Promise<ApiResponse<unknown>> => {
    try {
        const { onebotInstance } = await import('~/server/utils/adapters/onebot/OnebotManager');
        const { onebotForwardClient } = await import('~/server/utils/adapters/onebot/OnebotForwardClient');

        const botId = 3862130847;

        return {
            success: true,
            message: '连接状态调试信息',
            data: {
                hasBot: onebotInstance.hasBot(botId),
                hasReverseConnection: onebotInstance.getBotConnection(botId) !== undefined,
                hasForwardConnection: onebotInstance.hasForwardConnection(botId),
                forwardConnections: onebotInstance.getAllForwardConnections(),
                forwardClientConnections: onebotForwardClient.getAllConnections(),
                allBotConnections: onebotInstance.getAllBotConnections()
            }
        };
    } catch (error) {
        return {
            success: false,
            message: '调试失败: ' + String(error)
        };
    }
});
