import type { Peer, AdapterInternal } from 'crossws';
import type { WebSocket } from 'ws';
import { BaseAdapterManager, type AdapterConnection } from '../core/BaseAdapter';
import { adapterManager } from '../adapterManager';
import { Adapter } from '../core/types';

/**
 * OneBot 连接信息接口
 */
interface OnebotConnection extends AdapterConnection {
    type: Adapter.Onebot;
    metadata: {
        botId: number;
    };
}

/**
 * 正向连接状态信息
 */
interface ForwardConnection {
    botId: number;
    ws: WebSocket;
    url: string;
    connectedAt: Date;
    lastHeartbeat: Date;
}

/**
 * OneBot 消息数据结构
 */
interface OnebotMessageData {
    post_type: string;
    sender?: { user_id?: number | string; nickname?: string };
    user_id?: number | string;
    raw_message?: string;
    message_type?: string;
    group_id?: number;
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
 * OneBot 适配器管理器
 * 负责管理 OneBot 协议的反向连接和正向连接
 */
class OnebotManager extends BaseAdapterManager {
    private static instance: OnebotManager;
    /**
     * 正向连接集合，支持每个 botId 多个连接
     */
    private forwardConnections = new Map<number, Set<ForwardConnection>>();

    private constructor() {
        super();
    }

    /**
     * 获取 OnebotManager 单例实例
     * @returns OnebotManager 实例
     */
    public static getInstance(): OnebotManager {
        if (!OnebotManager.instance) {
            OnebotManager.instance = new OnebotManager();
        }
        return OnebotManager.instance;
    }

    /**
     * 检查 OneBot 连接是否存在（包括反向和正向连接）
     * @param botId 机器人 ID
     * @returns 是否存在连接
     */
    hasBot(botId: number): boolean {
        return this.hasConnection(Adapter.Onebot, botId) || this.hasForwardConnection(botId);
    }

    /**
     * 添加 OneBot 反向连接
     * @param botId 机器人 ID
     * @param peer WebSocket 连接对象
     * @returns 是否添加成功
     */
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

    /**
     * 移除 OneBot 反向连接
     * @param botId 机器人 ID
     */
    removeBotConnection(botId: number): void {
        this.removeAdapterConnection(Adapter.Onebot, botId);
    }

    /**
     * 主动断开 OneBot 连接（包括反向和正向连接）
     * @param botId 机器人 ID
     */
    disconnectBot(botId: number): void {
        // 断开反向连接
        this.disconnectAdapter(Adapter.Onebot, botId);

        // 断开正向连接 - 统一通过 OnebotForwardClient 处理
        if (botId !== null && botId !== undefined) {
            console.log(`断开 Bot ${botId} 的连接`);
            this.disconnectForwardConnectionByBotId(botId);
        } else {
            console.log(`断开 Bot null 的连接`);
        }
    }

    /**
     * 根据机器人 ID 断开正向连接
     * @param botId 机器人 ID
     */
    private async disconnectForwardConnectionByBotId(botId: number): Promise<void> {
        try {
            const { onebotForwardClient } = await import('./OnebotForwardClient');
            const connections = onebotForwardClient.getAllConnections();

            for (const connection of connections) {
                if (connection.botId === botId) {
                    // 通过 OnebotForwardClient 断开，它会处理日志
                    onebotForwardClient.disconnect(connection.adapterId);
                    break;
                }
            }
        } catch (error) {
            console.error(`断开正向连接失败: Bot ${botId}`, error);
        }
    }

    /**
     * 根据适配器 ID 断开正向连接
     * @param adapterId 适配器 ID
     */
    async disconnectForwardConnectionByAdapterId(adapterId: number): Promise<void> {
        try {
            const { onebotForwardClient } = await import('./OnebotForwardClient');
            // OnebotForwardClient.disconnect 会处理日志，这里不需要重复日志
            onebotForwardClient.disconnect(adapterId);
        } catch (error) {
            console.error(`断开正向连接失败: 适配器 ${adapterId}`, error);
        }
    }

    /**
     * 获取 OneBot 连接信息
     * @param botId 机器人 ID
     * @returns OneBot 连接对象
     */
    getBotConnection(botId: number): OnebotConnection | undefined {
        return this.getAdapterConnection(Adapter.Onebot, botId) as OnebotConnection;
    }

    /**
     * 获取所有 OneBot 连接
     * @returns OneBot 连接数组
     */
    getAllBotConnections(): OnebotConnection[] {
        return this.getConnectionsByType(Adapter.Onebot) as OnebotConnection[];
    }

