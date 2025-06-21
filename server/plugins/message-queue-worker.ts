// server/plugins/message-queue-worker.ts
import MessageQueueManager from '~/server/utils/messageQueueManager';

export default defineNitroPlugin(async (_nitroApp) => {
    console.log('🔄 正在初始化消息队列Worker系统...');

    setTimeout(() => {
        try {
            MessageQueueManager.startWorker();
            console.log('✅ 消息队列Worker系统启动成功');
        } catch (error) {
            console.error('❌ 消息队列Worker系统启动失败:', error);
        }
    }, 1200);

    process.on('SIGINT', () => {
        console.log('🛑 收到退出信号，正在关闭消息队列Worker...');
        MessageQueueManager.stopWorker();
    });

    process.on('SIGTERM', () => {
        console.log('🛑 收到终止信号，正在关闭消息队列Worker...');
        MessageQueueManager.stopWorker();
    });
});
