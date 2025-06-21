import { WebSocket } from 'ws';
import { onebotInstance } from './OnebotManager';

/**
 * OneBot 正向连接配置
 */
interface OnebotForwardConfig {
    /** 适配器ID */
    adapterId: number;
    /** WebSocket连接URL */
    url: string;
    /** 访问令牌 */
    accessToken?: string;
    /** 是否自动重连 */
    autoReconnect?: boolean;
    /** 响应超时时间(ms) */
    responseTimeout?: number;
}

/**
 * 正向连接状态
 */
interface ForwardConnectionState {
    /** WebSocket实例 */
    ws: WebSocket;
    /** 连接配置 */
    config: OnebotForwardConfig;
    /** 机器人ID（连接后动态获取，可选） */
    botId?: number;
    /** 是否已认证（正向连接无需认证） */
    isAuthenticated: boolean;
}

/**
 * OneBot 正向连接客户端
 * 管理与 OneBot 实现的正向 WebSocket 连接
 * 使用单例模式确保全局唯一实例
 */
class OnebotForwardClient {
    private static instance: OnebotForwardClient | null;
    private connections = new Map<number, ForwardConnectionState>();
    private reconnectTimers = new Map<number, NodeJS.Timeout>();
    private heartbeatIntervals = new Map<number, NodeJS.Timeout>();

    /**
     * 私有构造函数，防止外部实例化
     */
    private constructor() {}

    /**
     * 获取单例实例
     * @returns OnebotForwardClient 实例
     */
    public static getInstance(): OnebotForwardClient {
        if (!OnebotForwardClient.instance) {
            OnebotForwardClient.instance = new OnebotForwardClient();
        }
        return OnebotForwardClient.instance;
    }

    /**
     * 重置单例实例（主要用于测试）
     * @internal
     */
    public static resetInstance(): void {
        if (OnebotForwardClient.instance) {
            OnebotForwardClient.instance.cleanup();
            OnebotForwardClient.instance = null;
        }
    }

    /**
     * 异步执行操作，防止阻塞
     */
    private async asyncExec(operation: () => void): Promise<void> {
        return new Promise((resolve) => {
            setImmediate(() => {
                operation();
                resolve();
            });
        });
    }

    /**
     * 检查连接是否有效（正向连接只需要WebSocket连接状态）
     */
    private isValidConnection(connectionState: ForwardConnectionState): boolean {
        return connectionState.ws.readyState === WebSocket.OPEN;
    }

    /**
     * 记录连接日志
     */
    private logConnection(action: string, config: OnebotForwardConfig, error?: Error): void {
        const message = `OneBot ${action}: ${config.url} (适配器: ${config.adapterId})`;
        if (error) {
            console.error(message, error);
        } else {
            console.log(message);
        }
    }

    /**
     * 创建正向连接
     * @param config 连接配置
     * @returns 连接是否成功建立
     */
    async createConnection(config: OnebotForwardConfig): Promise<boolean> {
        try {
            if (this.connections.has(config.adapterId)) {
                this.disconnect(config.adapterId);
            }

            const ws = this.createWebSocket(config);
            const connectionState: ForwardConnectionState = { ws, config, isAuthenticated: false };

            this.connections.set(config.adapterId, connectionState);
            this.setupWebSocketHandlers(connectionState);

            return this.waitForConnection(ws, config);
        } catch (error) {
            this.logConnection('正向连接失败', config, error as Error);
            return false;
        }
    }

    /**
     * 创建WebSocket实例
     */
    private createWebSocket(config: OnebotForwardConfig): WebSocket {
        return new WebSocket(config.url, {
            headers: {
                'User-Agent': 'FGATE-Nexus/1.0',
                ...(config.accessToken && { Authorization: `Bearer ${config.accessToken}` })
            }
        });
    }