    /**
     * 更新 OneBot 心跳（包括反向和正向连接）
     * @param botId 机器人 ID
     */
    updateBotHeartbeat(botId: number): void {
        if (this.hasConnection(Adapter.Onebot, botId)) {
            this.updateConnectionHeartbeat(Adapter.Onebot, botId);
        } else if (this.hasForwardConnection(botId)) {
            this.updateForwardConnectionHeartbeat(botId);
        }
    }

    // ========== 正向连接管理方法 ==========

    /**
     * 添加正向连接
     * @param botId 机器人 ID
     * @param ws WebSocket 连接对象
     * @param url 连接 URL
     * @returns 是否添加成功
     */
    addForwardConnection(botId: number, ws: WebSocket, url: string): boolean {
        try {
            const connection: ForwardConnection = {
                botId,
                ws,
                url,
                connectedAt: new Date(),
                lastHeartbeat: new Date()
            };
            let set = this.forwardConnections.get(botId);
            if (!set) {
                set = new Set();
                this.forwardConnections.set(botId, set);
            }
            set.add(connection);
            console.log(`正向连接已添加: Bot ${botId} -> ${url}`);
            return true;
        } catch (error) {
            console.error(`添加正向连接失败: Bot ${botId}`, error);
            return false;
        }
    }

    /**
     * 移除正向连接
     * @param botId 机器人 ID
     * @param wsOrUrlOrConnection 可选，指定要移除的 ws/url/ForwardConnection，不传则移除所有
     */
    removeForwardConnection(botId: number, wsOrUrlOrConnection?: WebSocket | string | ForwardConnection): void {
        const set = this.forwardConnections.get(botId);
        if (!set) return;
        if (!wsOrUrlOrConnection) {
            this.forwardConnections.delete(botId);
            console.log(`正向连接已移除: Bot ${botId} (全部)`);
            return;
        }
        let found = false;
        for (const conn of set) {
            if (
                (typeof wsOrUrlOrConnection === 'string' && conn.url === wsOrUrlOrConnection) ||
                (typeof wsOrUrlOrConnection === 'object' &&
                    'readyState' in wsOrUrlOrConnection &&
                    conn.ws === wsOrUrlOrConnection) ||
                (typeof wsOrUrlOrConnection === 'object' && 'ws' in wsOrUrlOrConnection && conn === wsOrUrlOrConnection)
            ) {
                set.delete(conn);
                found = true;
                break;
            }
        }
        if (set.size === 0) this.forwardConnections.delete(botId);
        if (found) {
            console.log(`正向连接已移除: Bot ${botId} (部分)`);
        }
    }

    /**
     * 获取正向连接集合
     * @param botId 机器人 ID
     * @returns 正向连接 Set
     */
    getForwardConnections(botId: number): Set<ForwardConnection> | undefined {
        return this.forwardConnections.get(botId);
    }

    /**
     * 获取指定 ws/url 的正向连接
     * @param botId 机器人 ID
     * @param wsOrUrl 可选，指定 ws 或 url
     * @returns ForwardConnection 或 undefined
     */
    getForwardConnection(botId: number, wsOrUrl?: WebSocket | string): ForwardConnection | undefined {
        const set = this.forwardConnections.get(botId);
        if (!set) return undefined;
        if (!wsOrUrl) return set.values().next().value; // 默认返回第一个
        for (const conn of set) {
            if (
                (typeof wsOrUrl === 'string' && conn.url === wsOrUrl) ||
                (typeof wsOrUrl !== 'string' && conn.ws === wsOrUrl)
            ) {
                return conn;
            }
        }
        return undefined;
    }

    /**
     * 检查是否存在正向连接
     * @param botId 机器人 ID
     * @returns 是否存在正向连接
     */
    hasForwardConnection(botId: number): boolean {
        const set = this.forwardConnections.get(botId);
        return !!set && set.size > 0;
    }

    /**
     * 更新正向连接心跳
     * @param botId 机器人 ID
     * @param wsOrUrl 可选，指定 ws 或 url，仅更新对应连接
     */
    updateForwardConnectionHeartbeat(botId: number, wsOrUrl?: WebSocket | string): void {
        const set = this.forwardConnections.get(botId);
        if (!set) return;
        if (!wsOrUrl) {
            for (const conn of set) {
                conn.lastHeartbeat = new Date();
            }
        } else {
            for (const conn of set) {
                if (
                    (typeof wsOrUrl === 'string' && conn.url === wsOrUrl) ||
                    (typeof wsOrUrl !== 'string' && conn.ws === wsOrUrl)
                ) {
                    conn.lastHeartbeat = new Date();
                }
            }
        }
    }

    /**
     * 获取所有正向连接
     * @returns 所有正向连接数组
     */
    getAllForwardConnections(): ForwardConnection[] {
        const result: ForwardConnection[] = [];
        for (const set of this.forwardConnections.values()) {
            result.push(...set);
        }
        return result;
    }

