import { MessageSyncConfigManager } from '~/server/utils/config/messageSyncConfigManager';
import MessageQueueManager from '~/server/utils/messageQueueManager';
import type { MessageSyncConfig } from '~/server/shared/types/messageSync';
import { WebSocketManager } from '~/server/utils/websocket-manager';
import { onebotInstance } from '~/server/utils/adapters/onebot/OnebotManager';
import { db } from '~/server/database/client';
import { servers, onebot_adapters as onebotAdaptersTable } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { templateProcessor } from '~/server/utils/templateProcessor';

export interface MessageContext {
    serverId: number;
    content: string;
    sender: string;
    timestamp: Date;
    source: 'minecraft' | 'qq';
    groupId?: string; // QQ群ID，MC消息时为空
}

export interface QueueMessage {
    id?: string;
    content: string;
    direction: 'mcToQq' | 'qqToMc';
    status: string;
    retryCount: number;
    createdAt: string;
    metadata?: {
        player?: string;
        groupId?: string;
        originalMessage?: string;
    };
}

export interface ConnectionStatus {
    minecraft: {
        connected: boolean;
        lastSeen: Date | string | null;
        playerCount: number;
    };
    onebot: {
        connected: boolean;
        lastSeen: Date | string | null;
        groupCount: number;
    };
}

export class MessageSyncHandler {
    private static instance: MessageSyncHandler;
    private connectionStatus: Map<number, ConnectionStatus> = new Map();

    // 重试队列管理
    private retryTimers: Map<string, NodeJS.Timeout> = new Map();
    private readonly MAX_RETRIES = 3;
    private readonly RETRY_DELAYS = [2000, 5000, 15000]; // 2秒、5秒、15秒

    private constructor() {}

    /**
     * 获取服务器信息 - 通用方法
     */
    private async getServerInfo(serverId: number) {
        const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
        if (!server) {
            throw new Error(`服务器 ${serverId} 不存在`);
        }
        return server;
    }

