// server/utils/adapters/onebot/OnebotManager.ts
import type { Peer, AdapterInternal } from 'crossws';
import { BaseAdapterManager, type AdapterConnection } from '../core/BaseAdapter';
import { adapterManager } from '../adapterManager';
import { Adapter } from '../core/types';

interface OnebotConnection extends AdapterConnection {
    type: Adapter.Onebot;
    metadata: {
        botId: number;
    };
}

interface OnebotMessageData {
    post_type: string;
    sender?: { user_id?: number | string; nickname?: string };
    user_id?: number | string;
    raw_message?: string;
    message_type?: string;
    group_id?: number;
}

interface BindingMessageConfig {
    prefix: string;
    unbindPrefix?: string;
    unbindKickMsg?: string;
}

interface ServerInfo {
    id: number;
}

class OnebotManager extends BaseAdapterManager {
    private static instance: OnebotManager;

    private constructor() {
        super();
    }

    public static getInstance(): OnebotManager {
        if (!OnebotManager.instance) {
            OnebotManager.instance = new OnebotManager();
        }
        return OnebotManager.instance;
    }

    // 检查 OneBot 连接是否存在
    hasBot(botId: number): boolean {
        return this.hasConnection(Adapter.Onebot, botId);
    }

    // 添加 OneBot 连接
    addBotConnection(botId: number, peer: Peer<AdapterInternal>): boolean {
        const connection: OnebotConnection = {
            peer,
            adapterId: botId,
            type: Adapter.Onebot,
            connectedAt: new Date(),
            isActive: true,
            lastHeartbeat: new Date(),
            metadata: { botId }
        };

        return this.addAdapterConnection(connection);
    }

    // 移除 OneBot 连接
    removeBotConnection(botId: number): void {
        this.removeAdapterConnection(Adapter.Onebot, botId);
    }

    // 主动断开 OneBot 连接
    disconnectBot(botId: number): void {
        this.disconnectAdapter(Adapter.Onebot, botId);
    }

    // 获取 OneBot 连接信息
    getBotConnection(botId: number): OnebotConnection | undefined {
        return this.getAdapterConnection(Adapter.Onebot, botId) as OnebotConnection;
    }

    // 获取所有 OneBot 连接
    getAllBotConnections(): OnebotConnection[] {
        return this.getConnectionsByType(Adapter.Onebot) as OnebotConnection[];
    }

    // 更新 OneBot 心跳
    updateBotHeartbeat(botId: number): void {
        this.updateConnectionHeartbeat(Adapter.Onebot, botId);
    }

    // 处理 OneBot 消息
    async handleBotMessage(botId: number, message: string): Promise<void> {
        const connection = this.getBotConnection(botId);
        if (!connection) {
            console.warn(`未找到机器人 ${botId} 的连接`);
            return;
        }
        try {
            const messageData = this.safeParseJson(message);
            if (!messageData) {
                console.log(`📨 收到OneBot文本消息: ${message}`);
                return;
            }
            if (this.isSupportedMessage(messageData)) {
                await this.handleBindingMessageWrapper(messageData, botId);
            }
        } catch {
            // 捕获异常但不需要使用错误对象，保持为空的 catch
            console.log(`📨 收到OneBot文本消息: ${message}`);
        }
    }

    private safeParseJson(message: string): OnebotMessageData | null {
        try {
            return JSON.parse(message) as OnebotMessageData;
        } catch {
            return null;
        }
    }

    private isSupportedMessage(messageData: OnebotMessageData): boolean {
        return messageData.post_type === 'message' && !!messageData.sender && !!messageData.raw_message;
    }

    private async handleBindingMessageWrapper(messageData: OnebotMessageData, botId: number): Promise<void> {
        const messageText = messageData.raw_message || '';
        const senderId = messageData.sender?.user_id?.toString() || messageData.user_id?.toString();
        const messageType = messageData.message_type || 'private';
        const groupId = messageData.group_id;
        const display_name = messageData.sender?.nickname || '未知用户';
        if (!senderId || !messageText) return;
        await this.handleBindingMessage(display_name, messageText, senderId, botId, messageType, groupId);
    }

