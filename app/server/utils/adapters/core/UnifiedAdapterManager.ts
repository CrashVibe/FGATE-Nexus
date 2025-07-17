// server/utils/adapters/core/UnifiedAdapterManager.ts
import type { Peer, AdapterInternal } from 'crossws';
import type { AdapterConnection } from './BaseAdapter';
import { Adapter } from './types';
import { adapterManager, type OnebotAdapterUnion } from '../adapterManager';
import { db } from '~/server/database/client';
import { onebot_adapters, servers } from '~/server/database/schema';
import { bindingManager } from '~/utils/bindingManager';
import { messageSyncHandler } from '~/server/handlers/message/messageSyncHandler';
import { eq } from 'drizzle-orm';

/**
 * 统一消息数据结构
 */
export interface UnifiedMessageData {
    // 基础信息
    messageText: string;
    senderName: string;
    adapterType: string;
    adapterId: number;
    // 消息类型
    messageType: 'private' | 'group';
    senderId: string;
    groupId?: string;

    // 原始数据（用于特定适配器的额外处理）
    rawData?: unknown;
}

/**
 * 绑定消息配置
 */
interface BindingMessageConfig {
    prefix: string;
    unbindPrefix?: string;
    unbindKickMsg?: string;
}

/**
 * 服务器信息
 */
interface ServerInfo {
    id: number;
}

/**
 * 适配器接收器接口
 * 用于各个适配器模块实现消息接收功能
 */
interface AdapterReceiver {
    /**
     * 检查是否有可用连接
     * @param adapterId 适配器 ID
     */
    hasConnection(adapterId: number): boolean;

    /**
     * 断开连接
     * @param adapterId 适配器 ID
     */
    disconnect(adapterId: number): void;

    /**
     * 发送消息
     * @param adapterId 适配器 ID
     * @param message 消息字符串
     * @param userId 用户ID
     */
    sendMessagePrivate(adapterId: number, message: string, userId: string): boolean;

    /**
     * 发送群消息
     * @param adapterId 适配器 ID
     * @param message 消息字符串
     * @param groupId 群组ID
     */
    sendMessageGroup(adapterId: number, message: string, groupId: string): boolean;
}

interface AdapterManagerMapping {
    [key: string]: {
        handleConnection: (peer: Peer<AdapterInternal>) => Promise<boolean>;
        handleMessage: (peer: Peer<AdapterInternal>, message: { text(): string }) => boolean;
        handleClose: (peer: Peer<AdapterInternal>) => void;
        getAllConnections: () => AdapterConnection[];
    };
}

class UnifiedAdapterManager {
    private static instance: UnifiedAdapterManager;
    private adapterManagers: AdapterManagerMapping = {};
    private adapterReceivers: Map<string, AdapterReceiver> = new Map();

    private constructor() {}

    public static getInstance(): UnifiedAdapterManager {
        if (!UnifiedAdapterManager.instance) {
            UnifiedAdapterManager.instance = new UnifiedAdapterManager();
        }
        return UnifiedAdapterManager.instance;
    }

    // 注册适配器接收器
    registerAdapterReceiver(type: string, receiver: AdapterReceiver): void {
        this.adapterReceivers.set(type, receiver);
        console.log(`适配器接收器 ${type} 已注册`);
    }

    // 注册适配器管理器
    registerAdapterManager(type: string, manager: AdapterManagerMapping[string]): void {
        this.adapterManagers[type] = manager;
        console.log(`适配器管理器 ${type} 已注册`);
    }

    // 获取适配器类型（通过检查请求头或其他方式）
    private getAdapterType(peer: Peer<AdapterInternal>): string {
        // OneBot 适配器通过 X-Self-ID 头识别
        if (peer.request.headers.get('x-self-id')) {
            return Adapter.Onebot;
        }

        // 可以添加其他适配器类型的识别逻辑
        // 例如: Discord Bot, Telegram Bot 等

        return 'unknown';
    }

    // 统一处理连接
    async handleConnection(peer: Peer<AdapterInternal>): Promise<boolean> {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (!manager) {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
            peer.close(4000, '不支持的适配器类型');
            return false;
        }

        return manager.handleConnection(peer);
    }

    // 统一处理消息
    handleMessage(peer: Peer<AdapterInternal>, message: { text(): string }): boolean {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (!manager) {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
            peer.close(4000, '不支持的适配器类型');
            return false;
        }

        return manager.handleMessage(peer, message);
    }

    // 统一处理连接关闭
    handleClose(peer: Peer<AdapterInternal>): void {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (manager) {
            manager.handleClose(peer);
        } else {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
        }
    }

    // 获取所有连接状态
    getAllConnections(): { type: string; connections: AdapterConnection[] }[] {
        const result: { type: string; connections: AdapterConnection[] }[] = [];

        for (const [type, manager] of Object.entries(this.adapterManagers)) {
            result.push({
                type,
                connections: manager.getAllConnections()
            });
        }

        return result;
    }