    /**
     * 获取适配器信息 - 通用方法
     */
    private async getAdapterInfo(adapterId: number) {
        return await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, adapterId)).get();
    }

    /**
     * 验证消息同步配置
     */
    private async validateMessageSyncConfig(serverId: number, source: 'minecraft' | 'qq') {
        const messageSyncManager = MessageSyncConfigManager.getInstance(serverId);
        const config = await messageSyncManager.getConfig();

        if (!config || !config.enabled) {
            return { valid: false, error: '消息互通未启用', config: null };
        }

        const shouldForward = this.shouldForwardMessage(config, source);
        if (!shouldForward) {
            return {
                valid: false,
                error: `${source === 'minecraft' ? 'MC → QQ' : 'QQ → MC'} 消息转发未启用`,
                config: null
            };
        }

        return { valid: true, error: null, config };
    }

    static getInstance(): MessageSyncHandler {
        if (!this.instance) {
            this.instance = new MessageSyncHandler();
        }
        return this.instance;
    }

    /**
     * 处理传入消息
     */
    async handleMessage(context: MessageContext): Promise<{
        success: boolean;
        message: string;
        queued?: boolean;
    }> {
        try {
            // 验证配置
            const { valid, error, config } = await this.validateMessageSyncConfig(context.serverId, context.source);
            if (!valid) {
                return { success: false, message: error! };
            }

            // 过滤和格式化消息
            const processedMessage = await this.processMessage(config!, context);
            if (!processedMessage) {
                return { success: false, message: '消息被过滤规则拦截' };
            }

            // 添加到消息队列
            await this.queueMessage(context, processedMessage);

            return {
                success: true,
                message: '消息已添加到队列',
                queued: true
            };
        } catch (error) {
            console.error('[MessageSyncHandler] 处理消息失败:', error);
            return { success: false, message: '消息处理失败' };
        }
    }

    /**
     * 处理消息（过滤 + 格式化）
     */
    private async processMessage(config: MessageSyncConfig, context: MessageContext): Promise<string | null> {
        const messageSyncManager = MessageSyncConfigManager.getInstance(context.serverId);

        // 过滤消息
        const filteredContent = messageSyncManager.applyFilters(
            context.content,
            context.source === 'minecraft' ? 'mcToQq' : 'qqToMc',
            config.filterRules
        );

        if (filteredContent === null) {
            return null;
        }

        // 格式化消息
        return await this.formatMessage(config, context, filteredContent);
    }

    /**
     * 添加消息到队列
     */
    private async queueMessage(context: MessageContext, formattedMessage: string): Promise<void> {
        const messageQueueManager = MessageQueueManager.getInstance(context.serverId);

        const queueMessageData = {
            content: formattedMessage,
            direction: context.source === 'minecraft' ? ('mcToQq' as const) : ('qqToMc' as const),
            metadata: {
                player: context.sender,
                groupId: context.groupId,
                originalMessage: context.content
            }
        };

        console.log(`[MessageSyncHandler] 添加消息到队列:`, {
            serverId: context.serverId,
            sender: context.sender,
            metadata: queueMessageData.metadata
        });

        await messageQueueManager.addMessage(queueMessageData);
    }

    /**
     * 检查是否应该转发消息
     */
    private shouldForwardMessage(config: MessageSyncConfig, source: 'minecraft' | 'qq'): boolean {
        if (source === 'minecraft') {
            return config.mcToQq;
        } else {
            return config.qqToMc;
        }
    }

    /**
     * 格式化消息
     */
    private async formatMessage(config: MessageSyncConfig, context: MessageContext, content: string): Promise<string> {
        const template = context.source === 'minecraft' ? config.mcToQqTemplate : config.qqToMcTemplate;
        const serverName = await this.getServerName(context.serverId);

        // 创建模板上下文
        const templateContext = templateProcessor.createMessageSyncContext({
            serverId: context.serverId,
            serverName,
            player: context.sender,
            message: content,
            timestamp: context.timestamp,
            source: context.source,
            groupId: context.groupId,
            direction: context.source === 'minecraft' ? 'mcToQq' : 'qqToMc',
            originalMessage: context.content
        });

        return templateProcessor.processTemplate(template, templateContext, {
            defaultValue: '',
            preserveUnknown: false
        });
    }

    /**
     * 获取服务器名称
     */
    private async getServerName(serverId: number): Promise<string> {
        try {
            const server = await db.select({ name: servers.name }).from(servers).where(eq(servers.id, serverId)).get();
            return server?.name || `Server-${serverId}`;
        } catch (error) {
            console.warn(`[MessageSyncHandler] 获取服务器 ${serverId} 名称失败:`, error);
            return `Server-${serverId}`;
        }
    }

    /**
     * 转发消息到目标平台
     */
    private async forwardMessage(
        context: MessageContext,
        formattedMessage: string
    ): Promise<{ success: boolean; message: string }> {
        try {
            if (context.source === 'minecraft') {
                // MC → QQ: 发送到QQ群
                return await this.sendToQQ(context.serverId, formattedMessage);
            } else {
                // QQ → MC: 发送到Minecraft
                return await this.sendToMinecraft(context.serverId, formattedMessage);
            }
        } catch (error) {
            console.error('[MessageSyncHandler] 消息转发失败:', error);
            return {
                success: false,
                message: '消息转发失败'
            };
        }
    }

    /**
     * 发送消息到QQ群
     */
    private async sendToQQ(serverId: number, message: string): Promise<{ success: boolean; message: string }> {
        try {
            const { config, adapter } = await this.getQQSendingRequirements(serverId);

            // 检查OneBot连接状态
            const onebotManager = onebotInstance;
            if (!onebotManager.hasBot(adapter.botId || 0)) {
                return { success: false, message: 'OneBot 未连接' };
            }

            return await this.sendToMultipleGroups(config.groupIds, adapter.botId || 0, message);
        } catch (error) {
            console.error('[MessageSync] 发送到QQ群失败:', error);
            return {
                success: false,
                message: `发送失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }

    /**
     * 获取QQ发送所需的配置和信息
     */
    private async getQQSendingRequirements(serverId: number) {
        // 获取配置
        const messageSyncManager = MessageSyncConfigManager.getInstance(serverId);
        const config = await messageSyncManager.getConfig();
        if (!config || !config.enabled || !config.groupIds || config.groupIds.length === 0) {
            throw new Error('未配置目标QQ群');
        }

        // 获取服务器信息
        const server = await this.getServerInfo(serverId);
        if (!server.adapter_id) {
            throw new Error('服务器未配置OneBot适配器');
        }

        // 获取适配器信息
        const adapter = await this.getAdapterInfo(server.adapter_id);
        if (!adapter || !adapter.enabled) {
            throw new Error('OneBot适配器未启用');
        }

        return { config, server, adapter };
    }

    /**
     * 发送消息到多个QQ群
     */
    private async sendToMultipleGroups(groupIds: string[], botId: number, message: string) {
        let successCount = 0;
        let failureCount = 0;
        const errors: string[] = [];

        for (const groupId of groupIds) {
            if (!groupId || groupId.trim() === '') {
              continue;
            }

            try {
                const sendResult = await this.sendOnebotGroupMessage(onebotInstance, botId, parseInt(groupId), message);

                if (sendResult) {
                    successCount++;
                    console.log(`[MessageSync] 消息已发送到QQ群 ${groupId}: ${message}`);
                } else {
                    failureCount++;
                    errors.push(`群 ${groupId}: 发送失败`);
                }
            } catch (error) {
                failureCount++;
                errors.push(`群 ${groupId}: ${error instanceof Error ? error.message : '未知错误'}`);
                console.error(`[MessageSync] 发送到QQ群 ${groupId} 失败:`, error);
            }
        }

        if (successCount > 0) {
            return {
                success: true,
                message: `消息已发送到 ${successCount} 个QQ群${failureCount > 0 ? `，失败 ${failureCount} 个` : ''}`
            };
        } else {
            return {
                success: false,
                message: `发送失败: ${errors.join('; ')}`
            };
        }
    }

    /**
     * 通过 OnebotManager 发送群消息
     */
    private async sendOnebotGroupMessage(
        onebotManager: typeof onebotInstance,
        adapterId: number,
        groupId: number,
        message: string
    ): Promise<boolean> {
        try {
            try {
                await unifiedAdapterManager.sendMessage(adapterId, message, 'group', undefined, groupId);
            } catch (forwardError) {
                console.warn('[MessageSync] 正向连接发送失败:', forwardError);
            }

            console.warn(`[MessageSync] 适配器 ${adapterId} 无可用连接发送消息到群 ${groupId}`);
            return false;
        } catch (error) {
            console.error(`[MessageSync] 发送群消息失败 (Adapter ${adapterId}, Group ${groupId}):`, error);
            return false;
        }
    }

    /**
     * 发送消息到Minecraft
     */
    private async sendToMinecraft(serverId: number, message: string): Promise<{ success: boolean; message: string }> {
        try {
            const wsManager = WebSocketManager.getInstance();

            // 检查服务器连接状态
            const serverStatus = await wsManager.getServerStatus(serverId);
            if (!serverStatus || !serverStatus.isAlive) {
                return { success: false, message: 'Minecraft 服务器未连接' };
            }

            // 发送广播消息
            const sendResult = await this.sendMinecraftBroadcast(wsManager, serverId, message);

            if (sendResult) {
                console.log(`[MessageSync] 消息已发送到Minecraft服务器 ${serverId}: ${message}`);
                return { success: true, message: '消息已发送到Minecraft' };
            } else {
                return { success: false, message: '发送到Minecraft失败' };
            }
        } catch (error) {
            console.error('[MessageSync] 发送到Minecraft失败:', error);
            return {
                success: false,
                message: `发送失败: ${error instanceof Error ? error.message : '未知错误'}`
            };
        }
    }

    /**
     * 通过 WebSocketManager 发送广播消息到 Minecraft
     */
    private async sendMinecraftBroadcast(
        wsManager: WebSocketManager,
        serverId: number,
        message: string
    ): Promise<boolean> {
        try {
            const server = await this.getServerInfo(serverId);
            const targetPeer = this.findMinecraftClient(wsManager, server.token);

            if (!targetPeer) {
                console.warn(`[MessageSync] 找不到服务器 ${serverId} 的活跃连接`);
                return false;
            }

            // 构建并发送广播消息
            const broadcastRequest = {
                jsonrpc: '2.0',
                method: 'broadcast',
                params: { message },
                id: `broadcast_${Date.now()}`
            };

            targetPeer.send(JSON.stringify(broadcastRequest));
            console.log(`[MessageSync] 广播消息已发送到Minecraft服务器 ${serverId}: ${message}`);
            return true;
        } catch (error) {
            console.error(`[MessageSync] 发送Minecraft广播失败 (Server ${serverId}):`, error);
            return false;
        }
    }

    /**
     * 查找Minecraft客户端连接
     */
    private findMinecraftClient(wsManager: WebSocketManager, serverToken: string) {
        const clients = (wsManager as unknown as { clients: Map<unknown, unknown> }).clients;
        if (!clients || typeof clients.entries !== 'function') {
            console.error('[MessageSync] WebSocketManager.clients 不可用');
            return null;
        }

        for (const [peer, client] of clients.entries()) {
            const clientInfo = client as { token: string; isAlive: boolean };
            if (clientInfo.token === serverToken && clientInfo.isAlive) {
                return peer as { send: (data: string) => void };
            }
        }
        return null;
    }

    /**
     * 更新连接状态
     */
    updateConnectionStatus(
        serverId: number,
        type: 'minecraft' | 'onebot',
        status: Partial<ConnectionStatus['minecraft'] | ConnectionStatus['onebot']>
    ): void {
        const currentStatus = this.connectionStatus.get(serverId) || {
            minecraft: { connected: false, lastSeen: null, playerCount: 0 },
            onebot: { connected: false, lastSeen: null, groupCount: 0 }
        };

        if (type === 'minecraft') {
            currentStatus.minecraft = {
                ...currentStatus.minecraft,
                ...status,
                lastSeen: status.lastSeen
                    ? status.lastSeen instanceof Date
                        ? status.lastSeen.toISOString()
                        : status.lastSeen
                    : null
            };
        } else {
            currentStatus.onebot = {
                ...currentStatus.onebot,
                ...status,
                lastSeen: status.lastSeen
                    ? status.lastSeen instanceof Date
                        ? status.lastSeen.toISOString()
                        : status.lastSeen
                    : null
            };
        }

        this.connectionStatus.set(serverId, currentStatus);
        console.log(
            `[MessageSyncHandler] Updated ${type} connection status for server ${serverId}:`,
            currentStatus[type]
        );
    } /**
     * 获取连接状态 - 从实际服务获取
     */
    async getConnectionStatus(serverId: number): Promise<ConnectionStatus> {
        try {
            // 获取服务器信息
            const server = await db.select().from(servers).where(eq(servers.id, serverId)).get();
            if (!server) {
                throw new Error(`服务器 ${serverId} 不存在`);
            }

            // 获取 Minecraft 连接状态
            const wsManager = WebSocketManager.getInstance();
            const minecraftStatus = await this.getMinecraftConnectionStatus(serverId, server.token, wsManager);

            // 获取 OneBot 连接状态
            const onebotStatus = await this.getOnebotConnectionStatus(server.adapter_id);

            const connectionStatus: ConnectionStatus = {
                minecraft: minecraftStatus,
                onebot: onebotStatus
            };

            // 缓存到内存中
            this.connectionStatus.set(serverId, connectionStatus);

            return connectionStatus;
        } catch (error) {
            console.error(`[MessageSyncHandler] 获取连接状态失败 (服务器 ${serverId}):`, error);

            // 返回缓存状态或默认状态
            const cachedStatus = this.connectionStatus.get(serverId);
            if (cachedStatus) {
                return cachedStatus;
            }

            return {
                minecraft: {
                    connected: false,
                    lastSeen: null,
                    playerCount: 0
                },
                onebot: {
                    connected: false,
                    lastSeen: null,
                    groupCount: 0
                }
            };
        }
    }

    /**
     * 获取 Minecraft 连接状态
     */
    private async getMinecraftConnectionStatus(
        serverId: number,
        serverToken: string,
        wsManager: WebSocketManager
    ): Promise<ConnectionStatus['minecraft']> {
        try {
            // 使用 WebSocketManager 的 getServerStatus 方法
            const serverStatus = await wsManager.getServerStatus(serverId);

            if (serverStatus && serverStatus.isAlive) {
                return {
                    connected: true,
                    lastSeen: new Date(serverStatus.lastPing).toISOString(),
                    playerCount: serverStatus.playerCount || 0
                };
            } else {
                return {
                    connected: false,
                    lastSeen: serverStatus?.lastPing ? new Date(serverStatus.lastPing).toISOString() : null,
                    playerCount: 0
                };
            }
        } catch (error) {
            console.error('[MessageSyncHandler] 获取 Minecraft 连接状态失败:', error);
            return {
                connected: false,
                lastSeen: null,
                playerCount: 0
            };
        }
    }

    /**
     * 获取 OneBot 连接状态
     */
    private async getOnebotConnectionStatus(adapterId: number | null): Promise<ConnectionStatus['onebot']> {
        if (!adapterId) {
            return {
                connected: false,
                lastSeen: null,
                groupCount: 0
            };
        }

        try {
            // 检查 OneBot 适配器连接状态
            const onebotManager = onebotInstance;

            // 从数据库获取适配器详细信息
            const adapter = await db
                .select()
                .from(onebotAdaptersTable)
                .where(eq(onebotAdaptersTable.adapter_id, adapterId))
                .get();

            if (!adapter || !adapter.enabled) {
                return {
                    connected: false,
                    lastSeen: null,
                    groupCount: 0
                };
            }

            // 检查连接状态
            const isConnected = onebotManager.hasBot(adapter.botId || 0);
            let lastSeen: string | null = null;

            if (isConnected) {
                lastSeen = new Date().toISOString();
            }

            return {
                connected: isConnected,
                lastSeen,
                groupCount: isConnected ? 1 : 0 // 这里可以扩展为实际的群组数量
            };
        } catch (error) {
            console.error('[MessageSyncHandler] 获取 OneBot 连接状态失败:', error);
            return {
                connected: false,
                lastSeen: null,
                groupCount: 0
            };
        }
    }

    /**
     * 处理消息队列
     */
    async processMessageQueue(serverId: number): Promise<{
        success: boolean;
        message: string;
        processed: number;
        failed: number;
    }> {
        try {
            const messageQueueManager = MessageQueueManager.getInstance(serverId);
            const stats = await messageQueueManager.getQueueStats();

            if (stats.pending === 0) {
                return {
                    success: true,
                    message: '没有待处理的消息',
                    processed: 0,
                    failed: 0
                };
            }

            console.log(`[MessageSyncHandler] 开始处理消息队列，待处理消息数量: ${stats.pending}`);

            const pendingMessages = await messageQueueManager.getPendingMessages(10);
            const { processed, failed } = await this.processPendingMessages(serverId, pendingMessages);

            const resultMessage = `处理完成，成功: ${processed}, 失败: ${failed}`;
            console.log(`[MessageSyncHandler] ${resultMessage}`);

            return { success: true, message: resultMessage, processed, failed };
        } catch (error) {
            console.error('[MessageSyncHandler] 处理消息队列失败:', error);
            return {
                success: false,
                message: '处理消息队列失败',
                processed: 0,
                failed: 0
            };
        }
    }

    /**
     * 处理待处理的消息列表
     */
    private async processPendingMessages(
        serverId: number,
        pendingMessages: QueueMessage[]
    ): Promise<{ processed: number; failed: number }> {
        let processed = 0;
        let failed = 0;

        for (const queueMessage of pendingMessages) {
            try {
                const result = await this.processSingleQueueMessage(serverId, queueMessage);
                if (result) {
                    processed++;
                } else {
                    failed++;
                }
            } catch (error) {
                console.error(`[MessageSyncHandler] 处理消息 ${queueMessage.id} 时发生错误:`, error);
                const messageQueueManager = MessageQueueManager.getInstance(serverId);
                await messageQueueManager.markMessageAsFailed(queueMessage.id!, 3);
                failed++;
            }
        }

        return { processed, failed };
    }

    /**
     * 处理单个队列消息
     */
    private async processSingleQueueMessage(serverId: number, queueMessage: QueueMessage): Promise<boolean> {
        console.log(`[MessageSyncHandler] 处理消息 ${queueMessage.id}: ${queueMessage.direction}`);

        const messageQueueManager = MessageQueueManager.getInstance(serverId);

        // 验证配置
        const source = queueMessage.direction === 'mcToQq' ? 'minecraft' : 'qq';
        const { valid, error, config } = await this.validateMessageSyncConfig(serverId, source);

        if (!valid) {
            console.log(`[MessageSyncHandler] 消息 ${queueMessage.id} 跳过: ${error}`);
            await messageQueueManager.markMessageAsFailed(queueMessage.id!, 1);
            return false;
        }

        // 重新处理消息
        const context = this.createMessageContextFromQueue(serverId, queueMessage);
        const processedMessage = await this.processMessage(config!, context);

        if (!processedMessage) {
            console.log(`[MessageSyncHandler] 消息 ${queueMessage.id} 跳过: 被过滤规则拦截`);
            await messageQueueManager.markMessageAsFailed(queueMessage.id!, 1);
            return false;
        }

        // 发送消息
        const sendResult = await this.forwardMessage(context, processedMessage);

        if (sendResult.success) {
            await messageQueueManager.markMessageAsSent(queueMessage.id!);
            console.log(`[MessageSyncHandler] 消息 ${queueMessage.id} 发送成功`);
            return true;
        } else {
            await messageQueueManager.markMessageAsFailed(queueMessage.id!, 3);
            console.log(`[MessageSyncHandler] 消息 ${queueMessage.id} 发送失败: ${sendResult.message}`);
            return false;
        }
    }

    /**
     * 从队列消息创建消息上下文
     */
    private createMessageContextFromQueue(serverId: number, queueMessage: QueueMessage): MessageContext {
        const originalMessage = (queueMessage.metadata?.originalMessage as string) || queueMessage.content;
        const originalSender = (queueMessage.metadata?.player as string) || 'Unknown';

        return {
            serverId,
            content: originalMessage,
            sender: originalSender,
            timestamp: new Date(queueMessage.createdAt),
            source: queueMessage.direction === 'mcToQq' ? 'minecraft' : 'qq',
            groupId: queueMessage.metadata?.groupId as string
        };
    }

    /**
     * 获取队列统计信息
     */
    async getQueueStats(serverId: number): Promise<{
        success: boolean;
        data?: {
            pending: number;
            success: number;
            failed: number;
            total: number;
            lastUpdated?: string;
        };
        message?: string;
    }> {
        try {
            const messageQueueManager = MessageQueueManager.getInstance(serverId);
            const stats = await messageQueueManager.getQueueStats();

            return {
                success: true,
                data: stats
            };
        } catch (error) {
            console.error('[MessageSyncHandler] 获取队列统计失败:', error);
            return {
                success: false,
                message: '获取队列统计失败'
            };
        }
    }

    /**
     * 调度消息重试
     */
    private scheduleMessageRetry(serverId: number, messageId: string, retryCount: number): void {
        const timerKey = `${serverId}-${messageId}`;

        // 清除已存在的定时器
        const existingTimer = this.retryTimers.get(timerKey);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        if (retryCount >= this.MAX_RETRIES) {
            console.log(`[MessageSyncHandler] 消息 ${messageId} 重试次数已达上限，停止重试`);
            this.retryTimers.delete(timerKey);
            return;
        }

        const delay = this.RETRY_DELAYS[retryCount] || this.RETRY_DELAYS[this.RETRY_DELAYS.length - 1];
        console.log(`[MessageSyncHandler] 调度消息 ${messageId} 第 ${retryCount + 1} 次重试，延迟 ${delay}ms`);

        const timer = setTimeout(async () => {
            await this.retryMessage(serverId, messageId, retryCount);
            this.retryTimers.delete(timerKey);
        }, delay);

        this.retryTimers.set(timerKey, timer);
    } /**
     * 重试单个消息
     */
    private async retryMessage(serverId: number, messageId: string, retryCount: number): Promise<void> {
        try {
            const messageQueueManager = MessageQueueManager.getInstance(serverId);
            const message = await this.findRetryableMessage(messageQueueManager, messageId);

            if (!message) {
                return;
            }

            console.log(`[MessageSyncHandler] 开始重试消息 ${messageId} (第 ${retryCount + 1} 次)`);

            const success = await this.attemptMessageRetry(serverId, message);
            await this.handleRetryResult(serverId, messageId, retryCount, success);
        } catch (error) {
            console.error(`[MessageSyncHandler] 重试消息 ${messageId} 时发生错误:`, error);
            await this.handleRetryError(serverId, messageId, retryCount);
        }
    }

    /**
     * 查找可重试的消息
     */
    private async findRetryableMessage(
        messageQueueManager: MessageQueueManager,
        messageId: string
    ): Promise<QueueMessage | null> {
        const pendingMessages = await messageQueueManager.getPendingMessages(100);
        const message = pendingMessages.find((m: QueueMessage) => m.id === messageId);

        if (!message || message.status !== 'pending') {
            console.log(`[MessageSyncHandler] 消息 ${messageId} 不需要重试 (状态: ${message?.status || '不存在'})`);
            return null;
        }

        return message;
    }

    /**
     * 尝试重试消息
     */
    private async attemptMessageRetry(
        serverId: number,
        message: QueueMessage
    ): Promise<{ success: boolean; message: string }> {
        // 验证配置
        const source = message.direction === 'mcToQq' ? 'minecraft' : 'qq';
        const { valid, error, config } = await this.validateMessageSyncConfig(serverId, source);

        if (!valid) {
            console.log(`[MessageSyncHandler] 消息 ${message.id} 重试跳过: ${error}`);
            return { success: false, message: error! };
        }

        // 重新处理消息
        const context = this.createMessageContextFromQueue(serverId, message);
        const processedMessage = await this.processMessage(config!, context);

        if (!processedMessage) {
            console.log(`[MessageSyncHandler] 消息 ${message.id} 重试跳过: 被过滤规则拦截`);
            return { success: false, message: '被过滤规则拦截' };
        }

        // 发送消息
        return await this.forwardMessage(context, processedMessage);
    }

    /**
     * 处理重试结果
     */
    private async handleRetryResult(
        serverId: number,
        messageId: string,
        retryCount: number,
        sendResult: { success: boolean; message: string }
    ): Promise<void> {
        const messageQueueManager = MessageQueueManager.getInstance(serverId);

        if (sendResult.success) {
            await messageQueueManager.markMessageAsSent(messageId);
            console.log(`[MessageSyncHandler] 消息 ${messageId} 重试成功`);
        } else {
            const newRetryCount = retryCount + 1;
            if (newRetryCount < this.MAX_RETRIES) {
                await messageQueueManager.markMessageAsFailed(messageId, this.MAX_RETRIES);
                this.scheduleMessageRetry(serverId, messageId, newRetryCount);
                console.log(
                    `[MessageSyncHandler] 消息 ${messageId} 重试失败: ${sendResult.message}，将进行第 ${newRetryCount + 1} 次重试`
                );
            } else {
                await messageQueueManager.markMessageAsFailed(messageId, this.MAX_RETRIES);
                console.log(`[MessageSyncHandler] 消息 ${messageId} 重试失败，已达最大重试次数: ${sendResult.message}`);
            }
        }
    }

    /**
     * 处理重试错误
     */
    private async handleRetryError(serverId: number, messageId: string, retryCount: number): Promise<void> {
        const newRetryCount = retryCount + 1;
        if (newRetryCount < this.MAX_RETRIES) {
            this.scheduleMessageRetry(serverId, messageId, newRetryCount);
        } else {
            const messageQueueManager = MessageQueueManager.getInstance(serverId);
            await messageQueueManager.markMessageAsFailed(messageId, this.MAX_RETRIES);
        }
    }

    /**
     * 清理特定服务器的重试定时器
     */
    private clearRetryTimers(serverId: number): void {
        const prefix = `${serverId}-`;
        for (const [key, timer] of this.retryTimers.entries()) {
            if (key.startsWith(prefix)) {
                clearTimeout(timer);
                this.retryTimers.delete(key);
            }
        }
    }

    /**
     * 清理所有重试定时器 (用于关闭应用时)
     */
    public clearAllRetryTimers(): void {
        for (const timer of this.retryTimers.values()) {
            clearTimeout(timer);
        }
        this.retryTimers.clear();
    }

    /**
     * 初始化实时重试系统
     * 在应用启动时恢复所有待处理的消息重试
     */
    async initializeRealtimeRetry(): Promise<void> {
        try {
            console.log('[MessageSyncHandler] 初始化实时重试系统...');

            // 获取所有服务器ID (从数据库中)
            const serverList = await db.select({ id: servers.id }).from(servers);

            for (const server of serverList) {
                const serverId = server.id;
                const messageQueueManager = MessageQueueManager.getInstance(serverId);
                const pendingMessages = await messageQueueManager.getPendingMessages(50);

                if (pendingMessages.length > 0) {
                    console.log(
                        `[MessageSyncHandler] 服务器 ${serverId} 发现 ${pendingMessages.length} 条待处理消息，启动重试`
                    );

                    for (const message of pendingMessages) {
                        // 根据已重试次数决定下次重试时间
                        const nextRetryCount = message.retryCount;
                        if (nextRetryCount < this.MAX_RETRIES) {
                            // 稍微延迟启动，避免应用启动时的负载峰值
                            const startupDelay = Math.random() * 5000; // 随机0-5秒
                            setTimeout(() => {
                                this.scheduleMessageRetry(serverId, message.id!, nextRetryCount);
                            }, startupDelay);
                        }
                    }
                }
            }

            console.log('[MessageSyncHandler] 实时重试系统初始化完成');
        } catch (error) {
            console.error('[MessageSyncHandler] 初始化实时重试系统失败:', error);
        }
    }

    /**
     * 启动实时消息处理 (在应用启动时调用)
     */
    static async initializeGlobalRetrySystem(): Promise<void> {
        const instance = MessageSyncHandler.getInstance();
        await instance.initializeRealtimeRetry();
    }
}

// 全局单例
export const messageSyncHandler = MessageSyncHandler.getInstance();
