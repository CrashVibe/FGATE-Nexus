import { onebotInstance } from './OnebotManager';
import { createBot } from 'philia-onebot';
import type { Bot } from 'philia-onebot/types/common';
import type { GroupMessageEvent, LifecycleMetaEvent, PrivateMessageEvent } from 'philia-onebot/types/events.js';
import type { WsReverseConfig } from 'philia-onebot/ws-reverse/server.js';
import type { WsConfig } from 'philia-onebot/ws/client.js';

/**
 * OneBot 连接配置
 */
interface OnebotConfig {
    /** 适配器ID */
    adapterId: number;
    /** 是否自动重连 */
    autoReconnect: boolean;
    /** Onebot 配置 */
    WsConfig: WsConfig | WsReverseConfig;
}

/**
 * 连接状态
 */
interface ConnectionState {
    /** Bot 实例 */
    botInstance: Bot;
    /** 连接配置 */
    config: OnebotConfig;
    /** 是否已认证（连接无需认证） */
    isAuthenticated: boolean;
}

/**
 * OneBot 连接客户端
 */
class OnebotClient {
    private static instance: OnebotClient;
    private connections = new Map<number, ConnectionState>();
    private reconnectTimers = new Map<number, NodeJS.Timeout>();

    private constructor() {}

    /**
     * 获取单例实例
     * @returns OnebotClient 实例
     */
    public static getInstance(): OnebotClient {
        if (!OnebotClient.instance) {
            OnebotClient.instance = new OnebotClient();
        }
        return OnebotClient.instance;
    }


    /**
     * 创建连接
     * @param config 连接配置
     * @returns 连接是否成功建立
     */
    async createConnection(config: OnebotConfig): Promise<boolean> {
        if (this.connections.has(config.adapterId)) {
            this.disconnect(config.adapterId);
        }

        const botInstance = createBot(config.WsConfig);

        botInstance.init();
        const success = await this.waitForConnection(botInstance, config);
        if (success) {
            const connectionState: ConnectionState = { botInstance: botInstance, config, isAuthenticated: false };
            this.connections.set(config.adapterId, connectionState);
            this.setupWebSocketHandlers(connectionState);
            console.log(`OneBot 连接已建立: ${config.WsConfig.host} (适配器: ${config.adapterId})`);
        }
        console.log(`OneBot 连接已建立: ${config.WsConfig.host} (适配器: ${config.adapterId})`);
        return success;
    }

    /**
     * 等待连接建立
     */
    private waitForConnection(botInstance: Bot, config: OnebotConfig): Promise<boolean> {
        return new Promise((resolve) => {
            botInstance.on('meta_event.lifecycle.connect', () => {
                const connectionState = this.connections.get(config.adapterId);
                if (connectionState) {
                    connectionState.isAuthenticated = true;
                }
                resolve(true);
            });
        });
    }

    /**
     * 设置 WebSocket 事件处理器
     * @param connectionState 连接状态
     */
    private setupWebSocketHandlers(connectionState: ConnectionState): void {
        const { botInstance } = connectionState;

        botInstance.on('message.group', async (event: GroupMessageEvent) => {
            onebotInstance.handleBotMessage(connectionState.config.adapterId, event);
        });

        botInstance.on('message.private', async (event: PrivateMessageEvent) => {
            onebotInstance.handleBotMessage(connectionState.config.adapterId, event);
        });

        botInstance.on('meta_event.lifecycle.disable', async (_event: LifecycleMetaEvent) => {
            await this.handleDisconnection(connectionState);
        });
    }

    /**
     * 处理连接断开
     */
    private async handleDisconnection(connectionState: ConnectionState): Promise<void> {
        console.log(`OneBot 连接断开: ${connectionState.config.WsConfig.host} (适配器: ${connectionState.config.adapterId})`);

        this.connections.delete(connectionState.config.adapterId);

        if (connectionState.config.autoReconnect) {
            this.scheduleReconnect(connectionState.config);
        }
    }

    /**
     * 安排重连
     * @param config 连接配置
     */
    private scheduleReconnect(config: OnebotConfig): void {
        const existingTimer = this.reconnectTimers.get(config.adapterId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            console.log(`尝试重连 OneBot 连接: ${config.WsConfig.host} (适配器: ${config.adapterId})`);
            try {
                await this.createConnection(config);
            } catch (error) {
                console.error('重连失败:', error);
            }
            this.reconnectTimers.delete(config.adapterId);
        }, 5000);

