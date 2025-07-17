import { onebotService } from '~/server/utils/adapters/onebot/OnebotService';
import { MessageSyncHandler } from '~/server/handlers/message/messageSyncHandler';

export default async function () {
    setTimeout(async () => {
        try {
            await onebotService.initialize();
            console.log('OneBot 正向连接服务初始化完成');
        } catch (error) {
            console.error('OneBot 正向连接服务初始化失败:', error);
        }

        try {
            await MessageSyncHandler.initializeGlobalRetrySystem();
            console.log('消息队列重试系统初始化完成');
        } catch (error) {
            console.error('消息队列重试系统初始化失败:', error);
        }
    }, 2000);
}