    // ========== OneBot 消息处理 ==========

    /**
     * 处理 OneBot 消息
     * @param botId 机器人 ID
     * @param message 消息内容
     */
    async handleBotMessage(botId: number, message: string): Promise<void> {
        const hasReverseConnection = this.hasConnection(Adapter.Onebot, botId);
        const hasForwardConnection = this.hasForwardConnection(botId);

        if (!hasReverseConnection && !hasForwardConnection) {
            console.warn(
                `[OneBot] 机器人 ${botId} 无任何可用连接（反向连接: ${hasReverseConnection}, 正向连接: ${hasForwardConnection})`
            );
            return;
        }

        let adapter = undefined;
        try {
            adapter = await adapterManager.getAdapterByBotId(botId);
        } catch (error) {
            console.error(`检查机器人 ${botId} 适配器状态失败:`, error);
            return;
        }
        if (!adapter) {
            console.warn(`机器人 ${botId} 的适配器不存在，停止处理消息`);
            this.disconnectBot(botId);
            return;
        }
        if (adapter.type !== Adapter.Onebot) {
            console.warn(`机器人 ${botId} 的适配器类型不是 OneBot，停止处理消息`);
            this.disconnectBot(botId);
            return;
        }
        if (!adapter.detail || !adapter.detail.enabled) {
            console.warn(`机器人 ${botId} 的适配器已被禁用，停止处理消息`);
            this.disconnectBot(botId);
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
                // 处理消息同步
                await this.handleMessageSync(messageData, botId);
            }
        } catch {
            console.log(`📨 收到OneBot文本消息: ${message}`);
        }
    }

    /**
     * 安全解析 JSON 消息
     * @param message 原始消息字符串
     * @returns 解析后的消息数据或 null
     */
    private safeParseJson(message: string): OnebotMessageData | null {
        try {
            return JSON.parse(message) as OnebotMessageData;
        } catch {
            return null;
        }
    }

    /**
     * 检查是否为支持的消息类型
     * @param messageData 消息数据
     * @returns 是否为支持的消息类型
     */
    private isSupportedMessage(messageData: OnebotMessageData): boolean {
        return messageData.post_type === 'message' && !!messageData.sender && !!messageData.raw_message;
    }

    /**
     * 处理绑定消息包装器
     * @param messageData 消息数据
     * @param botId 机器人 ID
     */
    private async handleBindingMessageWrapper(messageData: OnebotMessageData, botId: number): Promise<void> {
        const messageText = messageData.raw_message || '';
        const senderId = messageData.sender?.user_id?.toString() || messageData.user_id?.toString();
        const messageType = messageData.message_type || 'private';
        const groupId = messageData.group_id;
        const display_name = messageData.sender?.nickname || '未知用户';

        if (!senderId || !messageText) return;

        // 只处理绑定相关逻辑，不添加到消息队列（由handleMessageSync统一处理）
        await this.handleBindingMessage(display_name, messageText, senderId, botId, messageType, groupId);
    }

    // ========== 绑定消息处理 ==========

