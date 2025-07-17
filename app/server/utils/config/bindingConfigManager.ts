import { db } from '~/server/database/client';
import { server_binding_configs } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import defaultConfig from '../../../configs/server_binding_defaults.json';
import { validators, BINDING_CONSTRAINTS } from '../../../../utils/validation/bindingRules';

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
        // 进行全面的字段校验
        this.validateConfig(config);

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
     * 全面校验配置
     */
    private validateConfig(config: Partial<Omit<ServerBindingConfig, 'server_id' | 'createdAt' | 'updatedAt'>>) {
        const errors: string[] = [];

        // 校验绑定数量
        if (config.maxBindCount !== undefined && !validators.maxBindCount(config.maxBindCount)) {
            errors.push(
                `绑定数量必须在${BINDING_CONSTRAINTS.maxBindCount.min}-${BINDING_CONSTRAINTS.maxBindCount.max}之间`
            );
        }

        // 校验验证码长度
        if (config.codeLength !== undefined && !validators.codeLength(config.codeLength)) {
            errors.push(
                `验证码长度必须在${BINDING_CONSTRAINTS.codeLength.min}-${BINDING_CONSTRAINTS.codeLength.max}之间`
            );
        }

        // 校验验证码过期时间
        if (config.codeExpire !== undefined && !validators.codeExpire(config.codeExpire)) {
            errors.push(
                `验证码有效时间必须在${BINDING_CONSTRAINTS.codeExpire.min}-${BINDING_CONSTRAINTS.codeExpire.max}分钟之间`
            );
        }

        // 校验验证码模式
        if (config.codeMode !== undefined && !validators.codeMode(config.codeMode)) {
            errors.push('验证码模式无效');
        }

        // 校验绑定前缀
        if (config.prefix !== undefined) {
            const prefixResult = validators.prefix(config.prefix);
            if (!prefixResult.valid) {
                errors.push(prefixResult.message!);
            }
        }

        // 校验解绑前缀
        if (config.unbindPrefix !== undefined) {
            const unbindPrefixResult = validators.unbindPrefix(config.unbindPrefix);
            if (!unbindPrefixResult.valid) {
                errors.push(unbindPrefixResult.message!);
            }
        }

        // 校验前缀冲突
        if (config.prefix !== undefined || config.unbindPrefix !== undefined) {
            const prefix = config.prefix || '';
            const unbindPrefix = config.unbindPrefix || '';
            const conflictResult = validators.prefixConflict(prefix, unbindPrefix);
            if (!conflictResult.valid) {
                errors.push(conflictResult.message!);
            }
        }

        // 校验各种消息长度
        if (config.kickMsg !== undefined) {
            const result = validators.messageLength(config.kickMsg, BINDING_CONSTRAINTS.kickMsg.maxLength, '踢出消息');
            if (!result.valid) errors.push(result.message!);
        }

        if (config.unbindKickMsg !== undefined) {
            const result = validators.messageLength(
                config.unbindKickMsg,
                BINDING_CONSTRAINTS.unbindKickMsg.maxLength,
                '解绑踢出消息'
            );
            if (!result.valid) errors.push(result.message!);
        }

        if (config.bindSuccessMsg !== undefined) {
            const result = validators.messageLength(
                config.bindSuccessMsg,
                BINDING_CONSTRAINTS.bindSuccessMsg.maxLength,
                '绑定成功消息'
            );
            if (!result.valid) errors.push(result.message!);
        }

        if (config.bindFailMsg !== undefined) {
            const result = validators.messageLength(
                config.bindFailMsg,
                BINDING_CONSTRAINTS.bindFailMsg.maxLength,
                '绑定失败消息'
            );
            if (!result.valid) errors.push(result.message!);
        }

        if (config.unbindSuccessMsg !== undefined) {
            const result = validators.messageLength(
                config.unbindSuccessMsg,
                BINDING_CONSTRAINTS.unbindSuccessMsg.maxLength,
                '解绑成功消息'
            );
            if (!result.valid) errors.push(result.message!);
        }

        if (config.unbindFailMsg !== undefined) {
            const result = validators.messageLength(
                config.unbindFailMsg,
                BINDING_CONSTRAINTS.unbindFailMsg.maxLength,
                '解绑失败消息'
            );
            if (!result.valid) errors.push(result.message!);
        }

        // 如果有校验错误，抛出异常
        if (errors.length > 0) {
            throw new Error(errors.join('；'));
        }
    }

    /**
     * 校验前缀配置（保留旧方法用于兼容性）
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
