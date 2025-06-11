import { db } from '../../database/client';
import { eq } from 'drizzle-orm';
import type { onebot_adapters } from '../../shared/types/adapters/adapter';
import { onebot_adapters as onebot_adaptersData } from '../../database/schema';
import { onebotConnectionManager } from '~/server/utils/adapters/onebot/connectionManager';

class AdapterManager {
    private static instance: AdapterManager;

    private constructor() {}

    /**
     * 获取单例实例
     * @returns {AdapterManager} 单例实例
     */
    public static getInstance(): AdapterManager {
        if (!AdapterManager.instance) {
            AdapterManager.instance = new AdapterManager();
        }
        return AdapterManager.instance;
    }

    // 获取所有适配器配置
    async getAllAdapters(): Promise<(onebot_adapters & { connected: boolean })[]> {
        const adapters = await db.select().from(onebot_adaptersData).all();
        return adapters.map((adapter) => ({
            ...adapter,
            connected: onebotConnectionManager.has(adapter.botId)
        }));
    }

    // 获取单个适配器配置
    async getAdapter(id: number): Promise<onebot_adapters | null> {
        const result = await db.select().from(onebot_adaptersData).where(eq(onebot_adaptersData.id, id)).get();
        return result || null;
    }

    // 通过botId获取适配器配置
    async getAdapterByBotId(botId: number): Promise<onebot_adapters | null> {
        const result = await db.select().from(onebot_adaptersData).where(eq(onebot_adaptersData.botId, botId)).get();
        return result || null;
    }

    // 创建新适配器配置
    async createAdapter(config: Omit<onebot_adapters, 'id'>): Promise<onebot_adapters> {
        const result = await db.insert(onebot_adaptersData).values(config).returning().get();
        return result;
    }

    // 更新适配器配置
    async updateAdapter(id: number, config: onebot_adapters): Promise<onebot_adapters | null> {
        const result = await db
            .update(onebot_adaptersData)
            .set(config)
            .where(eq(onebot_adaptersData.id, id))
            .returning()
            .get();
        if (result) {
            onebotConnectionManager.disconnect(config.botId);
        }
        return result || null;
    }

    // 删除适配器配置
    async deleteAdapter(id: number): Promise<boolean> {
        const adapter = await this.getAdapter(id);
        if (!adapter) {
            return false;
        }

        try {
            await db.delete(onebot_adaptersData).where(eq(onebot_adaptersData.id, id));
            onebotConnectionManager.disconnect(adapter.botId);
            return true;
        } catch (error) {
            console.error('Failed to delete adapter:', error);
            return false;
        }
    }

    // 启用/禁用适配器
    async setAdapterStatus(id: number, enabled: boolean): Promise<boolean> {
        try {
            const adapter = await this.getAdapter(id);
            if (!adapter) {
                return false;
            }

            await db.update(onebot_adaptersData).set({ enabled }).where(eq(onebot_adaptersData.id, id));

            if (!enabled) {
                onebotConnectionManager.disconnect(adapter.botId);
            }

            return true;
        } catch (error) {
            console.error('Failed to update adapter status:', error);
            return false;
        }
    }
}

export const adapterManager = AdapterManager.getInstance();
