import { v4 as uuidv4 } from 'uuid';
import { MinecraftClientManager } from './client/minecraft-client-manager';
import type { AdapterInternal, Peer } from 'crossws';
import type { ClientInfo, JsonRpcRequest, JsonRpcResponse, PendingRequest } from './client/type';

export class WebSocketManager {
    private static instance: WebSocketManager;
    private clients = new Map<Peer<AdapterInternal>, ClientInfo>();
    private pendingRequests = new Map<string, PendingRequest>();
    private minecraftManager: MinecraftClientManager;
    private heartbeatInterval: NodeJS.Timeout | null = null;

    private constructor() {
        this.minecraftManager = new MinecraftClientManager();
    }

    // 单例模式
    public static getInstance(): WebSocketManager {
        if (!WebSocketManager.instance) {
            WebSocketManager.instance = new WebSocketManager();
        }
        return WebSocketManager.instance;
    }

    getClientIdByPeer(peer: Peer<AdapterInternal>): string | undefined {
        return this.clients.get(peer)?.id;
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

        console.log(`📱 New client connected: ${clientId} (version: ${clientVersion})`);

        this.requestClientInfo(peer);
    }

    handleMessage(peer: Peer<AdapterInternal>, message: string) {
        try {
            const data: JsonRpcRequest = JSON.parse(message);

            if (data.jsonrpc !== '2.0') {
                this.sendError(peer, -32600, 'Invalid Request', data.id ?? null);
                return;
            }

            // 处理响应消息（有result或error字段）
            if ('result' in data || 'error' in data) {
                this.handleResponse(peer, data as JsonRpcResponse);
                return;
            }

            // 处理请求消息（有method字段）
            if (data.method) {
                this.handleRequest(peer, data);
                return;
            }

            this.sendError(peer, -32600, 'Invalid Request', data.id ?? null);
        } catch (error) {
            console.error(`❌ Error parsing message from client ${peer.id}:`, error);
            this.sendError(peer, -32700, 'Parse error', null);
        }
    }

