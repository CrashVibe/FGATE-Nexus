import type { AdapterInternal, Peer } from 'crossws';
import type { ClientInfo } from './type';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';
import { eq } from 'drizzle-orm';

export class MinecraftClientManager {
    private clients = new Map<Peer<AdapterInternal>, ClientInfo>();

    constructor() {
        this.setupCleanupJob();
    }

    // 更新客户端信息
    updateClientInfo(peer: Peer<AdapterInternal>, client: ClientInfo) {
        this.clients.set(peer, client);
        // 更新数据库
        db.update(servers)
            .set({
                software: client.serverInfo?.server_type || null,
                version: client.serverInfo?.minecraft_version || null
            })
            .where(eq(servers.token, client.token))
            .execute();
        console.log(`📊 Updated client ${peer.id}:`, client.serverInfo);
    }

    // 移除客户端
    removeClient(peer: Peer<AdapterInternal>) {
        const client = this.clients.get(peer);
        if (client) {
            client.isAlive = false;
            client.lastPing = Date.now();
            console.log(`📱 Client ${client.id} marked as offline`);
        }
    }

    // 获取所有在线客户端
    getOnlineClients(): ClientInfo[] {
        return Array.from(this.clients.values()).filter((client) => client.isAlive);
    }

    // 获取客户端信息
    getClient(peer: Peer<AdapterInternal>): ClientInfo | undefined {
        return this.clients.get(peer);
    }

    // 获取所有客户端统计信息
    getStats() {
        const clients = Array.from(this.clients.values());
        const onlineClients = clients.filter((c) => c.isAlive);

        return {
            totalClients: clients.length,
            onlineClients: onlineClients.length,
            totalPlayers: onlineClients.reduce((sum, c) => sum + c.playerCount, 0),
            serverTypes: this.getServerTypeStats(onlineClients)
        };
    }

    // 获取服务器类型统计
    private getServerTypeStats(clients: ClientInfo[]) {
        const stats: Record<string, number> = {};

        clients.forEach((client) => {
            if (client.serverInfo?.server_type) {
                const type = client.serverInfo.server_type;
                stats[type] = (stats[type] || 0) + 1;
            }
        });

        return stats;
    }

    // 设置清理任务
    private setupCleanupJob() {
        // 每5分钟清理一次过期数据
        setInterval(
            () => {
                this.cleanupExpiredData();
            },
            5 * 60 * 1000
        );
    }

    // 清理过期数据
    private cleanupExpiredData() {
        const now = Date.now();
        const maxAge = 24 * 60 * 60 * 1000; // 24小时

        // 清理离线超过24小时的客户端
        this.clients.forEach((client, clientId) => {
            if (!client.isAlive && now - client.lastPing > maxAge) {
                this.clients.delete(clientId);
                console.log(`🗑️  Cleaned up expired client: ${clientId}`);
            }
        });
    }
}