    /**
     * 处理绑定相关消息
     */
    private async handleBindingMessage(
        display_name: string,
        messageText: string,
        socialAccountId: string,
        botId: number,
        messageType: string,
        groupId?: number
    ): Promise<void> {
        try {
            const { bindingManager, db, servers, BindingConfigManager } = await this.dynamicImports();
            const serverList: ServerInfo[] = await db.select().from(servers).execute();
            for (const server of serverList) {
                const configManager = BindingConfigManager.getInstance(server.id);
                const config: BindingMessageConfig | null = await configManager.getConfig();
                if (!config) continue;
                const { isUnbindAttempt, isBindAttempt } = this.checkPrefix(messageText, config);
                let result: { success: boolean; message: string; playerName?: string };
                this.logBindingAttempt(
                    server.id,
                    socialAccountId,
                    messageType,
                    messageText,
                    config,
                    isUnbindAttempt,
                    isBindAttempt
                );

                if (isUnbindAttempt) {
                    result = await bindingManager.handleUnbindMessage(server.id, messageText, socialAccountId);
                } else if (isBindAttempt) {
                    result = await bindingManager.handleMessage(server.id, display_name, messageText, socialAccountId);
                } else {
                    continue;
                }
                await this.handleBindingResult(
                    result,
                    botId,
                    socialAccountId,
                    messageType,
                    groupId,
                    server.id,
                    isUnbindAttempt,
                    isBindAttempt,
                    config,
                    messageText
                );
                break;
            }
        } catch (error) {
            console.error(`处理绑定消息失败: ${error}`);
        }
    }

    private async dynamicImports() {
        const { bindingManager } = await import('~/utils/bindingManager');
        const { db } = await import('~/server/database/client');
        const { servers } = await import('~/server/database/schema');
        const { BindingConfigManager } = await import('~/server/utils/config/bindingConfigManager');
        return { bindingManager, db, servers, BindingConfigManager };
    }

    private checkPrefix(messageText: string, config: BindingMessageConfig) {
        return {
            isUnbindAttempt: !!config.unbindPrefix && messageText.startsWith(config.unbindPrefix),
            isBindAttempt: messageText.startsWith(config.prefix)
        };
    }

    private logBindingAttempt(
        serverId: number,
        socialAccountId: string,
        messageType: string,
        messageText: string,
        config: BindingMessageConfig,
        isUnbindAttempt: boolean,
        isBindAttempt: boolean
    ) {
        console.log(
            `处理绑定消息: 服务器${serverId}, 社交账号${socialAccountId}, 消息类型${messageType}, 内容: ${messageText}`
        );
        console.log(
            `前缀检查: 绑定前缀=${config.prefix}, 解绑前缀=${config.unbindPrefix || '未配置'}, 是否解绑=${isUnbindAttempt}, 是否绑定=${isBindAttempt}`
        );
    }