    // 获取特定类型的连接
    getConnectionsByType(type: string): AdapterConnection[] {
        const manager = this.adapterManagers[type];
        return manager ? manager.getAllConnections() : [];
    }

    // 获取支持的适配器类型
    getSupportedAdapterTypes(): string[] {
        return Object.keys(this.adapterManagers);
    }

    // ========== 通用消息处理 ==========

    /**
     * 处理统一消息（通用入口）
     * @param messageData 统一消息数据
     */
    async handleUnifiedMessage(messageData: UnifiedMessageData): Promise<void> {
        const receiver = this.adapterReceivers.get(messageData.adapterType);

        if (!receiver || !receiver.hasConnection(messageData.adapterId)) {
            console.warn(`[${messageData.adapterType}] 适配器 ${messageData.adapterId} 无任何可用连接`);
            return;
        }

        let adapter = undefined;
        try {
            adapter = await adapterManager.getAdapter(messageData.adapterId);
        } catch (error) {
            console.error(`检查适配器 ${messageData.adapterId} 状态失败:`, error);
            return;
        }
        if (!adapter) {
            console.warn(`适配器 ${messageData.adapterId} 不存在，停止处理消息`);
            receiver.disconnect(messageData.adapterId);
            return;
        }
        if (adapter.type !== messageData.adapterType) {
            console.warn(`适配器 ${messageData.adapterId} 的类型不匹配，停止处理消息`);
            receiver.disconnect(messageData.adapterId);
            return;
        }
        if (adapter.type === Adapter.Onebot) {
            const onebotAdapter = adapter as OnebotAdapterUnion;
            if (!onebotAdapter.detail || !onebotAdapter.detail.enabled) {
                console.warn(`适配器 ${messageData.adapterId} 已被禁用，停止处理消息`);
                receiver.disconnect(messageData.adapterId);
                return;
            }
        }

        try {
            // 处理绑定消息
            await this.handleBindingMessage(messageData);
            // 处理消息同步
            await this.handleMessageSync(messageData);
        } catch (error) {
            console.error(`处理消息时出错:`, error);
        }
    }

    // ========== 绑定消息处理 ==========

    /**
     * 处理绑定相关消息
     * @param messageData 统一消息数据
     * @param receiver 适配器接收器
     */
    private async handleBindingMessage(messageData: UnifiedMessageData): Promise<void> {
        try {
            const serverList: ServerInfo[] = await db.select().from(servers).execute();

            for (const server of serverList) {
                const configManager = BindingConfigManager.getInstance(server.id);
                const config: BindingMessageConfig | null = await configManager.getConfig();
                if (!config) {
                    continue;
                }

                const { isUnbindAttempt, isBindAttempt } = this.checkPrefix(messageData.messageText, config);
                let result: { success: boolean; message: string; playerName?: string };

                if (isUnbindAttempt) {
                    result = await bindingManager.handleUnbindMessage(
                        server.id,
                        messageData.messageText,
                        messageData.senderId
                    );
                } else if (isBindAttempt) {
                    result = await bindingManager.handleMessage(
                        server.id,
                        messageData.senderName,
                        messageData.messageText,
                        messageData.senderId
                    );
                } else {
                    continue;
                }

                await this.handleBindingResult(
                    result,
                    messageData.adapterId,
                    messageData.senderId,
                    messageData.messageType,
                    messageData.groupId,
                    server.id,
                    isUnbindAttempt
                );
                break;
            }
        } catch (error) {
            console.error(`处理绑定消息失败: ${error}`);
        }
    }

    /**
     * 检查消息前缀
     * @param messageText 消息文本
     * @param config 绑定配置
     * @returns 前缀检查结果
     */
    private checkPrefix(messageText: string, config: BindingMessageConfig) {
        return {
            isUnbindAttempt: !!config.unbindPrefix && messageText.startsWith(config.unbindPrefix),
            isBindAttempt: messageText.startsWith(config.prefix)
        };
    }

