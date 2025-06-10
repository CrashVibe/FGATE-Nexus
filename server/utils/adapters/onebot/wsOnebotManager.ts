import { WebSocketServer } from 'ws';
import type { onebot_adapters } from '../../../shared/types/adapters/adapter';
import { adapterManager } from '../adapterManager';
import http from 'http';

class AdapterWebSocketServerManager {
    private pathMap = new Map<string, Map<string, { wss: WebSocketServer; adapter: onebot_adapters }>>();
    private botIdToPath = new Map<number, string>(); // 新增：快速查找 botId 对应的路径
    private server: http.Server;
    private heartbeatIntervals = new Map<string, NodeJS.Timeout>(); // 新增：集中管理心跳定时器

    constructor() {
        this.server = http.createServer();
        this.server.on('upgrade', this.handleUpgrade.bind(this));
        this.server.listen(14321, () => {
            console.log('WebSocket 服务器监听 14321');
        });
    }

    /**
     * 初始化所有适配器
     * @return void
     * @throws {Error} 如果适配器初始化失败
     */
    async initAllAdapters() {
        this.clearAllAdapters();
        const adapters = await adapterManager.getAllAdapters();

        const enabledAdapters = adapters.filter((adapter) => adapter.enabled);

        const results = await Promise.allSettled(enabledAdapters.map((adapter) => this.initAdapter(adapter)));

        const failures = results.filter((result) => result.status === 'rejected');
        if (failures.length > 0) {
            console.warn(`${failures.length} 个适配器初始化失败`);
        }

        console.log('所有适配器已加载');
    }

    /**
     * 初始化单个适配器
     * @param adapter - 适配器配置
     * @return void
     * @throws {Error} 如果适配器配置不完整或初始化失败
     */
    async initAdapter(adapter: onebot_adapters) {
        const botIdStr = String(adapter.botId);

        // 检查是否已存在，使用快速查找
        if (this.botIdToPath.has(adapter.botId)) {
            console.warn(`适配器已存在: ${adapter.adapterType} (${adapter.botId})`);
            return;
        }

        let botMap = this.pathMap.get(adapter.listenPath);
        if (!botMap) {
            botMap = new Map();
            this.pathMap.set(adapter.listenPath, botMap);
        }

        const wss = new WebSocketServer({ noServer: true });
        botMap.set(botIdStr, { wss, adapter });
        this.botIdToPath.set(adapter.botId, adapter.listenPath); // 建立快速查找映射

        wss.on('connection', (ws, _req) => {
            console.log(`适配器 ${adapter.adapterType}(${adapter.botId}) 新连接`);

            // 使用连接唯一标识管理心跳
            const connectionId = `${adapter.botId}_${Date.now()}`;
            const heartbeatInterval = setInterval(() => {
                if (ws.readyState === ws.OPEN) {
                    ws.ping();
                }
            }, 30000);

            this.heartbeatIntervals.set(connectionId, heartbeatInterval);

            ws.on('message', (data) => {
                process.nextTick(() => {
                    try {
                        const payload = JSON.parse(data.toString());
                        const messageType = payload.post_type;

                        if (messageType === 'meta_event' && payload.meta_event_type === 'heartbeat') {
                            console.log(`适配器 ${adapter.adapterType}(${adapter.botId}) 心跳事件`);
                            return;
                        }

                        if (messageType === 'message') {
                            const qq = payload.user_id;
                            const message = payload.message;
                            console.log(`收到来自 ${adapter.adapterType}(${adapter.botId}) 的消息:`, payload);

                            // TODO: 实现消息处理逻辑
                            console.log(
                                `处理消息: QQ=${qq}, 内容=${typeof message === 'string' ? message : JSON.stringify(message)}`
                            );
                        }
                    } catch (err) {
                        console.error('消息解析失败:', err);
                    }
                });
            });

            ws.on('pong', () => console.log(`适配器 ${adapter.adapterType}(${adapter.botId}) 心跳正常`));

            ws.on('close', () => {
                // 清理心跳定时器
                const interval = this.heartbeatIntervals.get(connectionId);
                if (interval) {
                    clearInterval(interval);
                    this.heartbeatIntervals.delete(connectionId);
                }
                console.log(`适配器 ${adapter.adapterType}(${adapter.botId}) 连接关闭`);
            });

            ws.on('error', (err) => console.error(`适配器 ${adapter.adapterType}(${adapter.botId}) 错误:`, err));
        });

        console.log(`已启动适配器: ${adapter.adapterType} (${adapter.botId})`);
    }