    /**
     * 处理绑定相关消息
     * @param display_name 显示名称
     * @param messageText 消息文本
     * @param socialAccountId 社交账号 ID
     * @param botId 机器人 ID
     * @param messageType 消息类型
     * @param groupId 群组 ID（可选）
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

    /**
     * 动态导入依赖模块
     * @returns 导入的模块对象
     */
    private async dynamicImports() {
        const { bindingManager } = await import('~/utils/bindingManager');
        const { db } = await import('~/server/database/client');
        const { servers } = await import('~/server/database/schema');
        const { BindingConfigManager } = await import('~/server/utils/config/bindingConfigManager');
        return { bindingManager, db, servers, BindingConfigManager };
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
     * 记录绑定尝试日志
     * @param serverId 服务器 ID
     * @param socialAccountId 社交账号 ID
     * @param messageType 消息类型
     * @param messageText 消息文本
     * @param config 绑定配置
     * @param isUnbindAttempt 是否为解绑尝试
     * @param isBindAttempt 是否为绑定尝试
     */
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

    /**
     * 处理绑定结果
     * @param result 绑定操作结果
     * @param botId 机器人 ID
     * @param socialAccountId 社交账号 ID
     * @param messageType 消息类型
     * @param groupId 群组 ID
     * @param serverId 服务器 ID
     * @param isUnbindAttempt 是否为解绑尝试
     * @param _isBindAttempt 是否为绑定尝试（未使用）
     * @param _config 绑定配置（未使用）
     * @param _messageText 消息文本（未使用）
     */
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
            console.log(
                `[SUCCESS] ${action}成功: 服务器${serverId}, 社交账号${socialAccountId}, 消息类型${messageType}`
            );

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
     * @param messageData 消息数据
     * @param botId 机器人ID
     */
    private async handleMessageSync(messageData: OnebotMessageData, botId: number): Promise<void> {
        try {
            // 只处理群消息和私聊消息
            if (messageData.message_type !== 'group' && messageData.message_type !== 'private') {
                return;
            }

            // 导入消息同步处理器
            const { messageSyncHandler } = await import('~/server/handlers/message/messageSyncHandler');

            // 获取发送者昵称
            const sender = messageData.sender?.nickname || `用户${messageData.user_id}`;
            const groupId = messageData.group_id?.toString();

            // 查找使用此机器人的服务器
            const { db } = await import('~/server/database/client');
            const { servers, onebot_adapters: onebotAdaptersTable } = await import('~/server/database/schema');
            const { eq } = await import('drizzle-orm');

            // 查找关联的服务器
            const serverAdapters = await db
                .select({
                    serverId: servers.id,
                    serverName: servers.name,
                    adapterBotId: onebotAdaptersTable.botId
                })
                .from(servers)
                .innerJoin(onebotAdaptersTable, eq(servers.adapter_id, onebotAdaptersTable.adapter_id))
                .where(eq(onebotAdaptersTable.botId, botId));

            for (const serverAdapter of serverAdapters) {
                try {
                    console.log(
                        `[OnebotManager] 处理QQ消息同步: 服务器 ${serverAdapter.serverId}, 发送者: ${sender}, 消息: ${messageData.raw_message}`
                    );

                    await messageSyncHandler.handleMessage({
                        serverId: serverAdapter.serverId,
                        content: messageData.raw_message || '',
                        sender: sender,
                        timestamp: new Date(),
                        source: 'qq',
                        groupId: groupId
                    });
                } catch (error) {
                    console.error(`[OnebotManager] 消息同步失败 (服务器 ${serverAdapter.serverId}):`, error);
                }
            }
        } catch (error) {
            console.error('[OnebotManager] 处理消息同步时发生错误:', error);
        }
    }

    // ========== 消息发送 ==========

    /**
     * 发送消息给指定用户（支持正向和反向连接）
     * @param botId 机器人 ID
     * @param userId 用户 ID
     * @param message 消息内容
     * @param messageType 消息类型，默认为 'private'
     * @param groupId 群组 ID（群消息时必需）
     */
    private async sendMessage(
        botId: number,
        userId: string,
        message: string,
        messageType: string = 'private',
        groupId?: number
    ): Promise<void> {
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

            const messageJson = JSON.stringify(messageData);

            // 尝试反向连接
            const reverseConnection = this.getBotConnection(botId);
            if (reverseConnection && reverseConnection.peer) {
                reverseConnection.peer.send(messageJson);
                const targetInfo = messageType === 'group' ? `群 ${groupId}` : `用户 ${userId}`;
                console.log(`[REVERSE] 发送绑定消息 [${messageType}] 给${targetInfo}: ${message}`);
                return;
            }

            // 尝试正向连接
            const { onebotForwardClient } = await import('./OnebotForwardClient');
            const success = onebotForwardClient.sendMessageByBotId(botId, messageJson);
            if (success) {
                const targetInfo = messageType === 'group' ? `群 ${groupId}` : `用户 ${userId}`;
                console.log(`[FORWARD] 发送绑定消息 [${messageType}] 给${targetInfo}: ${message}`);
                return;
            }

            console.warn(`[OneBot] 机器人 ${botId} 无可用连接发送消息（尝试了反向和正向连接）`);
        } catch (error) {
            console.error(`发送消息失败: ${error}`);
        }
    }

    // ========== WebSocket 连接处理（实现抽象方法）==========

    /**
     * OneBot 连接验证和处理
     * @param peer WebSocket 连接对象
     * @returns 是否处理成功
     */
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

    /**
     * OneBot 消息处理
     * @param peer WebSocket 连接对象
     * @param message 消息对象
     * @returns 是否处理成功
     */
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

    /**
     * OneBot 连接关闭处理
     * @param peer WebSocket 连接对象
     */
    handleClose(peer: Peer<AdapterInternal>): void {
        console.log('OneBot connection closed:', peer.id);
        const idHeader = peer.request.headers.get('x-self-id');
        if (idHeader) {
            this.removeBotConnection(Number(idHeader));
        }
    }
}

/**
 * OneBot 管理器单例实例
 * 用于全局访问 OneBot 适配器管理功能
 */
export const onebotInstance = OnebotManager.getInstance();
