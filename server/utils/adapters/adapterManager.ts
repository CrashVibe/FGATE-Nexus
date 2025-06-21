import { db } from '../../database/client';
import { eq } from 'drizzle-orm';
import { adapters as adaptersTable, onebot_adapters as onebotAdaptersTable, servers } from '../../database/schema';
import { onebotInstance } from './onebot/OnebotManager';
import { unifiedAdapterManager } from './core/UnifiedAdapterManager';
import type { InferSelectModel } from 'drizzle-orm';
import { Adapter, OnebotConnectionType } from './core/types';

/**
 * 通用适配器联合类型
 */
export interface AdapterUnion<T extends string, B = unknown, C = unknown> {
    id: number;
    type: T;
    adapterType: T;
    connected?: boolean;
    detail?: B;
    config?: C;
}

/**
 * OneBot 适配器联合类型
 */
export type OnebotAdapterUnion = AdapterUnion<
    Adapter.Onebot,
    InferSelectModel<typeof onebotAdaptersTable> & { connected: boolean },
    InferSelectModel<typeof onebotAdaptersTable>
>;

/**
 * 其他类型适配器联合类型
 */
export type OtherAdapterUnion = AdapterUnion<Adapter>;
export type AdapterUnionType = OnebotAdapterUnion | OtherAdapterUnion;

/**
 * 适配器管理器，负责适配器的增删查改和连接管理
 */
class AdapterManager {
    private static instance: AdapterManager;

    private constructor() {}

    /**
     * 获取单例实例
     */
    public static getInstance(): AdapterManager {
        if (!AdapterManager.instance) {
            AdapterManager.instance = new AdapterManager();
        }
        return AdapterManager.instance;
    }