        this.reconnectTimers.set(config.adapterId, timer);
    }

    /**
     * 断开指定适配器的连接
     * @param adapterId 适配器ID
     **/
    disconnect(adapterId: number): void {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState) {
          return;
        }

        console.log(`连接已断开: 适配器 ${adapterId}`);

        // 清理定时器
        const timer = this.reconnectTimers.get(adapterId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(adapterId);
        }

        connectionState.botInstance.dispose();

        this.connections.delete(adapterId);
    }

    /**
     * 检查指定适配器的连接状态
     * @param adapterId 适配器ID
     * @returns 连接是否活跃
     */
    isConnected(adapterId: number): boolean {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState) {
            return false; // 如果没有找到连接，返回 false
        }
        return connectionState.isAuthenticated;
    }

    /**
     * 通过适配器ID发送群消息
     * @param adapterId 适配器ID
     * @param groupId 群组ID
     * @param message 要发送的消息内容
     * @returns 是否发送成功
     */
    async sendGroupMessage(adapterId: number, groupId: number, message: string): Promise<boolean> {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState || !connectionState.isAuthenticated) {
            return false;
        }

        try {
            await connectionState.botInstance.sendGroupMsg(groupId, message);
            return true;
        } catch (error) {
            console.error(`发送群消息失败 (适配器: ${adapterId}):`, error);
            return false;
        }
    }

    /**
     * 通过适配器ID发送私聊消息
     * @param adapterId 适配器ID
     * @param userId 用户ID
     * @param message 要发送的消息内容
     * @returns 是否发送成功
     */
    async sendPrivateMessage(adapterId: number, userId: number, message: string): Promise<boolean> {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState || !connectionState.isAuthenticated) {
            return false;
        }

        try {
            await connectionState.botInstance.sendPrivateMsg(userId, message);
            return true;
        } catch (error) {
            console.error(`发送私聊消息失败 (适配器: ${adapterId}):`, error);
            return false;
        }
    }

    /**
     * 发送私聊消息
     * @param adapterId 适配器ID
     * @param userId 用户ID
     * @param message 要发送的消息内容
     * @returns 是否找到连接
     */
    sendPrivateMessageSync(adapterId: number, userId: number, message: string): boolean {
        // 通过 adapterId 查找对应的连接
        const connectionState = this.connections.get(adapterId);
        if (connectionState && connectionState.isAuthenticated) {
            console.log(`连接找到适配器 ${adapterId} 的连接，发送私聊消息`);
            // 异步发送私聊消息，不等待结果
                this.sendPrivateMessage(adapterId, userId, message).catch(error => {
                    console.error(`发送私聊消息失败 (适配器: ${adapterId}):`, error);
                });
                return true;
            }

        console.warn(`连接未找到适配器 ${adapterId} 的连接`);
        return false;
    }

    /**
     * 发送群消息
     * @param adapterId 适配器ID
     * @param groupId 群组ID
     * @param message 要发送的消息内容
     * @returns 是否找到连接
     */
    sendGroupMessageSync(adapterId: number, groupId: number, message: string): boolean {
        // 通过 adapterId 查找对应的连接
        const connectionState = this.connections.get(adapterId);
        if (connectionState && connectionState.isAuthenticated) {
            console.log(`连接找到适配器 ${adapterId} 的连接，发送群消息`);
                this.sendGroupMessage(adapterId, groupId, message).catch(error => {
                    console.error(`发送群消息失败 (适配器: ${adapterId}):`, error);
                });
                return true;
            }

        console.warn(`连接未找到适配器 ${adapterId} 的连接`);
        return false;
    }

    /**
     * 通过适配器ID获取Bot连接
     * @param adapterId 适配器ID
     * @returns Bot 连接实例，如果不存在则返回 undefined
     */
    getConnection(adapterId: number): Bot | undefined {
        const connectionState = this.connections.get(adapterId);
        return connectionState?.botInstance;
    }

    /**
     * 更新连接配置
     * 如果配置发生变化，将重新建立连接
     * @param config 新的连接配置
     * @returns 更新是否成功
     */
    async updateConfig(config: OnebotConfig): Promise<boolean> {
        const connectionState = this.connections.get(config.adapterId);

        if (connectionState && this.isConfigUnchanged(connectionState.config, config)) {
            return true;
        }

        if (connectionState) {
            this.disconnect(config.adapterId);
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        return this.createConnection(config);
    }

    /**
     * 检查配置是否未发生变化
     * @param oldConfig 旧的连接配置
     * @param newConfig 新的连接配置
     * @return 是否未发生变化
     */
    private isConfigUnchanged(oldConfig: OnebotConfig, newConfig: OnebotConfig): boolean {
        const oldWsConfig = oldConfig.WsConfig as Partial<WsConfig>;
        const newWsConfig = newConfig.WsConfig as Partial<WsConfig>;
        return (
            oldConfig.WsConfig.host === newConfig.WsConfig.host &&
            oldConfig.WsConfig.port === newConfig.WsConfig.port &&
            oldConfig.autoReconnect === newConfig.autoReconnect &&
            oldWsConfig.access_token === newWsConfig.access_token
        );
    }
}

/**
 * OneBot 连接客户端单例实例
 */
export const onebotClient = OnebotClient.getInstance();

/**
 * 导出类型供外部使用
 */
export type { OnebotConfig , ConnectionState};