    private handleRequest(peer: Peer<AdapterInternal>, request: JsonRpcRequest) {
        const client = this.clients.get(peer);
        if (!client) return;

        console.log(`📨 Received request from ${peer.id}: ${request.method}`);

        switch (request.method) {
            case 'player.join':
                this.handlePlayerJoin(peer, request.params);
                break;

            case 'heartbeat':
                if (!request.id) {
                    this.sendError(peer, -32600, 'Invalid Request', null);
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

    private handlePlayerJoin(peer: Peer<AdapterInternal>, params: any) {
        const clientId = this.getClientIdByPeer(peer);
        if (!clientId) {
            console.warn(`⚠️  Invalid player join data from ${peer.id}`);
            return;
        }

        if (!params?.player || !params?.uuid) {
            console.warn(`⚠️  Invalid player join data from ${clientId}`);
            return;
        }

        console.log(`🎮 Player joined on ${clientId}: ${params.player} (${params.uuid})`);
        // 简化版本：移除复杂的玩家行为检查
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
            console.log(`📱 断开连接: ${client.id}, 代码: ${code}, 原因: ${reason}`);
            this.clients.delete(peer);
            this.minecraftManager.removeClient(peer);
        }
    }

    // 发送JSON-RPC请求到客户端
    private sendRequest(peer: Peer<AdapterInternal>, method: string, params?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const id = uuidv4();
            const request: JsonRpcRequest = {
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
                resolve: (value: any) => resolve(value),
                reject,
                timeout
            });

            try {
                peer.send(JSON.stringify(request));
                console.log(`📤 Sent request to ${peer.id}: ${method} (ID: ${id})`);
            } catch (error) {
                this.pendingRequests.delete(id);
                clearTimeout(timeout);
                reject(error);
            }
        });
    }

    // 发送JSON-RPC响应
    private sendResponse(peer: Peer<AdapterInternal>, id: string | null, result?: any, error?: any) {
        const client = this.clients.get(peer);
        if (!client) {
            console.warn(`无法发送响应到客户端 ${peer.id}: 客户端未连接`);
            return;
        }

        const response: JsonRpcResponse = {
            jsonrpc: '2.0',
            id
        };

        if (error) {
            response.error = error;
        } else {
            response.result = result;
        }

        try {
            peer.send(JSON.stringify(response));
        } catch (error) {
            console.error(`无法发送响应到客户端 ${client.id}:`, error);
        }
    }

    // 发送错误响应
    private sendError(peer: Peer<AdapterInternal>, code: number, message: string, id: string | null, data?: any) {
        this.sendResponse(peer, id, undefined, { code, message, data });
    }

    // 请求客户端信息
    private async requestClientInfo(peer: Peer<AdapterInternal>) {
        try {
            const result = await this.sendRequest(peer, 'get.client.info');
            // 查看result类型
            const minecraft_version = result.data.minecraft_version;
            const minecraft_software = result.data.minecraft_software;
            const supports_papi = result.data.supports_papi;
            const supports_rcon = result.data.supports_rcon;

            if (!minecraft_version || !minecraft_software || typeof supports_papi !== 'boolean' || typeof supports_rcon !== 'boolean') {
                console.warn(result.data);
                console.warn(`⚠️ 警告: 客户端 ${peer.id} 未提供完整的客户端信息`);
                return;
            }
            // 写入数据库
            const client = this.clients.get(peer);
            if (client) {
                client.serverInfo = {
                    minecraft_version,
                    server_type: minecraft_software,
                    supports_papi,
                    supports_rcon
                };
                this.minecraftManager.updateClientInfo(peer, client);
            } else {
                console.warn(`⚠️  无法更新客户端信息: 客户端 ${peer.id} 未找到`);
                return;
            }
            console.log(`📊 Received client info from ${peer.id}:`, client.serverInfo);
        } catch (error) {
            console.error(`❌ Failed to get client info from ${peer.id}:`, error);
        }
    }

    // 根据服务器ID踢出玩家
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
                params: {
                    player: playerIdentifier,
                    reason
                }
            };

            peer.send(JSON.stringify(notification));
            console.log(`👢 Sent kick command to server ${serverId} for player: ${playerIdentifier}`);
            return { success: true };
        } catch (error) {
            console.error(`❌ Failed to kick player on server ${serverId}:`, error);
            return { success: false, error: String(error) };
        }
    }

    // 根据服务器ID断开连接
    public async disconnectServer(serverId: number): Promise<{ success: boolean; error?: string }> {
        try {
            const peer = await this.getPeerByServerId(serverId);
            if (!peer) {
                return { success: false, error: '服务器未连接' };
            }

            const client = this.clients.get(peer);
            if (client) {
                console.log(`🔌 Disconnecting server ${serverId} (${client.id})`);
                this.clients.delete(peer);
                this.minecraftManager.removeClient(peer);
                peer.close();
                return { success: true };
            }

            return { success: false, error: '服务器客户端未找到' };
        } catch (error) {
            console.error(`❌ Failed to disconnect server ${serverId}:`, error);
            return { success: false, error: String(error) };
        }
    }

    // 根据服务器ID获取服务器状态
    public async getServerStatus(serverId: number): Promise<any> {
        try {
            const peer = await this.getPeerByServerId(serverId);
            if (!peer) {
                return {
                    isOnline: false,
                    playerCount: 0,
                    lastSeen: null,
                    supportsRcon: false,
                    software: 'Unknown',
                    version: 'Unknown'
                };
            }

            const client = this.clients.get(peer);
            if (!client) {
                return {
                    isOnline: false,
                    playerCount: 0,
                    lastSeen: null,
                    supportsRcon: false,
                    software: 'Unknown',
                    version: 'Unknown'
                };
            }

            return {
                isOnline: client.isAlive,
                playerCount: client.playerCount || 0,
                lastSeen: new Date(client.lastPing),
                supportsRcon: client.serverInfo?.supports_papi || false,
                software: client.serverInfo?.server_type || 'Unknown',
                version: client.serverInfo?.minecraft_version || 'Unknown'
            };
        } catch (error) {
            console.error(`❌ Failed to get server status for ${serverId}:`, error);
            return {
                isOnline: false,
                playerCount: 0,
                lastSeen: null,
                supportsRcon: false,
                software: 'Unknown',
                version: 'Unknown'
            };
        }
    }

    // 根据服务器ID获取对应的peer
    private async getPeerByServerId(serverId: number): Promise<Peer<AdapterInternal> | null> {
        try {
            // 从数据库获取服务器token
            const { db } = await import('../database/client');
            const { servers } = await import('../database/schema');
            const { eq } = await import('drizzle-orm');

            const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

            if (server.length === 0) {
                console.warn(`⚠️  Server ${serverId} not found in database`);
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
            console.error(`❌ Error finding peer for server ${serverId}:`, error);
            return null;
        }
    }

    // 获取所有连接的客户端
    public getConnectedClients(): ClientInfo[] {
        return Array.from(this.clients.values());
    }

    // 根据ID获取客户端
    public getClient(peer: Peer<AdapterInternal>): ClientInfo | undefined {
        return this.clients.get(peer);
    }

    // 广播消息到所有客户端
    public broadcast(method: string, params?: any) {
        const notification: JsonRpcRequest = {
            jsonrpc: '2.0',
            method,
            params
        };

        const message = JSON.stringify(notification);

        this.clients.forEach((client, peer) => {
            try {
                client.peer.send(message);
            } catch (error) {
                console.error(`❌ Failed to broadcast to client ${peer}:`, error);
            }
        });
    }

    // 清理资源
    public destroy() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }

        // 清理所有待处理的请求
        this.pendingRequests.forEach((request) => {
            clearTimeout(request.timeout);
            request.reject(new Error('WebSocketManager destroyed'));
        });
        this.pendingRequests.clear();

        // 关闭所有连接
        this.clients.forEach((client) => {
            try {
                client.peer.close();
            } catch (error) {
                console.error('❌ Error closing client connection:', error);
            }
        });
        this.clients.clear();
    }
    public getPeerByToken(token: string): boolean {
        return Array.from(this.clients.values()).some((client) => client.token === token);
    }

    // 踢出玩家（直接使用peer）
    public kickPlayerDirect(
        peer: Peer<AdapterInternal>,
        playerIdentifier: string,
        reason: string = 'You have been kicked'
    ) {
        const client = this.clients.get(peer);
        if (!client) {
            console.warn(`⚠️  Cannot kick player: client ${peer.id} not found`);
            return;
        }

        const notification: JsonRpcRequest = {
            jsonrpc: '2.0',
            method: 'kick.player',
            params: {
                player: playerIdentifier,
                reason
            }
        };

        try {
            peer.send(JSON.stringify(notification));
            console.log(`👢 Sent kick command to ${peer.id} for player: ${playerIdentifier}`);
        } catch (error) {
            console.error(`❌ Failed to send kick command to ${peer.id}:`, error);
        }
    }
}
