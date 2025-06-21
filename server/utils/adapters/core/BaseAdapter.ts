// server/utils/adapters/BaseAdapter.ts
import type { Peer, AdapterInternal } from 'crossws';

export interface AdapterConnection {
    peer: Peer<AdapterInternal>;
    adapterId: number;
    type: string;
    connectedAt: Date;
    isActive: boolean;
    lastHeartbeat: Date;
    metadata?: Record<string, unknown>;
}

export abstract class BaseAdapterManager {
    protected connections: Map<string, AdapterConnection> = new Map();

    // 生成连接标识符（适配器类型 + ID）
    protected getConnectionKey(type: string, id: string | number): string {
        return `${type}:${id}`;
    }

    // 检查连接是否存在
    protected hasConnection(type: string, id: string | number): boolean {
        return this.connections.has(this.getConnectionKey(type, id));
    }

    // 添加连接
    protected addAdapterConnection(connection: AdapterConnection): boolean {
        const key = this.getConnectionKey(connection.type, connection.adapterId);
        this.connections.set(key, connection);
        console.log(`适配器 ${connection.type}:${connection.adapterId} 已连接`);
        return true;
    }

    // 移除连接
    protected removeAdapterConnection(type: string, id: string | number): void {
        const key = this.getConnectionKey(type, id);
        if (this.connections.has(key)) {
            this.connections.delete(key);
            console.log(`适配器 ${type}:${id} 已断开`);
        }
    }

    // 主动断开连接
    protected disconnectAdapter(type: string, id: string | number): void {
        const key = this.getConnectionKey(type, id);
        const connection = this.connections.get(key);
        if (connection) {
            try {
                connection.peer.close(4000, 'adapter disabled or removed');
            } catch {
                // ignore
            }
            this.removeAdapterConnection(type, id);
        }
    }

    // 获取连接信息
    protected getAdapterConnection(type: string, id: string | number): AdapterConnection | undefined {
        return this.connections.get(this.getConnectionKey(type, id));
    }

    // 获取指定类型的所有连接
    protected getConnectionsByType(type: string): AdapterConnection[] {
        return Array.from(this.connections.values()).filter((conn) => conn.type === type);
    }

    // 获取所有连接
    protected getAllAdapterConnections(): AdapterConnection[] {
        return Array.from(this.connections.values());
    }

    // 更新心跳
    protected updateConnectionHeartbeat(type: string, id: string | number): void {
        const key = this.getConnectionKey(type, id);
        const conn = this.connections.get(key);
        if (conn) {
            conn.lastHeartbeat = new Date();
            conn.isActive = true;
        }
    }

    // 抽象方法：处理特定类型的连接验证
    abstract handleConnection(peer: Peer<AdapterInternal>): Promise<boolean>;

    // 抽象方法：处理特定类型的消息
    abstract handleMessage(peer: Peer<AdapterInternal>, message: { text(): string }): boolean;

    // 抽象方法：处理连接关闭
    abstract handleClose(peer: Peer<AdapterInternal>): void;
}
