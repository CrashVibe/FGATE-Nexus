import { v4 as uuidv4 } from 'uuid';
import { MinecraftClientManager } from './client/minecraft-client-manager';
import type { AdapterInternal, Peer } from 'crossws';
import type { ClientInfo, JsonRpcRequest, JsonRpcResponse, PendingRequest } from './client/type';
import type { ServerStatus } from '~/server/shared/types/server/status';
import type { GetClientInfoResult } from '~/server/shared/types/server/client-info';

// 在类外部新增 WeakMap 用于反向绑定
const peerClientMap: WeakMap<ClientInfo, Peer<AdapterInternal>> = new WeakMap();

export class WebSocketManager {
    private static instance: WebSocketManager;
    private clients = new Map<Peer<AdapterInternal>, ClientInfo>();
    private pendingRequests = new Map<string, PendingRequest>();
    private minecraftManager: MinecraftClientManager;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.minecraftManager = new MinecraftClientManager();
    }

    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    public hasClient(peer: Peer<AdapterInternal>): boolean {
        return this.clients.has(peer);
    }

    getClientIdByPeer(peer: Peer<AdapterInternal>): string | undefined {
        return this.clients.get(peer)?.id;
    }

    private getBoundClient(peer: Peer<AdapterInternal>): ClientInfo {
        const client = this.clients.get(peer);
        if (!client) {
            throw new Error(`未找到与 peer(${peer.id}) 绑定的客户端`);
        }
        return client;
    }

    private getBoundPeer(client: ClientInfo): Peer<AdapterInternal> {
        const peer = peerClientMap.get(client);
        if (!peer) throw new Error(`未找到与 client(${client.id}) 绑定的 peer`);
        return peer;
    }

    handleConnection(peer: Peer<AdapterInternal>) {
        const clientId = uuidv4();
        const token = peer.request.headers.get('authorization')?.replace('Bearer ', '') || '';
        const clientVersion = peer.request.headers.get('x-api-version') || '1.0.0';

        const client: ClientInfo = {
            id: clientId,
            peer,
            isAlive: true,
            lastPing: Date.now(),
            token,
            clientVersion,
            playerCount: 0
        };

        this.clients.set(peer, client);
        // 反向绑定：保证 client 能唯一找到 peer
        peerClientMap.set(client, peer);

        console.log(`📱 新客户端已连接: ${clientId} (版本: ${clientVersion})`);
        this.requestClientInfo(peer);
    }

    handleMessage(peer: Peer<AdapterInternal>, message: string) {
        try {
            const data = JSON.parse(message);

            if (!isValidJsonRpcRequest(data) && !isValidJsonRpcResponse(data)) {
                this.sendError(peer, -32600, '请求格式错误', null);
                return;
            }

            // 处理响应消息（有result或error字段）
            if (isValidJsonRpcResponse(data)) {
                this.handleResponse(peer, data);
                return;
            }

            // 处理请求消息（有method字段）
            if (isValidJsonRpcRequest(data) && data.method) {
                this.handleRequest(peer, data);
                return;
            }

            this.sendError(peer, -32600, '请求无效', data.id ?? null);
        } catch (error) {
            console.error(`❌ 解析客户端 ${peer.id} 消息出错:`, error);
            this.sendError(peer, -32700, 'Parse error', null);
        }
    }

    private handleRequest(peer: Peer<AdapterInternal>, request: JsonRpcRequest) {
        const client = this.clients.get(peer);
        if (!client) return;

        console.log(`📨 收到来自 ${peer.id} 的请求: ${request.method}`);

        switch (request.method) {
            case 'player.join':
                if (
                    typeof request.params === 'object' &&
                    request.params !== null &&
                    typeof (request.params as { player?: unknown }).player === 'string' &&
                    typeof (request.params as { uuid?: unknown }).uuid === 'string'
                ) {
                    const params = request.params as { player: string; uuid: string; ip: string | null };
                    this.handlePlayerJoin(peer, params);
                } else {
                    this.sendError(peer, -32602, '参数无效', request.id ?? null);
                }
                break;

            case 'heartbeat':
                if (!request.id) {
                    this.sendError(peer, -32600, '请求无效', null);
                    return;
                }
                this.sendResponse(peer, request.id ?? null, { status: 'ok', timestamp: Date.now() });
                break;

            default:
                this.sendError(peer, -32601, 'Method not found', request.id ?? null);
        }
    }

    private handleResponse(peer: Peer<AdapterInternal>, response: JsonRpcResponse) {
        // 处理待处理的请求响应
        if (response.id && this.pendingRequests.has(response.id.toString())) {
            const pendingRequest = this.pendingRequests.get(response.id.toString())!;
            clearTimeout(pendingRequest.timeout);
            this.pendingRequests.delete(response.id.toString());

            if (response.error) {
                pendingRequest.reject(new Error(response.error.message));
            } else {
                pendingRequest.resolve(response.result);
            }
            return;
        }
    }

    private async handlePlayerJoin(
        peer: Peer<AdapterInternal>,
        params: { player: string; uuid: string; ip: string | null }
    ) {
        const clientId = this.getClientIdByPeer(peer);
        if (!clientId) {
            console.warn(`⚠️  无法处理玩家加入数据: 来自 ${peer.id}`);
            return;
        }

        if (!params?.player || !params?.uuid) {
            console.warn(`⚠️  无法处理玩家加入数据: 来自 ${clientId}`);
            return;
        }

        console.log(`🎮 玩家加入: ${clientId}: ${params.player} (${params.uuid}) IP: ${params.ip}`);

        try {
            const { db } = await import('../database/client');
            const { servers, players } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');
            const { BindingConfigManager } = await import('../utils/config/bindingConfigManager');

            // 通过 token 查找服务器 id
            const client = this.clients.get(peer);
            if (!client) return;
            const serverRow = await db.select().from(servers).where(eq(servers.token, client.token)).limit(1);
            if (!serverRow.length) return;
            const serverId = serverRow[0].id;

            // 1. 写入或更新玩家信息到数据库
            const existingPlayer = await db.select().from(players).where(eq(players.uuid, params.uuid)).limit(1);

            if (existingPlayer.length > 0) {
                // 更新现有玩家信息
                const player = existingPlayer[0];
                const serverList = player.servers ? player.servers.split(',').filter(Boolean) : [];
                const serverIdStr = serverId.toString();

                // 确保当前服务器ID在列表中
                if (!serverList.includes(serverIdStr)) {
                    serverList.push(serverIdStr);
                }

                await db
                    .update(players)
                    .set({
                        name: params.player,
                        ip: params.ip,
                        servers: serverList.join(','),
                        updatedAt: new Date().toISOString()
                    })
                    .where(eq(players.uuid, params.uuid));

                console.log(`📝 已更新玩家信息: ${params.player} (${params.uuid}) IP: ${params.ip}`);
            } else {
                // 创建新玩家记录
                await db.insert(players).values({
                    name: params.player,
                    uuid: params.uuid,
                    ip: params.ip,
                    servers: serverId.toString(),
                    socialAccountId: null
                });

                console.log(`✨ 已创建新玩家记录: ${params.player} (${params.uuid}) IP: ${params.ip}`);
            }

            // 2. 获取绑定配置并进行强制绑定校验
            const bindingConfigManager = BindingConfigManager.getInstance(serverId);
            const config = await bindingConfigManager.getConfig();
            if (config && config.forceBind) {
                // 重新查询玩家信息以获取最新的绑定状态
                const playerRows = await db.select().from(players).where(eq(players.uuid, params.uuid)).limit(1);
                const player = playerRows[0];
                if (!player || !player.socialAccountId) {
                    // 未绑定，生成验证码并踢出玩家
                    try {
                        // 动态导入绑定管理器
                        const { bindingManager } = await import('~/utils/bindingManager');

                        // 为玩家生成验证码（使用玩家UUID作为临时社交账号ID）
                        const tempSocialId = `minecraft_${params.uuid}`;
                        const bindingResult = await bindingManager.addPendingBinding(
                            serverId,
                            params.player,
                            tempSocialId
                        );

                        let kickMessage = config.kickMsg;
                        if (bindingResult.success && bindingResult.code) {
                            // 替换消息模板中的占位符
                            kickMessage = kickMessage
                                .replace('#name', params.player)
                                .replace('#cmd_prefix', `${config.prefix}`)
                                .replace('#code', bindingResult.code)
                                .replace('#time', `${config.codeExpire}分钟`);

                            console.log(`🔐 为玩家 ${params.player} 生成绑定验证码: ${bindingResult.code}`);
                        } else {
                            kickMessage = kickMessage
                                .replace('#name', params.player)
                                .replace('#cmd_prefix', `${config.prefix}验证码`)
                                .replace('#code', '验证码')
                                .replace('#time', `${config.codeExpire}分钟`);

                            console.log(`❌ 为玩家 ${params.player} 生成绑定验证码失败: ${bindingResult.message}`);
                        }

                        this.kickPlayerDirect(peer, params.player, kickMessage);
                        console.log(`⛔ 玩家 ${params.player} 未绑定社交账号，已生成验证码并被踢出`);
                    } catch (error) {
                        console.error('生成绑定验证码失败:', error);
                        const kickMessage = config.kickMsg
                            .replace('#name', params.player)
                            .replace('#cmd_prefix', `${config.prefix}验证码`)
                            .replace('#code', '验证码')
                            .replace('#time', `${config.codeExpire}分钟`);
                        this.kickPlayerDirect(peer, params.player, kickMessage);
                        console.log(`⛔ 玩家 ${params.player} 未绑定社交账号，验证码生成失败，已被踢出`);
                    }
                    return;
                }
            }
        } catch (err) {
            console.error('处理玩家加入事件时出错:', err);
        }
    }

    handleDisconnection(peer: Peer<AdapterInternal>, code: number | undefined, reason: string | undefined) {
        const client = this.clients.get(peer);
        if (client) {
            if (!reason) {
                if (code === 1000) {
                    reason = '正常关闭';
                } else {
                    reason = `未知原因 (代码: ${code})`;
                }
            }
            console.log(`📱 客户端断开连接: ${client.id}, 代码: ${code}, 原因: ${reason}`);
            this.clients.delete(peer);
            this.minecraftManager.removeClient(peer);
        }
    }

    // 发送JSON-RPC请求到客户端
    private sendRequest<T = unknown, P = unknown>(peer: Peer<AdapterInternal>, method: string, params?: P): Promise<T> {
        return new Promise((resolve, reject) => {
            const id = uuidv4();
            const request: JsonRpcRequest<P> = {
                jsonrpc: '2.0',
                method,
                params,
                id
            };

            // 设置超时
            const timeout = setTimeout(() => {
                this.pendingRequests.delete(id);
                reject(new Error('Request timeout'));
            }, 10000);

            // 存储待处理的请求
            this.pendingRequests.set(id, {
                resolve: (value: unknown) => resolve(value as T),
                reject,
                timeout
            });

            try {
                peer.send(JSON.stringify(request));
                console.log(`📤 已发送请求到 ${peer.id}: ${method} (ID: ${id})`);
            } catch (error) {
                this.pendingRequests.delete(id);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    // 发送JSON-RPC响应
    private sendResponse<R = unknown, E = unknown>(
        peer: Peer<AdapterInternal>,
        id: string | null,
        result: R,
        error?: E
    ) {
        const client = this.clients.get(peer);
        if (!client) {
            console.warn(`⚠️  无法发送响应到客户端 ${peer.id}: 客户端未连接`);
            return;
        }

        const response: JsonRpcResponse<R, E> = {
            jsonrpc: '2.0',
            id,
            result
        };

        if (error) {
            response.error =
                error && typeof error === 'object' && 'code' in error && 'message' in error
                    ? (error as { code: number; message: string; data?: E })
                    : { code: -32000, message: 'Unknown error', data: error as E };
        }

        try {
            peer.send(JSON.stringify(response));
        } catch (err) {
            console.error(`❌ 无法发送响应到客户端 ${client.id}:`, err);
        }
    }

    // 发送错误响应
    private sendError<E = unknown>(
        peer: Peer<AdapterInternal>,
        code: number,
        message: string,
        id: string | null,
        data?: E
    ) {
        this.sendResponse(peer, id, undefined, { code, message, data });
    }

    // 请求客户端信息
    private async requestClientInfo(peer: Peer<AdapterInternal>) {
        try {
            const result = await this.sendRequest<GetClientInfoResult>(peer, 'get.client.info');
            // 类型检测
            if (
                !result.data ||
                typeof result.data.minecraft_version !== 'string' ||
                typeof result.data.minecraft_software !== 'string' ||
                typeof result.data.supports_papi !== 'boolean' ||
                typeof result.data.supports_rcon !== 'boolean'
            ) {
                console.warn(result.data);
                console.warn(`⚠️ 警告: 客户端 ${peer.id} 未提供完整的客户端信息`);
                return;
            }
            // 写入数据库
            const client = this.clients.get(peer);
            if (client) {
                client.serverInfo = {
                    minecraft_version: result.data.minecraft_version,
                    server_type: result.data.minecraft_software,
                    supports_papi: result.data.supports_papi,
                    supports_rcon: result.data.supports_rcon
                };
                this.minecraftManager.updateClientInfo(peer, client);
            } else {
                console.warn(`⚠️  无法更新客户端信息: 客户端 ${peer.id} 未找到`);
                return;
            }
            console.log(`📊 已收到来自 ${peer.id} 的客户端信息:`, client.serverInfo);
        } catch (error) {
            console.error(`❌ 获取客户端 ${peer.id} 信息失败:`, error);
        }
    }

    public async kickPlayerByServerId(
        serverId: number,
        playerIdentifier: string,
        reason: string = 'You have been kicked'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            const peer = await this.getPeerByServerId(serverId);
            if (!peer) {
                return { success: false, error: '服务器未连接' };
            }

            const client = this.clients.get(peer);
            if (!client) {
                return { success: false, error: '服务器客户端未找到' };
            }

            const notification: JsonRpcRequest = {
                jsonrpc: '2.0',
                method: 'kick.player',
                id: null,
                params: {
                    player: playerIdentifier,
                    reason
                }
            };

            peer.send(JSON.stringify(notification));
            console.log(`👢 已向服务器 ${serverId} 发送踢人指令: ${playerIdentifier}`);
            return { success: true };
        } catch (error) {
            console.error(`❌ 踢出服务器 ${serverId} 玩家失败:`, error);
            return { success: false, error: String(error) };
        }
    }

    public async disconnectServer(serverId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const peer = await this.getPeerByServerId(serverId);
            if (!peer) {
                return { success: false, error: '服务器未连接' };
            }

            const client = this.clients.get(peer);
            if (client) {
                console.log(`🔌 正在断开服务器 ${serverId} (${client.id})`);
                this.clients.delete(peer);
                this.minecraftManager.removeClient(peer);
                peer.close();
                return { success: true };
            }

            return { success: false, error: '服务器客户端未找到' };
        } catch (error) {
            console.error(`❌ 断开服务器 ${serverId} 失败:`, error);
            return { success: false, error: String(error) };
        }
    }

    // 统一生成未知服务器状态的默认对象
    private static getUnknownServerStatus(): ServerStatus {
        return {
            isOnline: false,
            playerCount: 0,
            lastSeen: null,
            supportsRcon: false,
            supportsPapi: false,
            software: 'Unknown',
            version: 'Unknown'
        };
    }

    public async getServerStatus(serverId: number): Promise<ServerStatus> {
        try {
            const peer = await this.getPeerByServerId(serverId);
            if (!peer) {
                return WebSocketManager.getUnknownServerStatus();
            }

            const client = this.clients.get(peer);
            if (!client) {
                return WebSocketManager.getUnknownServerStatus();
            }

            return {
                isOnline: client.isAlive,
                playerCount: client.playerCount || 0,
                lastSeen: new Date(client.lastPing),
                supportsRcon: client.serverInfo?.supports_rcon || false,
                supportsPapi: client.serverInfo?.supports_papi || false,
                software: client.serverInfo?.server_type || 'Unknown',
                version: client.serverInfo?.minecraft_version || 'Unknown'
            };
        } catch (error) {
            console.error(`❌ 获取服务器 ${serverId} 状态失败:`, error);
            return WebSocketManager.getUnknownServerStatus();
        }
    }

    private async getPeerByServerId(serverId: number): Promise<Peer<AdapterInternal> | null> {
        try {
            // 从数据库获取服务器token
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

            if (server.length === 0) {
                console.warn(`⚠️  数据库未找到服务器 ${serverId}`);
                return null;
            }

            const serverToken = server[0].token;

            // 在连接的客户端中查找匹配的token
            for (const [peer, client] of this.clients.entries()) {
                if (client.token === serverToken && client.isAlive) {
                    return peer;
                }
            }

            return null;
        } catch (error) {
            console.error(`❌ 查找服务器 ${serverId} 的 peer 失败:`, error);
            return null;
        }
    }

    public getConnectedClients(): ClientInfo[] {
        return Array.from(this.clients.values());
    }

    // getClient：通过 peer 获取强绑定的 client，保证一定存在
    public getClient(peer: Peer<AdapterInternal>): ClientInfo {
        return this.getBoundClient(peer);
    }

    // getPeerByClient：通过 client 获取强绑定的 peer，保证一定存在
    public getPeerByClient(client: ClientInfo): Peer<AdapterInternal> {
        return this.getBoundPeer(client);
    }

    public broadcast<P = unknown>(method: string, params?: P) {
        const notification: JsonRpcRequest<P> = {
            jsonrpc: '2.0',
            method,
            id: null,
            params
        };

        const message = JSON.stringify(notification);

        this.clients.forEach((client, peer) => {
            try {
                client.peer.send(message);
            } catch (error) {
                console.error(`❌ 广播到客户端 ${peer} 失败:`, error);
            }
        });
    }

    public destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        this.pendingRequests.forEach((request) => {
            clearTimeout(request.timeout);
            request.reject(new Error('WebSocketManager destroyed'));
        });
        this.pendingRequests.clear();

        this.clients.forEach((client) => {
            try {
                client.peer.close();
            } catch (error) {
                console.error('❌ 关闭客户端连接出错:', error);
            }
        });
        this.clients.clear();
    }
    public getPeerByToken(token: string): boolean {
        return Array.from(this.clients.values()).some((client) => client.token === token);
    }

    public kickPlayerDirect(
        peer: Peer<AdapterInternal>,
        playerIdentifier: string,
        reason: string = 'You have been kicked'
    ) {
        const client = this.clients.get(peer);
        if (!client) {
            console.warn(`⚠️  无法踢出玩家: 未找到客户端 ${peer.id}`);
            return;
        }

        const notification: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'kick.player',
            params: {
                player: playerIdentifier,
                reason
            },
            id: null
        };

        try {
            peer.send(JSON.stringify(notification));
            console.log(`👢 已向 ${peer.id} 发送踢人指令: ${playerIdentifier}`);
        } catch (error) {
            console.error(`❌ 向 ${peer.id} 发送踢人指令失败:`, error);
        }
    }
}

// JSON-RPC 消息类型校验工具
function isValidJsonRpcRequest(obj: unknown): obj is JsonRpcRequest {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    if (o.jsonrpc !== '2.0') return false;
    if ('method' in o && typeof o.method !== 'string') return false;
    if ('id' in o && !(typeof o.id === 'string' || o.id === null)) return false;
    return true;
}

function isValidJsonRpcResponse(obj: unknown): obj is JsonRpcResponse {
    if (typeof obj !== 'object' || obj === null) return false;
    const o = obj as Record<string, unknown>;
    if (o.jsonrpc !== '2.0') return false;
    if (!('result' in o || 'error' in o)) return false;
    if (!('id' in o) || !(typeof o.id === 'string' || o.id === null)) return false;
    return true;
}