    /**
     * 获取 onebot 适配器详细配置
     * @param adapterId 适配器 ID
     */
    private async getOnebotDetail(adapterId: number): Promise<InferSelectModel<typeof onebotAdaptersTable> | null> {
        return await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, adapterId)).get();
    }

    /**
     * 构建 onebot 适配器对象
     */
    private buildOnebotAdapter(
        adapter: { id: number },
        onebot: InferSelectModel<typeof onebotAdaptersTable>
    ): OnebotAdapterUnion {
        const connected = onebot.botId !== null ? onebotInstance.hasBot(onebot.botId) : false;
        return {
            id: adapter.id,
            type: Adapter.Onebot,
            adapterType: Adapter.Onebot,
            connected,
            detail: { ...onebot, connected },
            config: onebot
        };
    }

    /**
     * 构建其他类型适配器对象
     */
    private buildOtherAdapter(adapter: { id: number; type: string }): OtherAdapterUnion {
        return {
            id: adapter.id,
            type: adapter.type as Adapter,
            adapterType: adapter.type as Adapter
        };
    }

    /**
     * 根据适配器类型构建对象
     */
    private async buildAdapterUnion(adapter: { id: number; type: string }): Promise<AdapterUnionType | null> {
        if (adapter.type === Adapter.Onebot) {
            const onebot = await this.getOnebotDetail(adapter.id);
            return onebot ? this.buildOnebotAdapter(adapter, onebot) : null;
        }
        return this.buildOtherAdapter(adapter);
    }

    /**
     * 获取所有适配器配置
     */
    async getAllAdapters(): Promise<AdapterUnionType[]> {
        const allAdapters = await db.select().from(adaptersTable).all();
        const result: AdapterUnionType[] = [];
        for (const adapter of allAdapters) {
            const adapterUnion = await this.buildAdapterUnion(adapter);
            if (adapterUnion) {
                result.push(adapterUnion);
            }
        }
        return result;
    }

    /**
     * 获取单个适配器配置
     * @param id 适配器 ID
     */
    async getAdapter(id: number): Promise<AdapterUnionType | null> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        return adapter ? await this.buildAdapterUnion(adapter) : null;
    }

    /**
     * 通过 botId 获取 onebot 适配器配置
     * @param botId 机器人 ID
     */
    async getAdapterByBotId(botId: number): Promise<OnebotAdapterUnion | null> {
        const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.botId, botId)).get();
        if (!onebot) return null;
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, onebot.adapter_id)).get();
        return adapter ? this.buildOnebotAdapter(adapter, onebot) : null;
    }

    /**
     * 创建新 onebot 适配器配置
     * @param config 配置对象
     */
    async createAdapter(
        config: Omit<InferSelectModel<typeof onebotAdaptersTable>, 'adapter_id'> & { adapterType: Adapter }
    ): Promise<AdapterUnionType> {
        const adapterRow = await db.insert(adaptersTable).values({ type: config.adapterType }).returning().get();
        const onebot = await db
            .insert(onebotAdaptersTable)
            .values({ ...config, adapter_id: adapterRow.id })
            .returning()
            .get();
        // 如果是启用的正向连接，建立连接
        if (onebot.enabled && onebot.connectionType === OnebotConnectionType.Forward && onebot.forwardUrl) {
            const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
            try {
                await onebotForwardClient.createConnection({
                    adapterId: adapterRow.id,
                    url: onebot.forwardUrl,
                    accessToken: onebot.accessToken || undefined,
                    autoReconnect: onebot.autoReconnect ?? true,
                    responseTimeout: onebot.responseTimeout || 6000
                });
                console.log(`正向连接已建立: 适配器 ${adapterRow.id} -> ${onebot.forwardUrl}`);
            } catch (error) {
                console.error(`建立正向连接失败: 适配器 ${adapterRow.id}`, error);
            }
        }
        return this.buildOnebotAdapter(adapterRow, onebot);
    }

    /**
     * 更新 onebot 适配器配置
     * @param id 适配器 ID
     * @param config 更新内容
     */
    async updateAdapter(
        id: number,
        config: Partial<InferSelectModel<typeof onebotAdaptersTable>>
    ): Promise<AdapterUnionType | null> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter || adapter.type !== Adapter.Onebot) return null;
        console.log(`正在更新适配器 ${id}:`, config);
        const result = await db
            .update(onebotAdaptersTable)
            .set(config)
            .where(eq(onebotAdaptersTable.adapter_id, id))
            .returning()
            .get();
        if (!result) return null;
        // 处理连接状态变化
        const isNowEnabled = result.enabled;
        const isConfigChanged =
            config.botId !== undefined ||
            config.accessToken !== undefined ||
            config.connectionType !== undefined ||
            config.forwardUrl !== undefined;
        // 禁用适配器或者更改了关键配置时断开所有连接
        if (config.enabled === false || isConfigChanged) {
            console.log(`断开 Bot ${result.botId} 的连接`);
            if (result.botId !== null) {
                // 统一通过 disconnectBot 处理，避免重复断开
                onebotInstance.disconnectBot(result.botId);
            } else if (result.connectionType === OnebotConnectionType.Forward) {
                // 如果没有 botId，直接通过适配器 ID 断开正向连接
                try {
                    const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
                    onebotForwardClient.disconnect(id);
                    console.log(`正向连接已断开: 适配器 ${id}`);
                } catch (error) {
                    console.error(`断开正向连接失败: 适配器 ${id}`, error);
                }
            }
        }
        // 如果适配器启用且是正向连接，建立或更新正向连接
        if (isNowEnabled && result.connectionType === OnebotConnectionType.Forward && result.forwardUrl) {
            const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
            try {
                await onebotForwardClient.updateConfig({
                    adapterId: id,
                    url: result.forwardUrl,
                    accessToken: result.accessToken || undefined,
                    autoReconnect: result.autoReconnect ?? true,
                    responseTimeout: result.responseTimeout || 6000
                });
                console.log(`正向连接配置已更新: 适配器 ${id} -> ${result.forwardUrl}`);
            } catch (error) {
                console.error(`更新正向连接配置失败: 适配器 ${id}`, error);
            }
        }
        return this.buildOnebotAdapter({ id }, result);
    }

    /**
     * 删除适配器配置
     * @param id 适配器 ID
     */
    async deleteAdapter(id: number): Promise<boolean> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter) return false;
        try {
            await db.update(servers).set({ adapter_id: null }).where(eq(servers.adapter_id, id));
            if (adapter.type === Adapter.Onebot) {
                const onebot = await this.getOnebotDetail(id);
                if (onebot) {
                    if (onebot.botId !== null) {
                        // 统一通过 disconnectBot 处理，避免重复断开
                        onebotInstance.disconnectBot(onebot.botId);
                    } else if (onebot.connectionType === OnebotConnectionType.Forward) {
                        // 如果没有 botId，直接通过适配器 ID 断开正向连接
                        try {
                            const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
                            onebotForwardClient.disconnect(id);
                            console.log(`正向连接已断开: 适配器 ${id}`);
                        } catch (error) {
                            console.error(`断开正向连接失败: 适配器 ${id}`, error);
                        }
                    }
                }
                await db.delete(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id));
            }
            await db.delete(adaptersTable).where(eq(adaptersTable.id, id));
            return true;
        } catch (error) {
            console.error('Failed to delete adapter:', error);
            return false;
        }
    }

    /**
     * 启用/禁用适配器（仅 onebot）
     * @param id 适配器 ID
     * @param enabled 是否启用
     */
    async setAdapterStatus(id: number, enabled: boolean): Promise<boolean> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter || adapter.type !== Adapter.Onebot) return false;
        try {
            const onebot = await this.getOnebotDetail(id);
            if (!onebot) return false;
            await db.update(onebotAdaptersTable).set({ enabled }).where(eq(onebotAdaptersTable.adapter_id, id));
            if (!enabled) {
                if (onebot.botId !== null) {
                    // 统一通过 disconnectBot 处理，避免重复断开
                    onebotInstance.disconnectBot(onebot.botId);
                } else if (onebot.connectionType === OnebotConnectionType.Forward) {
                    // 如果没有 botId，直接通过适配器 ID 断开正向连接
                    try {
                        const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
                        onebotForwardClient.disconnect(id);
                        console.log(`正向连接已断开: 适配器 ${id}`);
                    } catch (error) {
                        console.error(`断开正向连接失败: 适配器 ${id}`, error);
                    }
                }
            } else if (onebot.connectionType === OnebotConnectionType.Forward && onebot.forwardUrl) {
                const { onebotForwardClient } = await import('./onebot/OnebotForwardClient');
                try {
                    await onebotForwardClient.createConnection({
                        adapterId: id,
                        url: onebot.forwardUrl,
                        accessToken: onebot.accessToken || undefined,
                        autoReconnect: onebot.autoReconnect ?? true,
                        responseTimeout: onebot.responseTimeout || 6000
                    });
                    console.log(`正向连接已建立: 适配器 ${id} -> ${onebot.forwardUrl}`);
                } catch (error) {
                    console.error(`建立正向连接失败: 适配器 ${id}`, error);
                }
            }
            return true;
        } catch (error) {
            console.error('Failed to update adapter status:', error);
            return false;
        }
    }

    /**
     * 获取所有适配器的连接状态统计
     * @returns 连接状态统计数组
     */
    getConnectionStats(): { type: string; totalConfigured: number; connected: number }[] {
        const allConnections = unifiedAdapterManager.getAllConnections();
        const stats: { [key: string]: { totalConfigured: number; connected: number } } = {};
        for (const { type, connections } of allConnections) {
            if (!stats[type]) {
                stats[type] = { totalConfigured: 0, connected: connections.length };
            } else {
                stats[type].connected = connections.length;
            }
        }
        // TODO: 可以添加从数据库查询总配置数的逻辑
        // 目前只返回连接统计
        return Object.entries(stats).map(([type, data]) => ({
            type,
            totalConfigured: data.totalConfigured,
            connected: data.connected
        }));
    }
}

/**
 * 适配器管理器单例
 */
export const adapterManager = AdapterManager.getInstance();
