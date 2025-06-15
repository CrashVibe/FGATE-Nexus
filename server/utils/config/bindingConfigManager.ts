import { db } from '~/server/database/client';
import { server_binding_configs } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import defaultConfig from '../../../configs/server_binding_defaults.json';

export type ServerBindingConfig = typeof server_binding_configs.$inferInsert;

export class BindingConfigManager {
    private static instances: Map<number, BindingConfigManager> = new Map();
    private serverId: number;

    private constructor(serverId: number) {
        this.serverId = serverId;
    }

    static getInstance(serverId: number): BindingConfigManager {
        if (!this.instances.has(serverId)) {
            this.instances.set(serverId, new BindingConfigManager(serverId));
        }
        return this.instances.get(serverId)!;
    }

    /**
     * 获取数据库中的配置
     */
    async getConfig(): Promise<ServerBindingConfig | null> {
        const result = await db
            .select()
            .from(server_binding_configs)
            .where(eq(server_binding_configs.server_id, this.serverId))
            .limit(1);
        return result[0] || null;
    }

    /**
     * 更新数据库中的配置
     */
    async updateConfig(
        config: Partial<Omit<ServerBindingConfig, 'server_id' | 'createdAt' | 'updatedAt'>>
    ): Promise<ServerBindingConfig> {
        // 校验绑定和解绑指令不能相同
        this.validatePrefixes(config);

        const existingConfig = await this.getConfig();
        if (existingConfig) {
            const [updatedConfig] = await db
                .update(server_binding_configs)
                .set({ ...config, updatedAt: new Date().toISOString() })
                .where(eq(server_binding_configs.server_id, this.serverId))
                .returning();
            return updatedConfig;
        } else {
            const [newConfig] = await db
                .insert(server_binding_configs)
                .values({ ...(await loadDefaultConfig()), ...config, server_id: this.serverId })
                .returning();
            return newConfig;
        }
    }

    /**
     * 校验前缀配置
     */
    private validatePrefixes(config: Partial<Omit<ServerBindingConfig, 'server_id' | 'createdAt' | 'updatedAt'>>) {
        const prefix = config.prefix?.trim();
        const unbindPrefix = config.unbindPrefix?.trim();

        // 如果两个前缀都存在且相同，抛出错误
        if (prefix && unbindPrefix && prefix === unbindPrefix) {
            throw new Error('绑定前缀和解绑前缀不能相同');
        }
    }

    /**
     * 重置为默认配置（用 JSON 模板覆盖数据库）
     */
    async resetConfig(): Promise<ServerBindingConfig> {
        const defaultConfig = await loadDefaultConfig();
        const [updatedConfig] = await db
            .update(server_binding_configs)
            .set({ ...defaultConfig, updatedAt: new Date().toISOString() })
            .where(eq(server_binding_configs.server_id, this.serverId))
            .returning();
        if (updatedConfig) {
            return updatedConfig;
        }
        // 如果不存在则新建
        const [newConfig] = await db
            .insert(server_binding_configs)
            .values({ ...defaultConfig, server_id: this.serverId })
            .returning();
        return newConfig;
    }

    /**
     * 删除数据库中的配置
     */
    async deleteConfig(): Promise<void> {
        await db.delete(server_binding_configs).where(eq(server_binding_configs.server_id, this.serverId));
    }
}

async function loadDefaultConfig(): Promise<Omit<ServerBindingConfig, 'server_id' | 'createdAt' | 'updatedAt'>> {
    return defaultConfig;
}
