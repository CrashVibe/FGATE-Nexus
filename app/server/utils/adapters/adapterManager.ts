import { db } from '../../database/client';
import { eq } from 'drizzle-orm';
import { adapters as adaptersTable, onebot_adapters as onebotAdaptersTable, servers } from '../../database/schema';
import { onebotClient } from './onebot/OnebotClient';
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
        const connected = onebotInstance.hasBot(onebot.adapter_id);
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
     * 创建新 onebot 适配器配置
     * @param config 配置对象
     */
    async createAdapter(
        config: typeof onebotAdaptersTable.$inferInsert
    ): Promise<AdapterUnionType> {
        const adapterRow: typeof adaptersTable.$inferSelect = await db.insert(adaptersTable).values({ type: Adapter.Onebot }).returning().get();
        const onebot: typeof onebotAdaptersTable.$inferSelect = await db
            .insert(onebotAdaptersTable)
            .values({ ...config, adapter_id: adapterRow.id })
            .returning()
            .get();
        try {
            await onebotClient.createConnection({
                adapterId: adapterRow.id,
                autoReconnect: onebot.autoReconnect,
                WsConfig: onebot.connectionType === OnebotConnectionType.Forward
                    ? {
                        host: onebot.host,
                        port: onebot.port,
                        mode: 'ws',
                        access_token: onebot.accessToken || undefined,
                        log_level: 'info',
                    }
                    : {
                        host: onebot.host,
                        port: onebot.port,
                        mode: 'ws-reverse',
                        log_level: 'info',
                    }
            });
            console.log(`正向连接已建立: 适配器 ${adapterRow.id} -> ${onebot.host}:${onebot.port}`);
        } catch (error) {
            console.error(`建立正向连接失败: 适配器 ${adapterRow.id}`, error);
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
        if (!adapter || adapter.type !== Adapter.Onebot) {
          return null;
        }
        console.log(`正在更新适配器 ${id}:`, config);
        const result = await db
            .update(onebotAdaptersTable)
            .set(config)
            .where(eq(onebotAdaptersTable.adapter_id, id))
            .returning()
            .get();
        if (!result) {
          return null;
        }
        // 处理连接状态变化
        const isNowEnabled = result.enabled;
        const isConfigChanged =
            config.accessToken !== undefined ||
            config.connectionType !== undefined ||
            config.host !== undefined ||
            config.port !== undefined;
        // 禁用适配器或者更改了关键配置时断开所有连接
        if (config.enabled === false || isConfigChanged) {
            console.log(`断开适配器 ${id} 的连接`);
            // 直接通过适配器 ID 断开连接
            try {
                onebotClient.disconnect(id);
                console.log(`连接已断开: 适配器 ${id}`);
            } catch (error) {
                console.error(`断开连接失败: 适配器 ${id}`, error);
            }
        }
        // 如果适配器启用且是正向连接，建立或更新正向连接
        if (isNowEnabled && result.connectionType === OnebotConnectionType.Forward) {
            try {
                await onebotClient.updateConfig({
                    adapterId: id,
                    autoReconnect: result.autoReconnect ?? true,
                    WsConfig: {
                        host: result.host,
                        port: result.port,
                        mode: 'ws',
                        access_token: result.accessToken || undefined,
                        log_level: 'info'
                    }
                });
                console.log(`正向连接配置已更新: 适配器 ${id} -> ${result.host}:${result.port}`);
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
        if (!adapter) {
            return false;
        }

        try {
            await db.update(servers).set({ adapter_id: null }).where(eq(servers.adapter_id, id));
            if (adapter.type === Adapter.Onebot) {
                const onebot = await this.getOnebotDetail(id);
                if (onebot) {
                    // 直接通过适配器 ID 断开连接
                    try {
                        onebotClient.disconnect(id);
                        console.log(`连接已断开: 适配器 ${id}`);
                    } catch (error) {
                        console.error(`断开连接失败: 适配器 ${id}`, error);
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
        if (!adapter || adapter.type !== Adapter.Onebot) {
            return false;
        }

        try {
            const onebot = await this.getOnebotDetail(id);
            if (!onebot) {
                return false;
            }

            await db.update(onebotAdaptersTable).set({ enabled }).where(eq(onebotAdaptersTable.adapter_id, id));

            if (!enabled) {
                // 禁用时断开连接
                try {
                    onebotClient.disconnect(id);
                    console.log(`连接已断开: 适配器 ${id}`);
                } catch (error) {
                    console.error(`断开连接失败: 适配器 ${id}`, error);
                }
            } else if (onebot.connectionType === OnebotConnectionType.Forward) {
                // 启用正向连接时建立连接
                try {
                    await onebotClient.createConnection({
                        adapterId: id,
                        autoReconnect: onebot.autoReconnect ?? true,
                        WsConfig: {
                            host: onebot.host,
                            port: onebot.port,
                            mode: 'ws',
                            access_token: onebot.accessToken || undefined,
                            log_level: 'info'
                        }
                    });
                    console.log(`正向连接已建立: 适配器 ${id} -> ${onebot.host}:${onebot.port}`);
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
}

/**
 * 适配器管理器单例
 */
export const adapterManager = AdapterManager.getInstance();
