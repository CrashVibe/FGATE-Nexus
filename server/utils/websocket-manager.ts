import { v4 as uuidv4 } from 'uuid';
import { MinecraftClientManager } from './client/minecraft-client-manager';
import type { AdapterInternal, Peer } from 'crossws';
import type { ClientInfo, JsonRpcRequest, JsonRpcResponse, PendingRequest } from './client/type';
import type { GetClientInfoResult } from '../shared/types/server/client-info';

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

        console.log(`📱 新客户端已连接: ${clientId} - 版本: ${clientVersion}`);
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
            console.error(`[FAILED] 解析消息失败: 客户端 ${peer.id} -`, error);
            this.sendError(peer, -32700, 'Parse error', null);
        }
    }

    private async handleRequest(peer: Peer<AdapterInternal>, request: JsonRpcRequest) {
        const client = this.clients.get(peer);
        if (!client) return;

        console.log(`📨 收到请求: ${peer.id} - ${request.method}`);

        switch (request.method) {
            case 'player.join':
                if (
                    typeof request.params === 'object' &&
                    request.params !== null &&
                    typeof (request.params as { player?: unknown }).player === 'string' &&
                    typeof (request.params as { uuid?: unknown }).uuid === 'string'
                ) {
                    const params = request.params as { player: string; uuid: string; ip: string | null };
                    await this.handlePlayerJoin(peer, params, request.id ?? null);
                } else {
                    this.sendError(peer, -32602, '参数无效', request.id ?? null);
                }
                break;

            case 'player.bind':
                if (
                    typeof request.params === 'object' &&
                    request.params !== null &&
                    typeof (request.params as { playerName?: unknown }).playerName === 'string' &&
                    typeof (request.params as { playerUUID?: unknown }).playerUUID === 'string'
                ) {
                    const params = request.params as { playerName: string; playerUUID: string };
                    await this.handlePlayerBind(peer, params, request.id ?? null);
                } else {
                    this.sendError(peer, -32602, '参数无效', request.id ?? null);
                }
                break;

            case 'mc.chat':
                if (
                    typeof request.params === 'object' &&
                    request.params !== null &&
                    typeof (request.params as { player?: unknown }).player === 'string' &&
                    typeof (request.params as { message?: unknown }).message === 'string'
                ) {
                    const params = request.params as { player: string; message: string; timestamp?: number };
                    await this.handleMinecraftChat(peer, params, request.id ?? null);
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
        params: { player: string; uuid: string; ip: string | null },
        requestId: string | null
    ) {
        const clientId = this.getClientIdByPeer(peer);
        if (!clientId) {
            console.warn(`[WARNING] 无法处理玩家加入请求: 来自 ${peer.id}`);
            this.sendError(peer, -32000, '无法找到客户端信息', requestId);
            return;
        }

        if (!params?.player || !params?.uuid) {
            console.warn(`[WARNING] 玩家加入请求参数无效: 来自 ${clientId}`);
            this.sendError(peer, -32602, '玩家参数无效', requestId);
            return;
        }

        console.log(`🎮 收到玩家加入请求: ${clientId} - ${params.player} (${params.uuid}) IP: ${params.ip}`);

        try {
            // 统一导入所需模块
            const { db } = await import('../database/client');
            const { servers, players } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');
            const { BindingConfigManager } = await import('../utils/config/bindingConfigManager');

            // 通过 token 查找服务器 ID
            const client = this.clients.get(peer);
            if (!client) {
                this.sendError(peer, -32000, '客户端信息丢失', requestId);
                return;
            }

            const serverRow = await db.select().from(servers).where(eq(servers.token, client.token)).limit(1);
            if (!serverRow.length) {
                this.sendError(peer, -32000, '服务器配置未找到', requestId);
                return;
            }

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

                console.log(`[INFO] 玩家信息已更新: ${params.player} (${params.uuid}) IP: ${params.ip}`);
            } else {
                // 创建新玩家记录
                await db.insert(players).values({
                    name: params.player,
                    uuid: params.uuid,
                    ip: params.ip,
                    servers: serverId.toString(),
                    socialAccountId: null
                });

                console.log(`✨ 新玩家记录已创建: ${params.player} (${params.uuid}) IP: ${params.ip}`);
            }

            // 2. 获取绑定配置并进行强制绑定校验
            const bindingConfigManager = BindingConfigManager.getInstance(serverId);
            const config = await bindingConfigManager.getConfig();
            if (config && config.forceBind) {
                // 重新查询玩家信息以获取最新的绑定状态
                const playerRows = await db.select().from(players).where(eq(players.uuid, params.uuid)).limit(1);
                const player = playerRows[0];
                if (!player || !player.socialAccountId) {
                    // 未绑定，生成验证码并回应踢出
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

                            console.log(`🔐 已生成绑定验证码: ${params.player} - ${bindingResult.code}`);
                        } else {
                            kickMessage = kickMessage
                                .replace('#name', params.player)
                                .replace('#cmd_prefix', `${config.prefix}验证码`)
                                .replace('#code', '验证码')
                                .replace('#time', `${config.codeExpire}分钟`);

                            console.log(`[FAILED] 验证码生成失败: ${params.player} - ${bindingResult.message}`);
                        }

                        this.sendResponse(peer, requestId, { action: 'kick', reason: kickMessage });
                        console.log(`⛔ 玩家未绑定，已踢出: ${params.player}`);
                    } catch (error) {
                        console.error(`[FAILED] 生成绑定验证码失败:`, error);
                        const kickMessage = config.kickMsg
                            .replace('#name', params.player)
                            .replace('#cmd_prefix', `${config.prefix}验证码`)
                            .replace('#code', '验证码')
                            .replace('#time', `${config.codeExpire}分钟`);
                        this.sendResponse(peer, requestId, { action: 'kick', reason: kickMessage });
                        console.log(`⛔ 玩家未绑定，验证码生成失败，已踢出: ${params.player}`);
                    }
                    return;
                }
            }

            // 允许玩家加入
            this.sendResponse(peer, requestId, { action: 'allow' });
        } catch (err) {
            console.error(`[FAILED] 处理玩家加入请求失败:`, err);
            this.sendError(peer, -32000, '处理玩家加入事件时出错', requestId);
        }
    }

    private async handlePlayerBind(
        peer: Peer<AdapterInternal>,
        params: { playerName: string; playerUUID: string },
        requestId: string | null
    ) {
        const clientId = this.getClientIdByPeer(peer);
        if (!clientId) {
            console.warn(`[WARNING] 无法处理玩家绑定请求: 来自 ${peer.id}`);
            this.sendError(peer, -32000, '无法找到客户端信息', requestId);
            return;
        }

        if (!params?.playerName || !params?.playerUUID) {
            console.warn(`[WARNING] 玩家绑定请求参数无效: 来自 ${clientId}`);
            this.sendError(peer, -32602, '玩家参数无效', requestId);
            return;
        }

        console.log(`[BINDING] 收到玩家绑定请求: ${clientId} - ${params.playerName} (${params.playerUUID})`);

        try {
            // 统一导入所需模块
            const { db } = await import('../database/client');
            const { servers, players } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');
            const { bindingManager } = await import('~/utils/bindingManager');

            // 通过 token 查找服务器 ID
            const client = this.clients.get(peer);
            if (!client) {
                this.sendError(peer, -32000, '客户端信息丢失', requestId);
                return;
            }

            const serverRow = await db.select().from(servers).where(eq(servers.token, client.token)).limit(1);
            if (!serverRow.length) {
                this.sendError(peer, -32000, '服务器配置未找到', requestId);
                return;
            }

            const serverId = serverRow[0].id;

            // 检查玩家是否已经绑定
            const existingPlayer = await db.select().from(players).where(eq(players.uuid, params.playerUUID)).limit(1);

            if (existingPlayer.length > 0 && existingPlayer[0].socialAccountId) {
                // 玩家已经绑定，返回成功状态
                this.sendResponse(peer, requestId, {
                    authCode: null,
                    message: '玩家已绑定',
                    alreadyBound: true
                });
                console.log(`[SUCCESS] 玩家已绑定: ${params.playerName} (${params.playerUUID})`);
                return;
            }

            // 为玩家生成验证码
            const tempSocialId = `minecraft_${params.playerUUID}`;
            const bindingResult = await bindingManager.addPendingBinding(serverId, params.playerName, tempSocialId);

            if (bindingResult.success && bindingResult.code) {
                // 返回验证码给客户端
                this.sendResponse(peer, requestId, {
                    authCode: bindingResult.code,
                    alreadyBound: false
                });
                console.log(`🔐 已生成绑定验证码: ${params.playerName} - ${bindingResult.code}`);
            } else {
                this.sendError(peer, -32000, bindingResult.message || '生成验证码失败', requestId);
                console.log(`[FAILED] 验证码生成失败: ${params.playerName} - ${bindingResult.message}`);
            }
        } catch (err) {
            console.error(`[FAILED] 处理玩家绑定请求失败:`, err);
            this.sendError(peer, -32000, '处理玩家绑定请求时出错', requestId);
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
            console.log(`📱 客户端已断开连接: ${client.id} - 代码: ${code}, 原因: ${reason}`);
            this.clients.delete(peer);
            this.minecraftManager.removeClient(peer);
        }
    }

    // 处理 MC 聊天消息
    private async handleMinecraftChat(
        peer: Peer<AdapterInternal>,
        params: { player: string; message: string; timestamp?: number },
        requestId: string | null
    ): Promise<void> {
        try {
            const client = this.clients.get(peer);
            if (!client) {
                this.sendError(peer, -32000, '客户端信息丢失', requestId);
                return;
            }

            // 通过 token 查找服务器 ID
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const serverRow = await db.select().from(servers).where(eq(servers.token, client.token)).limit(1);
            if (!serverRow.length) {
                this.sendError(peer, -32000, '服务器配置未找到', requestId);
                return;
            }

            const serverId = serverRow[0].id;

            // 使用统一的消息同步处理器，确保消息只入队一次
            const { messageSyncHandler } = await import('../handlers/message/messageSyncHandler');

            const result = await messageSyncHandler.handleMessage({
                serverId,
                content: params.message,
                sender: params.player,
                timestamp: new Date(params.timestamp || Date.now()),
                source: 'minecraft'
            });

            console.log(`💬 MC聊天消息已处理: ${params.player}: ${params.message} - ${result.message}`);
        } catch (error) {
            console.error(`[FAILED] 处理MC聊天消息失败:`, error);
            this.sendError(peer, -32000, '处理聊天消息时出错', requestId);
        }
    }

    // 广播消息到指定服务器的所有MC客户端
    public async broadcastToServer(serverId: string, message: string): Promise<void> {
        try {
            // 通过服务器ID查找对应的客户端连接
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const serverResult = await db
                .select()
                .from(servers)
                .where(eq(servers.id, parseInt(serverId)))
                .limit(1);
            if (!serverResult.length) {
                console.error(`[FAILED] 服务器不存在: ${serverId}`);
                return;
            }

            const serverToken = serverResult[0].token;

            // 查找使用该token的客户端连接
            const targetClient = Array.from(this.clients.values()).find((client) => client.token === serverToken);
            if (!targetClient) {
                console.warn(`[WARNING] 服务器未连接: ${serverId}`);
                return;
            }

            const targetPeer = this.getBoundPeer(targetClient);

            // 发送广播消息通知
            const notification: JsonRpcRequest = {
                jsonrpc: '2.0',
                method: 'broadcast.message',
                params: {
                    message
                },
                id: null
            };

            targetPeer.send(JSON.stringify(notification));
            console.log(`� 已向服务器 ${serverId} 广播消息: ${message}`);
        } catch (error) {
            console.error(`[FAILED] 广播消息到服务器失败: ${serverId}`, error);
        }
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
            console.warn(`[WARNING] 无法踢出玩家: 客户端 ${peer.id} 未找到`);
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
            console.error(`[FAILED] 向 ${peer.id} 发送踢人指令失败:`, error);
        }
    }

    // 通过服务器ID踢出玩家
    public async kickPlayerByServerId(
        serverId: string,
        playerName: string,
        reason: string = 'You have been kicked'
    ): Promise<{ success: boolean; error?: string }> {
        try {
            // 通过服务器ID查找对应的客户端连接
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const serverResult = await db
                .select()
                .from(servers)
                .where(eq(servers.id, parseInt(serverId)))
                .limit(1);
            if (!serverResult.length) {
                return { success: false, error: '服务器不存在' };
            }

            const serverToken = serverResult[0].token;

            // 查找使用该token的客户端连接
            const targetClient = Array.from(this.clients.values()).find((client) => client.token === serverToken);
            if (!targetClient) {
                return { success: false, error: '服务器未连接' };
            }

            const targetPeer = this.getBoundPeer(targetClient);
            this.kickPlayerDirect(targetPeer, playerName, reason);

            return { success: true };
        } catch (error) {
            console.error(`[FAILED] 通过服务器ID踢出玩家失败:`, error);
            return { success: false, error: error instanceof Error ? error.message : '未知错误' };
        }
    }

    // JSON-RPC 辅助方法
    private sendError(peer: Peer<AdapterInternal>, code: number, message: string, id: string | null): void {
        const error = {
            jsonrpc: '2.0',
            error: {
                code,
                message
            },
            id
        };

        try {
            peer.send(JSON.stringify(error));
            console.log(`[ERROR] 错误响应已发送: ${peer.id} - ${code}: ${message}`);
        } catch (sendError) {
            console.error(`[FAILED] 发送错误响应失败: ${peer.id}`, sendError);
        }
    }

    private sendResponse(peer: Peer<AdapterInternal>, id: string | null, result: unknown): void {
        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            result,
            id
        };

        try {
            peer.send(JSON.stringify(response));
            console.log(`[SUCCESS] 响应已发送: ${peer.id} - ID: ${id}`);
        } catch (error) {
            console.error(`[FAILED] 发送响应失败: ${peer.id}`, error);
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
                console.log(`[SEND] 请求已发送: ${peer.id} - ${method} (ID: ${id})`);
            } catch (error) {
                clearTimeout(timeout);
                this.pendingRequests.delete(id);
                reject(error);
            }
        });
    }

    private async requestClientInfo(peer: Peer<AdapterInternal>): Promise<ClientInfo | undefined> {
        try {
            const result = await this.sendRequest<GetClientInfoResult>(peer, 'get.client.info');
            if (
                !result.data ||
                typeof result.data.minecraft_version !== 'string' ||
                typeof result.data.minecraft_software !== 'string' ||
                typeof result.data.supports_papi !== 'boolean' ||
                typeof result.data.supports_rcon !== 'boolean'
            ) {
                console.warn(result.data);
                console.warn(`[WARNING] 客户端信息不完整: ${peer.id}`);
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
                console.log(`[INFO] 客户端信息已接收: ${peer.id} -`, client.serverInfo);
                return client;
            } else {
                console.warn(`[WARNING] 无法更新客户端信息: ${peer.id} 未找到`);
                return;
            }
        } catch (error) {
            console.error(`[FAILED] 获取客户端信息失败: ${peer.id} -`, error);
        }
    }
    public async getServerStatus(serverId: number) {
        try {
            // 通过服务器ID查找对应的token
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const serverResult = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

            if (!serverResult.length) {
                console.warn(`[WARNING] 服务器不存在: ${serverId}`);
                return null;
            }

            const serverToken = serverResult[0].token;

            // 通过token查找客户端
            const client = Array.from(this.clients.values()).find((c) => c.token === serverToken);
            if (!client) {
                console.warn(`[WARNING] 未找到服务器ID为 ${serverId} 的客户端连接`);
                return null;
            }

            const clientInfo = await this.requestClientInfo(client.peer);
            if (!clientInfo) {
                console.warn(`[WARNING] 获取服务器状态失败: ${serverId}`);
                return null;
            }
            return clientInfo;
        } catch (error) {
            console.error(`[FAILED] 获取服务器状态失败: ${serverId}`, error);
            return null;
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