    /**
     * 等待连接建立
     */
    private waitForConnection(ws: WebSocket, config: OnebotForwardConfig): Promise<boolean> {
        return new Promise((resolve) => {
            ws.once('open', () => {
                this.logConnection('正向连接已建立', config);
                const connectionState = this.connections.get(config.adapterId);
                if (connectionState) {
                    // 正向连接无需认证，直接设置为已连接
                    connectionState.isAuthenticated = true;
                    // 可选：尝试获取 bot 信息
                    this.requestBotInfo(connectionState).catch(console.error);
                }
                resolve(true);
            });

            ws.once('error', (error) => {
                this.logConnection('正向连接失败', config, error as Error);
                this.connections.delete(config.adapterId);
                resolve(false);
            });
        });
    } /**
     * 请求机器人登录信息
     * @param connectionState 连接状态
     */
    private async requestBotInfo(connectionState: ForwardConnectionState): Promise<void> {
        if (connectionState.ws.readyState !== WebSocket.OPEN) return;

        const loginInfoRequest = {
            action: 'get_login_info',
            echo: `login_info_${connectionState.config.adapterId}_${Date.now()}`
        };

        try {
            await this.sendWebSocketMessage(connectionState.ws, loginInfoRequest);
            console.log(`请求机器人信息: ${connectionState.config.url}`);

            // 设置超时重试，如果5秒后还没有获取到 Bot ID，再试一次
            setTimeout(() => {
                if (!connectionState.botId && connectionState.ws.readyState === WebSocket.OPEN) {
                    console.log(`重试请求机器人信息: ${connectionState.config.url}`);
                    this.sendWebSocketMessage(connectionState.ws, {
                        action: 'get_login_info',
                        echo: `login_info_retry_${connectionState.config.adapterId}_${Date.now()}`
                    }).catch(console.error);
                }
            }, 5000);
        } catch (error) {
            console.error('请求机器人信息失败:', error);
        }
    }

    /**
     * 发送WebSocket消息
     */
    private sendWebSocketMessage(ws: WebSocket, data: object): Promise<void> {
        return new Promise((resolve) => {
            ws.send(JSON.stringify(data), (error) => {
                if (error) {
                    console.error('发送消息失败:', error);
                }
                resolve();
            });
        });
    }

    /**
     * 处理接收到的消息
     * @param connectionState 连接状态
     * @param message 消息内容
     */
    private async handleMessage(connectionState: ForwardConnectionState, message: string): Promise<void> {
        try {
            const data = JSON.parse(message);

            // 检查是否为登录信息响应（可选功能）
            if (this.isLoginInfoResponse(data, connectionState.config.adapterId)) {
                await this.handleLoginResponse(connectionState, data);
                return;
            }

            // 正向连接无需认证即可处理消息
            if (this.isValidConnection(connectionState)) {
                await this.asyncExec(() => {
                    // 如果已获取到 botId，使用 botId 处理
                    if (connectionState.botId) {
                        onebotInstance.handleBotMessage(connectionState.botId, message);
                    } else {
                        // 如果尚未获取到 Bot ID，尝试从消息中提取并处理（只处理一次）
                        console.log(
                            `正向连接尚未获取到 Bot ID，使用适配器 ID 处理消息: 适配器 ${connectionState.config.adapterId}`
                        );
                        // 尝试提取 Bot ID 并处理消息（tryExtractBotIdFromMessage 内部会处理消息）
                        this.tryExtractBotIdFromMessage(connectionState, data);
                    }
                });
            }
        } catch (error) {
            console.error('解析正向连接消息失败:', error);
        }
    }

    /**
     * 检查是否为登录信息响应
     */
    private isLoginInfoResponse(data: Record<string, unknown>, adapterId: number): boolean {
        return Boolean(
            data.echo &&
                typeof data.echo === 'string' &&
                (data.echo.startsWith(`login_info_${adapterId}_`) ||
                    data.echo.startsWith(`login_info_retry_${adapterId}_`))
        );
    }

    /**
     * 处理登录响应
     */
    private async handleLoginResponse(
        connectionState: ForwardConnectionState,
        data: Record<string, unknown>
    ): Promise<void> {
        const responseData = data.data as Record<string, unknown>;
        if (responseData?.user_id) {
            const botId = responseData.user_id as number;

            // 如果已经设置过 botId，避免重复处理
            if (connectionState.botId === botId) {
                return;
            }

            connectionState.botId = botId;

            // 将连接注册到 OnebotManager
            await this.asyncExec(() => {
                onebotInstance.addForwardConnection(botId, connectionState.ws, connectionState.config.url);
            });

            console.log(`正向连接获取到 Bot ID: ${botId} (适配器: ${connectionState.config.adapterId})`);

            // 更新数据库中的 bot_id
            await this.updateDatabaseBotId(connectionState.config.adapterId, botId);
        } else {
            console.log(`正向连接未能获取 Bot ID，将继续等待: 适配器 ${connectionState.config.adapterId}`);
        }
    } /**
     * 设置 WebSocket 事件处理器
     * @param connectionState 连接状态
     */
    private setupWebSocketHandlers(connectionState: ForwardConnectionState): void {
        const { ws, config } = connectionState;

        ws.on('message', async (data: Buffer) => {
            await this.handleMessage(connectionState, data.toString());
        });

        ws.on('close', async (code: number, _reason: Buffer) => {
            await this.handleDisconnection(connectionState, code);
        });

        ws.on('error', (error: Error) => {
            this.logConnection('正向连接错误', config, error);
        });

        this.setupHeartbeat(connectionState);
    }

