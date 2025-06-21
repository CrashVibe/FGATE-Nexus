import { eq, and, desc } from 'drizzle-orm';
import { db } from '../database/client';
import { message_queue } from '../database/schema';

export type MessageQueueDB = typeof message_queue.$inferSelect;

export interface QueueMessage {
    id?: string;
    serverId: number;
    direction: 'mcToQq' | 'qqToMc';
    content: string;
    metadata?: Record<string, unknown>;
    status: 'pending' | 'success' | 'failed';
    retryCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface QueueStats {
    pending: number;
    success: number;
    failed: number;
    total: number;
    lastUpdated?: string;
}

export class MessageQueueManager {
    private static instances: Map<number, MessageQueueManager> = new Map();
    private serverId: number;

    // Worker系统相关
    private static workerInterval: NodeJS.Timeout | null = null;
    private static isWorkerRunning: boolean = false;
    private static readonly WORKER_INTERVAL = 1000; // 1秒处理一次，实现近实时处理
    private static readonly MAX_RETRY_COUNT = 3;

    private constructor(serverId: number) {
        this.serverId = serverId;
    }

    static getInstance(serverId: number): MessageQueueManager {
        if (!this.instances.has(serverId)) {
            this.instances.set(serverId, new MessageQueueManager(serverId));
        }
        return this.instances.get(serverId)!;
    }

    /**
     * 启动全局消息队列Worker
     */
    static startWorker(): void {
        if (this.isWorkerRunning) {
            console.log('🔄 消息队列Worker已在运行中');
            return;
        }

        this.isWorkerRunning = true;
        this.workerInterval = setInterval(async () => {
            try {
                await this.processAllQueues();
            } catch (error) {
                console.error('❌ 消息队列Worker处理错误:', error);
            }
        }, this.WORKER_INTERVAL);

        console.log('🚀 消息队列Worker已启动，处理间隔:', this.WORKER_INTERVAL + 'ms');
    }

    /**
     * 停止全局消息队列Worker
     */
    static stopWorker(): void {
        if (this.workerInterval) {
            clearInterval(this.workerInterval);
            this.workerInterval = null;
        }
        this.isWorkerRunning = false;
        console.log('⏹️ 消息队列Worker已停止');
    }

    /**
     * 处理所有服务器的消息队列
     */
    private static async processAllQueues(): Promise<void> {
        try {
            // 获取所有有待处理消息的服务器ID
            const serverIds = await this.getActiveServerIds();

            if (serverIds.length === 0) {
                return; // 没有待处理的消息，静默返回
            }

            // 只在有消息时输出日志
            console.log(`🔄 Worker处理 ${serverIds.length} 个服务器的消息队列`);

            let totalProcessed = 0;
            let totalFailed = 0;

            // 并行处理多个服务器的队列
            const promises = serverIds.map(async (serverId) => {
                const manager = this.getInstance(serverId);
                const result = await manager.processQueueAdvanced();
                totalProcessed += result.processed;
                totalFailed += result.failed;
                return result;
            });

            await Promise.allSettled(promises);

            // 只在有处理结果时输出日志
            if (totalProcessed > 0 || totalFailed > 0) {
                console.log(`✅ Worker完成: 成功=${totalProcessed}, 失败=${totalFailed}`);
            }
        } catch (error) {
            console.error('❌ 处理所有队列时发生错误:', error);
        }
    }

    /**
     * 获取有待处理消息的服务器ID列表
     */
    private static async getActiveServerIds(): Promise<number[]> {
        try {
            const result = await db
                .selectDistinct({ serverId: message_queue.server_id })
                .from(message_queue)
                .where(eq(message_queue.status, 'pending'));

            return result.map((row: { serverId: number }) => row.serverId);
        } catch (error) {
            console.error('获取活跃服务器ID失败:', error);
            return [];
        }
    }

    /**
     * 添加消息到队列
     */
    async addMessage(
        message: Omit<QueueMessage, 'id' | 'serverId' | 'status' | 'retryCount' | 'createdAt' | 'updatedAt'>
    ): Promise<QueueMessage> {
        const queueMessage: QueueMessage = {
            ...message,
            serverId: this.serverId,
            status: 'pending',
            retryCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };

        const [insertedMessage] = await db
            .insert(message_queue)
            .values({
                server_id: queueMessage.serverId,
                direction: queueMessage.direction,
                content: queueMessage.content,
                metadata: queueMessage.metadata ? JSON.stringify(queueMessage.metadata) : '{}',
                status: queueMessage.status,
                retryCount: queueMessage.retryCount,
                createdAt: queueMessage.createdAt,
                updatedAt: queueMessage.updatedAt
            })
            .returning();

        console.log(`✅ 消息已添加到队列: ID=${insertedMessage.id}, 内容="${queueMessage.content}"`);

        return {
            ...queueMessage,
            id: insertedMessage.id.toString()
        };
    }