    async removeAdapter(adapter: onebot_adapters) {
        // 使用快速查找
        const path = this.botIdToPath.get(adapter.botId);
        if (!path) {
            console.warn(`适配器 ${adapter.adapterType} (${adapter.botId}) 不存在`);
            return;
        }
        const botMap = this.pathMap.get(path);
        if (!botMap || !botMap.has(String(adapter.botId))) {
            console.warn(`适配器 ${adapter.adapterType} (${adapter.botId}) 不存在`);
            return;
        }
        const { wss } = botMap.get(String(adapter.botId))!;
        // 安全关闭连接
        wss.clients.forEach((client) => {
            try {
                // 检查连接状态，避免重复关闭
                if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
                    client.terminate();
                }
            } catch (error) {
                console.warn(`关闭客户端连接时出错:`, error);
            }
        });
        // 清理心跳定时器
        wss.clients.forEach(() => {
            const connectionId = `${adapter.botId}_${Date.now()}`;
            const interval = this.heartbeatIntervals.get(connectionId);
            if (interval) {
                clearInterval(interval);
                this.heartbeatIntervals.delete(connectionId);
            }
        });
        // 清理映射
        botMap.delete(String(adapter.botId));
        this.botIdToPath.delete(adapter.botId);
        if (botMap.size === 0) {
            this.pathMap.delete(path);
        }
        // 关闭 WebSocket 服务器
        await new Promise<void>((resolve) => wss.close(() => resolve()));
        console.log(`适配器 ${adapter.adapterType} (${adapter.botId}) 已卸载`);
    }

    private handleUpgrade(req: http.IncomingMessage, socket: any, head: Buffer) {
        try {
            if (!req.url) {
                socket.destroy();
                return;
            }

            const pathname = new URL(req.url, `http://${req.headers.host}`).pathname;
            const botId = req.headers['x-self-id'];

            if (!botId) {
                console.warn('请求缺少 X-Self-ID');
                socket.destroy();
                return;
            }

            const botMap = this.pathMap.get(pathname);
            if (!botMap) {
                socket.destroy();
                return;
            }

            const match = botMap.get(String(botId));
            if (!match) {
                socket.destroy();
                return;
            }

            const { adapter, wss } = match;

            // token：提前获取 token
            if (adapter.accessToken) {
                const authHeader = req.headers['authorization'];
                const token = authHeader?.split(' ')[1];

                if (token !== adapter.accessToken) {
                    socket.write('HTTP/1.1 401 Unauthorized\r\n\r\n');
                    socket.destroy();
                    return;
                }
            }

            wss.handleUpgrade(req, socket, head, (ws) => {
                wss.emit('connection', ws, req);
            });
        } catch (err) {
            console.error('Upgrade 错误:', err);
            socket.destroy();
        }
    }

    /**
     * 获取所有适配器的连接状态
     * @return Array<{ botId: number, adapterType: string, listenPath: string, enabled: boolean, connected: boolean }>
     */
    getConnectionStatus() {
        const status = [];
        for (const [path, botMap] of this.pathMap.entries()) {
            for (const { adapter, wss } of botMap.values()) {
                status.push({
                    botId: adapter.botId,
                    adapterType: adapter.adapterType,
                    listenPath: path,
                    enabled: adapter.enabled,
                    connected: wss.clients.size > 0
                });
            }
        }
        return status;
    }

    /**
     * 检查是否有活动连接
     * @param botId - 机器人 ID
     * @return boolean - 是否有活动连接
     */
    hasActiveConnection(botId: number): boolean {
        // 使用快速查找优化
        const path = this.botIdToPath.get(botId);
        if (!path) return false;

        const botMap = this.pathMap.get(path);
        if (!botMap) return false;

        const match = botMap.get(String(botId));
        return match ? match.wss.clients.size > 0 : false;
    }

    clearAllAdapters() {
        // 批量处理，提高清理效率
        const closePromises = [];

        for (const botMap of this.pathMap.values()) {
            for (const { wss } of botMap.values()) {
                // 安全终止连接
                wss.clients.forEach((client) => {
                    try {
                        // 检查连接状态，避免重复关闭
                        if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
                            client.terminate();
                        }
                    } catch (error) {
                        console.warn(`关闭客户端连接时出错:`, error);
                    }
                });

                // 收集关闭 Promise
                closePromises.push(new Promise<void>((resolve) => wss.close(() => resolve())));
            }
        }

        // 清理所有映射
        this.pathMap.clear();
        this.botIdToPath.clear();

        // 清理所有心跳定时器
        this.heartbeatIntervals.forEach((interval) => clearInterval(interval));
        this.heartbeatIntervals.clear();

        // 等待所有 WebSocket 关闭
        Promise.all(closePromises).then(() => {
            console.log('所有 WebSocket 已关闭');
        });
    }

    /**
     * 更新（重载）某个适配器
     * 先关闭旧连接，再重新初始化
     * @param adapter - 新适配器配置
     * @returns void
     */
    async updateAdapter(adapter: onebot_adapters) {
        // 使用快速查找检查是否存在
        const oldPath = this.botIdToPath.get(adapter.botId);

        if (oldPath) {
            const botMap = this.pathMap.get(oldPath);
            if (botMap && botMap.has(String(adapter.botId))) {
                const { wss } = botMap.get(String(adapter.botId))!;

                // 批量关闭旧连接
                const closePromises = Array.from(wss.clients).map((client) => {
                    return new Promise<void>((resolve) => {
                        try {
                            // 检查连接状态，避免重复关闭
                            if (client.readyState === client.OPEN || client.readyState === client.CONNECTING) {
                                client.terminate();
                            }
                            resolve();
                        } catch (error) {
                            console.warn(`关闭客户端连接时出错:`, error);
                            resolve(); // 即使出错也要继续
                        }
                    });
                });

                await Promise.all(closePromises);
                await new Promise<void>((resolve) => wss.close(() => resolve()));

                // 清理旧记录
                botMap.delete(String(adapter.botId));
                this.botIdToPath.delete(adapter.botId);

                if (botMap.size === 0) {
                    this.pathMap.delete(oldPath);
                }

                console.log(`适配器 ${adapter.adapterType} (${adapter.botId}) 已卸载`);
            }
        }
        if (adapter.enabled && !this.hasActiveConnection(adapter.botId)) {
            await this.initAdapter(adapter);
            console.log(`适配器 ${adapter.adapterType} (${adapter.botId}) 已更新`);
        }
    }
}

export const wsServerManager = new AdapterWebSocketServerManager();