    /**
     * 处理连接断开
     */
    private async handleDisconnection(connectionState: ForwardConnectionState, code: number): Promise<void> {
        this.logConnection(`正向连接已断开 - ${code}`, connectionState.config);

        // 如果有 botId，从 OnebotManager 中移除
        if (connectionState.botId) {
            await this.asyncExec(() => {
                onebotInstance.removeForwardConnection(connectionState.botId!);
            });
        }

        this.connections.delete(connectionState.config.adapterId);
        this.clearHeartbeat(connectionState.config.adapterId);

        if (connectionState.config.autoReconnect && code !== 1000) {
            this.scheduleReconnect(connectionState.config);
        }
    }

    /**
     * 设置心跳
     */
    private setupHeartbeat(connectionState: ForwardConnectionState): void {
        const { config } = connectionState;
        const heartbeatInterval = setInterval(async () => {
            if (this.isValidConnection(connectionState)) {
                await this.sendHeartbeat(connectionState);
            } else if (connectionState.ws.readyState !== WebSocket.OPEN) {
                this.clearHeartbeat(config.adapterId);
            }
        }, 30000);

        this.heartbeatIntervals.set(config.adapterId, heartbeatInterval);
    }

    /**
     * 发送心跳
     */
    private async sendHeartbeat(connectionState: ForwardConnectionState): Promise<void> {
        const heartbeatMessage = {
            action: 'get_status',
            echo: `heartbeat_${Date.now()}`
        };

        await this.asyncExec(() => {
            connectionState.ws.send(JSON.stringify(heartbeatMessage), (error) => {
                if (error) {
                    console.error(`心跳发送失败 (适配器: ${connectionState.config.adapterId}):`, error);
                }
            });

            // 如果有 botId，更新心跳；否则仅记录
            if (connectionState.botId) {
                onebotInstance.updateBotHeartbeat(connectionState.botId);
            }
        });
    }

    /**
     * 清理心跳定时器
     */
    private clearHeartbeat(adapterId: number): void {
        const interval = this.heartbeatIntervals.get(adapterId);
        if (interval) {
            clearInterval(interval);
            this.heartbeatIntervals.delete(adapterId);
        }
    }