    /**
     * 获取待处理的消息
     */
    async getPendingMessages(limit: number = 50): Promise<QueueMessage[]> {
        const result = await db
            .select()
            .from(message_queue)
            .where(and(eq(message_queue.server_id, this.serverId), eq(message_queue.status, 'pending')))
            .orderBy(desc(message_queue.createdAt))
            .limit(limit);

        return result.map((row: MessageQueueDB) => ({
            id: row.id.toString(),
            serverId: row.server_id,
            direction: row.direction as 'mcToQq' | 'qqToMc',
            content: row.content,
            metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
            status: row.status as QueueMessage['status'],
            retryCount: row.retryCount,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt
        }));
    }

    /**
     * 标记消息为处理中
     */
    async markMessageAsProcessing(messageId: string): Promise<void> {
        await db
            .update(message_queue)
            .set({
                status: 'success', // 修改为 success，因为没有 processing 状态
                updatedAt: new Date().toISOString()
            })
            .where(and(eq(message_queue.id, parseInt(messageId)), eq(message_queue.server_id, this.serverId)));
    }

    /**
     * 标记消息为已发送
     */
    async markMessageAsSent(messageId: string): Promise<void> {
        await db
            .update(message_queue)
            .set({
                status: 'success',
                updatedAt: new Date().toISOString()
            })
            .where(and(eq(message_queue.id, parseInt(messageId)), eq(message_queue.server_id, this.serverId)));
    }

    /**
     * 标记消息为失败并增加重试次数
     */
    async markMessageAsFailed(messageId: string, maxRetries: number = 3): Promise<void> {
        const message = await db
            .select()
            .from(message_queue)
            .where(and(eq(message_queue.id, parseInt(messageId)), eq(message_queue.server_id, this.serverId)))
            .limit(1);

        if (message.length > 0) {
            const newRetryCount = message[0].retryCount + 1;
            const newStatus = newRetryCount >= maxRetries ? 'failed' : 'pending';

            await db
                .update(message_queue)
                .set({
                    status: newStatus,
                    retryCount: newRetryCount,
                    updatedAt: new Date().toISOString()
                })
                .where(and(eq(message_queue.id, parseInt(messageId)), eq(message_queue.server_id, this.serverId)));
        }
    }

    /**
     * 获取队列统计信息
     */
    async getQueueStats(): Promise<QueueStats> {
        const stats = await db.select().from(message_queue).where(eq(message_queue.server_id, this.serverId));

        interface StatsAccumulator {
            pending: number;
            success: number;
            failed: number;
            total: number;
            lastUpdated?: string;
            [key: string]: number | string | undefined;
        }

        const grouped = stats.reduce(
            (acc: StatsAccumulator, message: MessageQueueDB) => {
                const currentCount = acc[message.status] as number | undefined;
                acc[message.status] = (currentCount || 0) + 1;
                acc.total++;
                if (message.updatedAt && (!acc.lastUpdated || message.updatedAt > acc.lastUpdated)) {
                    acc.lastUpdated = message.updatedAt;
                }
                return acc;
            },
            {
                pending: 0,
                success: 0,
                failed: 0,
                total: 0,
                lastUpdated: undefined as string | undefined
            }
        );

        return grouped;
    }

    /**
     * 清理已处理的消息（保留最近的消息）
     */
    async cleanupProcessedMessages(keepDays: number = 7): Promise<number> {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - keepDays);

        const result = await db
            .delete(message_queue)
            .where(and(eq(message_queue.server_id, this.serverId), eq(message_queue.status, 'success')));

        return result.rowsAffected || 0;
    }

    /**
     * 高级队列处理方法（包含重试逻辑）
     */
    async processQueueAdvanced(): Promise<{ processed: number; failed: number }> {
        const pendingMessages = await this.getPendingMessages(20); // 每次处理20条消息
        let processed = 0;
        let failed = 0;

        for (const message of pendingMessages) {
            try {
                // 重新从数据库获取最新的重试次数（防止并发更新问题）
                const latestMessage = await db
                    .select({ retryCount: message_queue.retryCount })
                    .from(message_queue)
                    .where(eq(message_queue.id, parseInt(message.id!)))
                    .get();

                const currentRetryCount = latestMessage?.retryCount || message.retryCount;

                // 检查是否超过最大重试次数
                if (currentRetryCount >= MessageQueueManager.MAX_RETRY_COUNT) {
                    await this.markMessageAsFailed(message.id!);
                    failed++;
                    console.log(
                        `❌ 消息 ${message.id} 超过最大重试次数 (${currentRetryCount}/${MessageQueueManager.MAX_RETRY_COUNT})，标记为失败`
                    );
                    continue;
                }

                await this.markMessageAsProcessing(message.id!);

                // 调用实际的消息发送逻辑
                const success = await this.sendMessage(message);

                if (success) {
                    await this.markMessageAsSent(message.id!);
                    processed++;
                    // 只在调试模式下输出详细日志
                    // console.log(`✅ 消息 ${message.id} 处理成功`);
                } else {
                    await this.incrementRetryCount(message.id!);
                    failed++;
                    console.log(
                        `⚠️ 消息 ${message.id} 处理失败，重试次数: ${currentRetryCount + 1}/${MessageQueueManager.MAX_RETRY_COUNT}`
                    );
                }
            } catch (error) {
                console.error(`❌ 处理消息 ${message.id} 时发生错误:`, error);
                await this.incrementRetryCount(message.id!);
                failed++;
            }
        }

        return { processed, failed };
    }

