// server/utils/adapters/core/UnifiedAdapterManager.ts
import type { Peer, AdapterInternal } from 'crossws';
import { onebotInstance } from '../onebot/OnebotManager';
import type { AdapterConnection } from './BaseAdapter';
import { Adapter } from './types';

interface AdapterManagerMapping {
    [key: string]: {
        handleConnection: (peer: Peer<AdapterInternal>) => Promise<boolean>;
        handleMessage: (peer: Peer<AdapterInternal>, message: { text(): string }) => boolean;
        handleClose: (peer: Peer<AdapterInternal>) => void;
        getAllConnections: () => AdapterConnection[];
    };
}

class UnifiedAdapterManager {
    private static instance: UnifiedAdapterManager;
    private adapterManagers: AdapterManagerMapping = {};

    private constructor() {
        // 注册 OneBot 适配器管理器
        this.registerAdapterManager(Adapter.Onebot, {
            handleConnection: (peer) => onebotInstance.handleConnection(peer),
            handleMessage: (peer, message) => onebotInstance.handleMessage(peer, message),
            handleClose: (peer) => onebotInstance.handleClose(peer),
            getAllConnections: () => onebotInstance.getAllBotConnections()
        });
    }

    public static getInstance(): UnifiedAdapterManager {
        if (!UnifiedAdapterManager.instance) {
            UnifiedAdapterManager.instance = new UnifiedAdapterManager();
        }
        return UnifiedAdapterManager.instance;
    }

    // 注册适配器管理器
    registerAdapterManager(type: string, manager: AdapterManagerMapping[string]): void {
        this.adapterManagers[type] = manager;
        console.log(`适配器管理器 ${type} 已注册`);
    }

    // 获取适配器类型（通过检查请求头或其他方式）
    private getAdapterType(peer: Peer<AdapterInternal>): string {
        // OneBot 适配器通过 X-Self-ID 头识别
        if (peer.request.headers.get('x-self-id')) {
            return Adapter.Onebot;
        }

        // 可以添加其他适配器类型的识别逻辑
        // 例如: Discord Bot, Telegram Bot 等

        return 'unknown';
    }

    // 统一处理连接
    async handleConnection(peer: Peer<AdapterInternal>): Promise<boolean> {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (!manager) {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
            peer.close(4000, '不支持的适配器类型');
            return false;
        }

        return manager.handleConnection(peer);
    }

    // 统一处理消息
    handleMessage(peer: Peer<AdapterInternal>, message: { text(): string }): boolean {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (!manager) {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
            peer.close(4000, '不支持的适配器类型');
            return false;
        }

        return manager.handleMessage(peer, message);
    }

    // 统一处理连接关闭
    handleClose(peer: Peer<AdapterInternal>): void {
        const adapterType = this.getAdapterType(peer);
        const manager = this.adapterManagers[adapterType];

        if (manager) {
            manager.handleClose(peer);
        } else {
            console.warn(`未找到适配器类型 ${adapterType} 的管理器`);
        }
    }

    // 获取所有连接状态
    getAllConnections(): { type: string; connections: AdapterConnection[] }[] {
        const result: { type: string; connections: AdapterConnection[] }[] = [];

        for (const [type, manager] of Object.entries(this.adapterManagers)) {
            result.push({
                type,
                connections: manager.getAllConnections()
            });
        }

        return result;
    }

    // 获取特定类型的连接
    getConnectionsByType(type: string): AdapterConnection[] {
        const manager = this.adapterManagers[type];
        return manager ? manager.getAllConnections() : [];
    }

    // 获取支持的适配器类型
    getSupportedAdapterTypes(): string[] {
        return Object.keys(this.adapterManagers);
    }
}

export const unifiedAdapterManager = UnifiedAdapterManager.getInstance();