    /**
     * 安排重连
     * @param config 连接配置
     */
    private scheduleReconnect(config: OnebotForwardConfig): void {
        const existingTimer = this.reconnectTimers.get(config.adapterId);
        if (existingTimer) {
            clearTimeout(existingTimer);
        }

        const timer = setTimeout(async () => {
            console.log(`尝试重连 OneBot 正向连接: ${config.url} (适配器: ${config.adapterId})`);
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
     * 断开连接
     * @param adapterId 适配器ID
     */
    /**
     * 断开指定适配器的连接
     * @param adapterId 适配器ID
     */
    disconnect(adapterId: number): void {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState) return;

        // 记录断开连接日志
        if (connectionState.botId) {
            console.log(`断开 Bot ${connectionState.botId} 的连接`);
            console.log(`正向连接已断开: 适配器 ${adapterId}`);
        } else {
            console.log(`正向连接已断开: 适配器 ${adapterId}`);
        }

        // 清理定时器
        const timer = this.reconnectTimers.get(adapterId);
        if (timer) {
            clearTimeout(timer);
            this.reconnectTimers.delete(adapterId);
        }

        this.clearHeartbeat(adapterId);

        // 异步断开连接
        this.asyncExec(() => {
            connectionState.ws.close(1000, 'Manual disconnect');
        });

        this.connections.delete(adapterId);
    }

    /**
     * 检查指定适配器的连接状态
     * @param adapterId 适配器ID
     * @returns 连接是否活跃
     */
    isConnected(adapterId: number): boolean {
        const connectionState = this.connections.get(adapterId);
        return connectionState ? connectionState.ws.readyState === WebSocket.OPEN : false;
    }

    /**
     * 获取所有连接的状态信息
     * @returns 所有连接的状态数组，包含适配器ID、URL、连接状态和机器人ID
     */
    getAllConnections(): Array<{ adapterId: number; url: string; connected: boolean; botId?: number }> {
        const result: Array<{ adapterId: number; url: string; connected: boolean; botId?: number }> = [];

        for (const [adapterId, connectionState] of this.connections) {
            result.push({
                adapterId,
                url: connectionState.config.url,
                connected: this.isConnected(adapterId),
                botId: connectionState.botId
            });
        }

        return result;
    }

    /**
     * 通过适配器ID发送消息
     * @param adapterId 适配器ID
     * @param message 要发送的消息内容
     * @returns 是否发送成功
     */
    sendMessage(adapterId: number, message: string): boolean {
        const connectionState = this.connections.get(adapterId);
        if (!connectionState || !this.isValidConnection(connectionState)) {
            return false;
        }

        this.asyncExec(() => {
            connectionState.ws.send(message, (error) => {
                if (error) {
                    console.error(`发送消息失败 (适配器: ${adapterId}):`, error);
                }
            });
        });

        return true;
    }

    /**
     * 通过机器人ID发送消息（仅支持真实的botId）
     * @param botId 机器人ID（不是适配器ID）
     * @param message 要发送的消息内容
     * @returns 是否发送成功
     */
    sendMessageByBotId(botId: number, message: string): boolean {
        // 通过 botId 查找对应的连接
        for (const [adapterId, connectionState] of this.connections) {
            if (connectionState.botId === botId && this.isValidConnection(connectionState)) {
                console.log(`[FORWARD] 找到机器人 ${botId} 的连接，通过适配器 ${adapterId} 发送消息`);
                return this.sendMessage(adapterId, message);
            }
        }

        // 如果没找到任何匹配的 botId，记录详细信息以便调试
        console.warn(`[FORWARD] 未找到机器人 ${botId} 的正向连接`);
        console.debug(`[FORWARD] 当前连接详情:`);
        for (const [adapterId, connectionState] of this.connections) {
            const status = this.isValidConnection(connectionState) ? '有效' : '无效';
            console.debug(`  - 适配器 ${adapterId}: botId=${connectionState.botId}, 状态=${status}`);
        }

        return false;
    }

    /**
     * 通过适配器ID发送消息（仅限内部使用）
     * @param adapterId 适配器ID
     * @param message 要发送的消息内容
     * @returns 是否发送成功
     */
    sendMessageByAdapterId(adapterId: number, message: string): boolean {
        console.warn(`[FORWARD] 使用适配器ID ${adapterId} 发送消息（不推荐，应使用botId）`);
        return this.sendMessage(adapterId, message);
    }

    /**
     * 通过适配器ID获取WebSocket连接
     * @param adapterId 适配器ID
     * @returns WebSocket连接实例，如果不存在则返回undefined
     */
    getConnection(adapterId: number): WebSocket | undefined {
        const connectionState = this.connections.get(adapterId);
        return connectionState?.ws;
    }

    /**
     * 通过机器人ID获取WebSocket连接（仅支持真实的botId）
     * @param botId 机器人ID（不是适配器ID）
     * @returns WebSocket连接实例，如果不存在则返回undefined
     */
    getConnectionByBotId(botId: number): WebSocket | undefined {
        // 通过 botId 查找对应的连接
        for (const [adapterId, connectionState] of this.connections) {
            if (connectionState.botId === botId && this.isValidConnection(connectionState)) {
                console.debug(`[FORWARD] 找到机器人 ${botId} 的连接，适配器 ${adapterId}`);
                return connectionState.ws;
            }
        }

        console.debug(`[FORWARD] 未找到机器人 ${botId} 的有效连接`);
        return undefined;
    }

    /**
     * 通过适配器ID获取WebSocket连接（仅限内部使用）
     * @param adapterId 适配器ID
     * @returns WebSocket连接实例，如果不存在则返回undefined
     */
    getConnectionByAdapterId(adapterId: number): WebSocket | undefined {
        const connectionState = this.connections.get(adapterId);
        if (connectionState && this.isValidConnection(connectionState)) {
            return connectionState.ws;
        }
        return undefined;
    }

    /**
     * 更新连接配置
     * 如果配置发生变化，将重新建立连接
     * @param config 新的连接配置
     * @returns 更新是否成功
     */
    async updateConfig(config: OnebotForwardConfig): Promise<boolean> {
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
     */
    private isConfigUnchanged(oldConfig: OnebotForwardConfig, newConfig: OnebotForwardConfig): boolean {
        return (
            oldConfig.url === newConfig.url &&
            oldConfig.accessToken === newConfig.accessToken &&
            oldConfig.autoReconnect === newConfig.autoReconnect &&
            oldConfig.responseTimeout === newConfig.responseTimeout
        );
    }

    /**
     * 清理所有连接和定时器
     * 通常在应用关闭时调用
     */
    cleanup(): void {
        // 清理所有重连定时器
        for (const [, timer] of this.reconnectTimers) {
            clearTimeout(timer);
        }
        this.reconnectTimers.clear();

        // 清理所有心跳定时器
        for (const [, interval] of this.heartbeatIntervals) {
            clearInterval(interval);
        }
        this.heartbeatIntervals.clear();

        // 异步断开所有连接
        for (const [, connectionState] of this.connections) {
            this.asyncExec(() => {
                if (connectionState.ws.readyState === WebSocket.OPEN) {
                    connectionState.ws.close(1000, 'Application shutdown');
                }
            });
        }
        this.connections.clear();
    }

    /**
     * 获取连接统计信息
     * @returns 连接统计信息
     */
    getConnectionStats(): {
        total: number;
        connected: number;
        authenticated: number;
    } {
        let connected = 0;
        let authenticated = 0;

        for (const [, connectionState] of this.connections) {
            if (connectionState.ws.readyState === WebSocket.OPEN) {
                connected++;
                // 正向连接默认认为已认证
                authenticated++;
            }
        }

        return {
            total: this.connections.size,
            connected,
            authenticated
        };
    }

    /**
     * 尝试从消息中提取 Bot ID
     * @param connectionState 连接状态
     * @param data 消息数据
     */
    private tryExtractBotIdFromMessage(connectionState: ForwardConnectionState, data: Record<string, unknown>): void {
        // 检查是否是事件消息，从中提取 self_id
        if (data.post_type && data.self_id && typeof data.self_id === 'number') {
            const botId = data.self_id;
            if (!connectionState.botId) {
                connectionState.botId = botId;
                console.log(
                    `正向连接从事件消息中获取到 Bot ID: ${botId} (适配器: ${connectionState.config.adapterId})`
                );

                // 注册到 OnebotManager
                this.asyncExec(() => {
                    onebotInstance.addForwardConnection(botId, connectionState.ws, connectionState.config.url);
                });

                // 更新数据库中的 bot_id
                this.updateDatabaseBotId(connectionState.config.adapterId, botId);
            }

            // 现在可以处理消息了
            onebotInstance.handleBotMessage(botId, JSON.stringify(data));
        }
    }

    /**
     * 更新数据库中的 bot_id
     * @param adapterId 适配器 ID
     * @param botId Bot ID
     */
    private async updateDatabaseBotId(adapterId: number, botId: number): Promise<void> {
        try {
            const { db } = await import('~/server/database/client');
            const { onebot_adapters } = await import('~/server/database/schema');
            const { eq } = await import('drizzle-orm');

            await db.update(onebot_adapters).set({ botId }).where(eq(onebot_adapters.adapter_id, adapterId));

            console.log(`已更新数据库中适配器 ${adapterId} 的 Bot ID: ${botId}`);
        } catch (error) {
            console.error(`更新数据库 Bot ID 失败: 适配器 ${adapterId}`, error);
        }
    }

    /**
     * 为适配器设置 Bot ID
     * @param adapterId 适配器 ID
     * @param botId Bot ID
     */
    setBotIdForAdapter(adapterId: number, botId: number): void {
        const connectionState = this.connections.get(adapterId);
        if (connectionState) {
            connectionState.botId = botId;
            console.log(`已设置适配器 ${adapterId} 的 Bot ID: ${botId}`);

            // 注册到 OnebotManager
            this.asyncExec(() => {
                onebotInstance.addForwardConnection(botId, connectionState.ws, connectionState.config.url);
            });
        }
    }
}

/**
 * OneBot 正向连接客户端单例实例
 * 用于管理所有的 OneBot 正向 WebSocket 连接
 */
export const onebotForwardClient = OnebotForwardClient.getInstance();

/**
 * 导出类型供外部使用
 */
export type { OnebotForwardConfig, ForwardConnectionState };

/**
 * 导出类本身供类型引用
 */
export { OnebotForwardClient };