    /**
     * 发送消息的实际逻辑（直接发送，不经过队列）
     */
    private async sendMessage(message: QueueMessage): Promise<boolean> {
        try {
            if (message.direction === 'mcToQq') {
                // MC消息发送到QQ - 直接调用OneBot API
                return await this.sendToQQDirect(message);
            } else if (message.direction === 'qqToMc') {
                // QQ消息发送到MC - 直接调用WebSocket API
                return await this.sendToMinecraftDirect(message);
            }

            return false;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    /**
     * 直接发送消息到QQ（不经过队列）
     */
    private async sendToQQDirect(message: QueueMessage): Promise<boolean> {
        try {
            const { onebotInstance } = await import('../utils/adapters/onebot/OnebotManager');
            const { db } = await import('../database/client');
            const schema = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            // 获取服务器的适配器配置
            const server = await db.select().from(schema.servers).where(eq(schema.servers.id, message.serverId)).get();
            if (!server?.adapter_id) return false;

            const adapter = await db
                .select()
                .from(schema.onebot_adapters)
                .where(eq(schema.onebot_adapters.adapter_id, server.adapter_id))
                .get();

            if (!adapter?.enabled) return false;

            // 获取目标群组（从配置中获取）
            const { MessageSyncConfigManager } = await import('../utils/config/messageSyncConfigManager');
            const configManager = MessageSyncConfigManager.getInstance(message.serverId);
            const config = await configManager.getConfig();

            if (!config?.groupIds?.length) return false;

            // 发送到所有配置的群组
            let success = false;
            for (const groupId of config.groupIds) {
                if (!groupId) continue;

                const messageData = {
                    action: 'send_group_msg',
                    params: { group_id: parseInt(groupId), message: message.content },
                    echo: `queue_${Date.now()}`
                };

                // 尝试通过反向连接发送
                const reverseConnection = onebotInstance.getBotConnection(adapter.botId || 0);
                if (reverseConnection?.peer) {
                    reverseConnection.peer.send(JSON.stringify(messageData));
                    success = true;
                    continue;
                }

                // 尝试通过正向连接发送
                try {
                    const { onebotForwardClient } = await import('../utils/adapters/onebot/OnebotForwardClient');
                    if (onebotForwardClient.sendMessageByBotId(adapter.botId || 0, JSON.stringify(messageData))) {
                        success = true;
                    }
                } catch (e) {
                    console.warn('正向连接发送失败:', e);
                }
            }

            return success;
        } catch (error) {
            console.error('直接发送到QQ失败:', error);
            return false;
        }
    }

    /**
     * 直接发送消息到Minecraft（不经过队列）
     */
    private async sendToMinecraftDirect(message: QueueMessage): Promise<boolean> {
        try {
            const { WebSocketManager } = await import('../utils/websocket-manager');
            const wsManager = WebSocketManager.getInstance();

            // 获取服务器状态
            const serverStatus = await wsManager.getServerStatus(message.serverId);
            if (!serverStatus?.isAlive) return false;

            // 发送广播消息
            await wsManager.broadcastToServer(message.serverId.toString(), message.content);

            return true; // 假设发送成功
        } catch (error) {
            console.error('直接发送到Minecraft失败:', error);
            return false;
        }
    }

    /**
     * 增加重试次数
     */
    async incrementRetryCount(messageId: string): Promise<void> {
        try {
            // 先获取当前的重试次数
            const currentMessage = await db
                .select({ retryCount: message_queue.retryCount })
                .from(message_queue)
                .where(eq(message_queue.id, parseInt(messageId)))
                .get();

            if (currentMessage) {
                const newRetryCount = currentMessage.retryCount + 1;

                // 如果超过最大重试次数，标记为失败
                if (newRetryCount >= MessageQueueManager.MAX_RETRY_COUNT) {
                    await db
                        .update(message_queue)
                        .set({
                            retryCount: newRetryCount,
                            status: 'failed',
                            updatedAt: new Date().toISOString()
                        })
                        .where(eq(message_queue.id, parseInt(messageId)));
                    console.log(
                        `❌ 消息 ${messageId} 达到最大重试次数 ${MessageQueueManager.MAX_RETRY_COUNT}，标记为失败`
                    );
                } else {
                    await db
                        .update(message_queue)
                        .set({
                            retryCount: newRetryCount,
                            status: 'pending',
                            updatedAt: new Date().toISOString()
                        })
                        .where(eq(message_queue.id, parseInt(messageId)));
                }
            }
        } catch (error) {
            console.error('增加重试次数失败:', error);
        }
    }
}

export default MessageQueueManager;