    /**
     * 处理绑定结果
     * @param result 绑定操作结果
     * @param adapterId 适配器 ID
     * @param socialAccountId 社交账号 ID
     * @param messageType 消息类型
     * @param groupId 群组 ID
     * @param serverId 服务器 ID
     * @param isUnbindAttempt 是否为解绑尝试
     */
    private async handleBindingResult(
        result: { success: boolean; message: string; playerName?: string },
        adapterId: number,
        socialAccountId: string,
        messageType: 'private' | 'group',
        groupId: string | undefined,
        serverId: number,
        isUnbindAttempt: boolean
    ) {
        await this.sendMessage(adapterId, result.message, messageType, socialAccountId, groupId);
        const action = isUnbindAttempt ? '解绑' : '绑定';

        if (result.success) {
            console.log(
                `[SUCCESS] ${action}成功: 服务器${serverId}, 社交账号${socialAccountId}, 消息类型${messageType}`
            );

            if (action === '解绑' && result.playerName) {
                try {
                    const configManager = BindingConfigManager.getInstance(serverId);
                    const config = await configManager.getConfig();

                    let kickMessage = '您的账号已被解绑';
                    if (config?.unbindKickMsg) {
                        kickMessage = config.unbindKickMsg
                            .replace('#social_account', socialAccountId)
                            .replace('#user', result.playerName);
                    }

                    const wsManager = WebSocketManager.getInstance();
                    const kickResult = await wsManager.kickPlayerByServerId(
                        serverId.toString(),
                        result.playerName,
                        kickMessage
                    );

                    if (kickResult.success) {
                        console.log(`🎮 玩家 ${result.playerName} 已从服务器 ${serverId} 踢出，原因：账号解绑`);
                    } else {
                        console.error(`踢出玩家 ${result.playerName} (服务器 ${serverId}) 失败: ${kickResult.error}`);
                    }
                } catch (kickError) {
                    console.error(`踢出玩家 ${result.playerName} (服务器 ${serverId}) 失败: ${kickError}`);
                }
            }
        } else {
            console.log(
                `[FAILED] ${action}失败: 服务器${serverId}, 社交账号${socialAccountId}, 原因: ${result.message}`
            );
        }
    }

    /**
     * 处理消息同步
     * @param messageData 统一消息数据
     */
    private async handleMessageSync(messageData: UnifiedMessageData): Promise<void> {
        try {
            // 只处理群消息和私聊消息
            if (messageData.messageType !== 'group' && messageData.messageType !== 'private') {
                return;
            }

            const groupId = messageData.groupId?.toString();

            // 查找关联的服务器
            const serverAdapters = await db
                .select({
                    serverId: servers.id,
                    serverName: servers.name,
                    adapterBotId: onebot_adapters.adapter_id
                })
                .from(servers)
                .innerJoin(onebot_adapters, eq(servers.adapter_id, onebot_adapters.adapter_id))
                .where(eq(onebot_adapters.adapter_id, messageData.adapterId));

            for (const serverAdapter of serverAdapters) {
                try {
                    console.log(
                        `[UnifiedAdapterManager] 处理消息同步: 服务器 ${serverAdapter.serverId}, 发送者: ${messageData.senderName}, 消息: ${messageData.messageText}`
                    );

                    await messageSyncHandler.handleMessage({
                        serverId: serverAdapter.serverId,
                        content: messageData.messageText,
                        sender: messageData.senderName,
                        timestamp: new Date(),
                        source: messageData.adapterType === 'onebot' ? 'qq' : 'minecraft',
                        groupId: groupId
                    });
                } catch (error) {
                    console.error(`[UnifiedAdapterManager] 消息同步失败 (服务器 ${serverAdapter.serverId}):`, error);
                }
            }
        } catch (error) {
            console.error('[UnifiedAdapterManager] 处理消息同步时发生错误:', error);
        }
    }

    // ========== 消息发送 ==========

    /**
     * 发送消息给指定用户
     * @param adapterId 适配器 ID
     * @param message 消息内容
     * @param messageType 消息类型，默认为 'private'
     * @param userId 用户 ID
     * @param groupId 群组 ID（群消息时必需）
     */
    public async sendMessage(
        adapterId: number,
        message: string,
        messageType: 'private' | 'group' = 'private',
        userId: string | undefined = undefined,
        groupId: string | undefined = undefined
    ): Promise<void> {
        try {
            // 根据 adapterId 获取适配器信息，从而确定最合适的 receiver
            const adapter = await adapterManager.getAdapter(adapterId);
            if (!adapter) {
                console.error(`适配器 ${adapterId} 不存在`);
                return;
            }

            const receiver = this.adapterReceivers.get(adapter.type);
            if (!receiver) {
                console.error(`未找到适配器类型 ${adapter.type} 的接收器`);
                return;
            }

            if (messageType === 'group') {
                if (!groupId) {
                    console.error('群消息缺少群号');
                    return;
                }
                receiver.sendMessageGroup(adapterId, message, groupId);
            } else {
                if (!userId) {
                    console.error('私聊消息缺少用户ID');
                    return;
                }
                const numericUserId = parseInt(userId, 10);
                if (isNaN(numericUserId)) {
                    console.error(`无效的用户ID: ${userId}`);
                    return;
                }
                receiver.sendMessagePrivate(adapterId, message, userId);
            }

            const targetInfo = messageType === 'group' ? `群 ${groupId}` : `用户 ${userId}`;
            console.log(`[UNIFIED] 发送消息 [${messageType}] 给${targetInfo}: ${message}`);
        } catch (error) {
            console.error(`发送消息失败: ${error}`);
        }
    }
}

export const unifiedAdapterManager = UnifiedAdapterManager.getInstance();
