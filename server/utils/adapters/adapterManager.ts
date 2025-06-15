import { db } from '../../database/client';
import { eq } from 'drizzle-orm';
import { adapters as adaptersTable, onebot_adapters as onebotAdaptersTable, servers } from '../../database/schema';
import { onebotInstance } from './onebot/OnebotManager';
import { unifiedAdapterManager } from './core/UnifiedAdapterManager';
import type { InferSelectModel } from 'drizzle-orm';

// 适配器联合类型定义
export interface AdapterUnion<T extends string, B = unknown, C = unknown> {
    id: number;
    type: T;
    adapterType: T;
    connected?: boolean;
    detail?: B;
    config?: C;
}

export type OnebotAdapterUnion = AdapterUnion<
    Adapter.Onebot,
    InferSelectModel<typeof onebotAdaptersTable> & { connected: boolean },
    InferSelectModel<typeof onebotAdaptersTable>
>;

export type OtherAdapterUnion = AdapterUnion<string>;
export type AdapterUnionType = OnebotAdapterUnion | OtherAdapterUnion;

class AdapterManager {
    private static instance: AdapterManager;

    private constructor() {}

    public static getInstance(): AdapterManager {
        if (!AdapterManager.instance) {
            AdapterManager.instance = new AdapterManager();
        }
        return AdapterManager.instance;
    }

    // 私有方法：获取 onebot 适配器详情
    private async getOnebotDetail(adapterId: number): Promise<InferSelectModel<typeof onebotAdaptersTable> | null> {
        return await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, adapterId)).get();
    }

    // 私有方法：构建 onebot 适配器对象
    private buildOnebotAdapter(
        adapter: { id: number },
        onebot: InferSelectModel<typeof onebotAdaptersTable>
    ): OnebotAdapterUnion {
        const connected = onebotInstance.hasBot(onebot.botId);
        return {
            id: adapter.id,
            type: Adapter.Onebot,
            adapterType: Adapter.Onebot,
            connected,
            detail: { ...onebot, connected },
            config: onebot
        };
    }

    // 私有方法：构建其他类型适配器对象
    private buildOtherAdapter(adapter: { id: number; type: string }): OtherAdapterUnion {
        return {
            id: adapter.id,
            type: adapter.type,
            adapterType: adapter.type
        };
    }

    // 私有方法：根据适配器类型构建对象
    private async buildAdapterUnion(adapter: { id: number; type: string }): Promise<AdapterUnionType | null> {
        if (adapter.type === Adapter.Onebot) {
            const onebot = await this.getOnebotDetail(adapter.id);
            return onebot ? this.buildOnebotAdapter(adapter, onebot) : null;
        }
        return this.buildOtherAdapter(adapter);
    }

    // 获取所有适配器配置
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

    // 获取单个适配器配置
    async getAdapter(id: number): Promise<AdapterUnionType | null> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        return adapter ? await this.buildAdapterUnion(adapter) : null;
    }

    // 通过botId获取适配器配置（仅onebot）
    async getAdapterByBotId(botId: number): Promise<AdapterUnionType | null> {
        const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.botId, botId)).get();
        if (!onebot) return null;

        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, onebot.adapter_id)).get();
        return adapter ? this.buildOnebotAdapter(adapter, onebot) : null;
    }

    // 创建新适配器配置（仅onebot）
    async createAdapter(
        config: Omit<InferSelectModel<typeof onebotAdaptersTable>, 'adapter_id'> & { adapterType: string }
    ): Promise<AdapterUnionType> {
        const adapterRow = await db.insert(adaptersTable).values({ type: config.adapterType }).returning().get();
        const onebot = await db
            .insert(onebotAdaptersTable)
            .values({ ...config, adapter_id: adapterRow.id })
            .returning()
            .get();

        return this.buildOnebotAdapter(adapterRow, onebot);
    }

    // 更新适配器配置（仅onebot）
    async updateAdapter(
        id: number,
        config: Partial<InferSelectModel<typeof onebotAdaptersTable>>
    ): Promise<AdapterUnionType | null> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter || adapter.type !== Adapter.Onebot) return null;

        const result = await db
            .update(onebotAdaptersTable)
            .set(config)
            .where(eq(onebotAdaptersTable.adapter_id, id))
            .returning()
            .get();

        if (!result) return null;

        onebotInstance.disconnectBot(result.botId);
        return this.buildOnebotAdapter({ id }, result);
    }

    // 删除适配器配置
    async deleteAdapter(id: number): Promise<boolean> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter) return false;

        try {
            await db.update(servers).set({ adapter_id: null }).where(eq(servers.adapter_id, id));

            if (adapter.type === Adapter.Onebot) {
                const onebot = await this.getOnebotDetail(id);
                if (onebot) onebotInstance.disconnectBot(onebot.botId);
                await db.delete(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id));
            }

            await db.delete(adaptersTable).where(eq(adaptersTable.id, id));
            return true;
        } catch (error) {
            console.error('Failed to delete adapter:', error);
            return false;
        }
    }

    // 启用/禁用适配器（仅onebot）
    async setAdapterStatus(id: number, enabled: boolean): Promise<boolean> {
        const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
        if (!adapter || adapter.type !== Adapter.Onebot) return false;

        try {
            await db.update(onebotAdaptersTable).set({ enabled }).where(eq(onebotAdaptersTable.adapter_id, id));

            if (!enabled) {
                const onebot = await this.getOnebotDetail(id);
                if (onebot) onebotInstance.disconnectBot(onebot.botId);
            }
            return true;
        } catch (error) {
            console.error('Failed to update adapter status:', error);
            return false;
        }
    }

    // 获取所有适配器的连接状态统计
    getConnectionStats(): { type: string; totalConfigured: number; connected: number }[] {
        const allConnections = unifiedAdapterManager.getAllConnections();
        const stats: { [key: string]: { totalConfigured: number; connected: number } } = {};

        // 统计连接数
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

export const adapterManager = AdapterManager.getInstance();
