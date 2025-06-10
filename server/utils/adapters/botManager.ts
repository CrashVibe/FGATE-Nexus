// server/utils/botManager.ts
import type { WebSocket } from 'ws';

interface BotConnection {
    ws: WebSocket;
    botId: number;
    connectedAt: Date;
    isActive: boolean;
    lastHeartbeat: Date;
}

class BotManager {
    private connections: Map<number, BotConnection> = new Map();
    private allowedBots: Set<number>; // 允许连接的QQ号名单

    constructor(allowedBots: number[] = []) {
        this.allowedBots = new Set(allowedBots);
    }

    addConnection(botId: number, ws: WebSocket): boolean {
        if (!this.allowedBots.has(botId)) {
            console.warn(`未授权的机器人尝试连接: ${botId}`);
            return false;
        }

        this.connections.set(botId, {
            ws,
            botId,
            connectedAt: new Date(),
            isActive: true,
            lastHeartbeat: new Date()
        });
        console.log(`机器人 ${botId} 已连接`);
        return true;
    }

    removeConnection(botId: number): void {
        if (this.connections.has(botId)) {
            this.connections.delete(botId);
            console.log(`机器人 ${botId} 已断开`);
        }
    }

    getConnection(botId: number): BotConnection | undefined {
        return this.connections.get(botId);
    }

    getAllConnections(): BotConnection[] {
        return Array.from(this.connections.values());
    }

    updateHeartbeat(botId: number): void {
        const conn = this.connections.get(botId);
        if (conn) {
            conn.lastHeartbeat = new Date();
            conn.isActive = true;
        }
    }

    verifyBot(botId: number): boolean {
        return this.allowedBots.has(botId);
    }
    addAllowedBot(botId: number): void {
        this.allowedBots.add(botId);
    }

    removeAllowedBot(botId: number): void {
        this.allowedBots.delete(botId);
        if (this.connections.has(botId)) {
            const connection = this.connections.get(botId);
            if (connection) {
                connection.ws.close();
            }
        }
    }

    getAllAllowedBots(): number[] {
        return Array.from(this.allowedBots);
    }
}

export const botManager = new BotManager();

botManager.addAllowedBot(2959431457);