    private async handleBindingResult(
        result: { success: boolean; message: string; playerName?: string },
        botId: number,
        socialAccountId: string,
        messageType: string,
        groupId: number | undefined,
        serverId: number,
        isUnbindAttempt: boolean,
        _isBindAttempt: boolean,
        _config: BindingMessageConfig,
        _messageText: string
    ) {
        await this.sendMessage(botId, socialAccountId, result.message, messageType, groupId);
        const action = isUnbindAttempt ? '解绑' : '绑定';
        if (result.success) {
            console.log(`✅ ${action}成功: 服务器${serverId}, 社交账号${socialAccountId}, 消息类型${messageType}`);
            if (action === '解绑' && result.playerName) {
                try {
                    const { BindingConfigManager } = await this.dynamicImports();
                    const configManager = BindingConfigManager.getInstance(serverId);
                    const config = await configManager.getConfig();

                    let kickMessage = '您的账号已被解绑';
                    if (config?.unbindKickMsg) {
                        kickMessage = config.unbindKickMsg
                            .replace('#social_account', socialAccountId)
                            .replace('#user', result.playerName);
                    }

                    const { WebSocketManager } = await import('~/server/utils/websocket-manager');
                    const wsManager = WebSocketManager.getInstance();
                    const kickResult = await wsManager.kickPlayerByServerId(serverId, result.playerName, kickMessage);

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
            console.log(`❌ ${action}失败: 服务器${serverId}, 社交账号${socialAccountId}, 原因: ${result.message}`);
        }
    }

    /**
     * 发送消息给指定用户
     */
    private async sendMessage(
        botId: number,
        userId: string,
        message: string,
        messageType: string = 'private',
        groupId?: number
    ): Promise<void> {
        const connection = this.getBotConnection(botId);
        if (!connection) {
            console.warn(`未找到机器人 ${botId} 的连接`);
            return;
        }

        try {
            const action = messageType === 'group' ? 'send_group_msg' : 'send_private_msg';
            let params: { group_id?: number; user_id?: number; message: string };

            if (messageType === 'group') {
                if (!groupId) {
                    console.error('群消息缺少群号');
                    return;
                }
                params = { group_id: groupId, message };
            } else {
                const numericUserId = parseInt(userId, 10);
                if (isNaN(numericUserId)) {
                    console.error(`无效的用户ID: ${userId}`);
                    return;
                }
                params = { user_id: numericUserId, message };
            }

            const messageData = {
                action,
                params,
                echo: `binding_${Date.now()}`
            };

            connection.peer.send(JSON.stringify(messageData));

            const targetInfo = messageType === 'group' ? `群 ${groupId}` : `用户 ${userId}`;
            console.log(`📤 发送绑定消息 [${messageType}] 给${targetInfo}: ${message}`);
        } catch (error) {
            console.error(`发送消息失败: ${error}`);
        }
    }

    // OneBot 连接验证和处理 - 实现抽象方法
    async handleConnection(peer: Peer<AdapterInternal>): Promise<boolean> {
        try {
            const idHeader = peer.request.headers.get('x-self-id');
            if (!idHeader) {
                peer.close(4001, '缺少 X-Self-ID');
                return false;
            }

            const botId = Number(idHeader);
            if (isNaN(botId)) {
                peer.close(4001, 'X-Self-ID 必须是数字');
                return false;
            }
            const adapter = await adapterManager.getAdapterByBotId(botId);
            // 假设 Adapter.Onebot 是一个有效的枚举成员或常量
            if (!adapter?.detail?.enabled || adapter.type !== Adapter.Onebot) {
                peer.close(4002, '适配器不存在或未启用');
                console.error(`适配器不存在或未启用: ${botId}`);
                return false;
            }

            const authHeader = peer.request.headers.get('Authorization');
            const tokenFromConfig = (adapter.config as { accessToken?: string })?.accessToken;

            if (tokenFromConfig) {
                if (!authHeader) {
                    peer.close(4003, '缺少 Authorization 头');
                    return false;
                }
                const tokenFromHeader = authHeader.replace('Bearer ', '');
                if (tokenFromConfig !== tokenFromHeader) {
                    peer.close(4003, '令牌无效');
                    return false;
                }
            }

            if (this.hasBot(botId)) {
                peer.close(4004, '已有连接');
                return false;
            }

            const success = this.addBotConnection(botId, peer);
            if (success) {
                console.log('OneBot connection opened:', botId, peer.id);
            }
            return success;
        } catch (error) {
            console.error('OneBot connection error:', error);
            peer.close(4000, '服务器内部错误');
            return false;
        }
    }

    // OneBot 消息处理 - 实现抽象方法
    handleMessage(peer: Peer<AdapterInternal>, message: { text(): string }): boolean {
        const idHeader = peer.request.headers.get('x-self-id');
        if (!idHeader) {
            peer.close(4001, '未授权，缺少 X-Self-ID');
            return false;
        }

        const botId = Number(idHeader);
        if (!this.hasBot(botId)) {
            peer.close(4005, '未授权或连接已断开');
            return false;
        }

        this.handleBotMessage(botId, message.text()).catch((error) => {
            console.error(`处理OneBot消息时出错: ${error}`);
        });

        this.updateBotHeartbeat(botId);
        return true;
    }

    // OneBot 连接关闭处理 - 实现抽象方法
    handleClose(peer: Peer<AdapterInternal>): void {
        console.log('OneBot connection closed:', peer.id);
        const idHeader = peer.request.headers.get('x-self-id');
        if (idHeader) {
            this.removeBotConnection(Number(idHeader));
        }
    }
}

export const onebotInstance = OnebotManager.getInstance();
