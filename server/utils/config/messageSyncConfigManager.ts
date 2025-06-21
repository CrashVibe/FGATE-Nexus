import { eq } from 'drizzle-orm';
import { db } from '../../database/client';
import { server_message_sync_configs, message_filter_rules, servers } from '../../database/schema';
import type { MessageSyncConfig, FilterRule } from '../../shared/types/messageSync';
import defaultConfig from '../../../configs/message_sync_defaults.json';

export type ServerMessageSyncConfig = typeof server_message_sync_configs.$inferInsert;
export type FilterRuleDB = typeof message_filter_rules.$inferSelect;

export class MessageSyncConfigManager {
    private static instances: Map<number, MessageSyncConfigManager> = new Map();
    private serverId: number;

    private constructor(serverId: number) {
        this.serverId = serverId;
    }

    static getInstance(serverId: number): MessageSyncConfigManager {
        if (!this.instances.has(serverId)) {
            this.instances.set(serverId, new MessageSyncConfigManager(serverId));
        }
        return this.instances.get(serverId)!;
    }

    /**
     * 获取数据库中的配置
     */
    async getConfig(): Promise<MessageSyncConfig | null> {
        try {
            // 获取主配置
            const configResult = await db
                .select()
                .from(server_message_sync_configs)
                .where(eq(server_message_sync_configs.server_id, this.serverId))
                .limit(1);

            if (configResult.length === 0) {
                return null;
            }

            const config = configResult[0];

            // 获取过滤规则
            const filterRulesResult = await db
                .select()
                .from(message_filter_rules)
                .where(eq(message_filter_rules.server_id, this.serverId));

            const filterRules: FilterRule[] = filterRulesResult.map((rule: FilterRuleDB) => ({
                id: rule.id?.toString(),
                keyword: rule.keyword,
                replacement: rule.replacement,
                direction: rule.direction as FilterRule['direction'],
                matchMode: rule.matchMode as FilterRule['matchMode'],
                enabled: rule.enabled
            }));

            return {
                enabled: config.enabled,
                mcToQq: config.mcToQq,
                qqToMc: config.qqToMc,
                groupIds: JSON.parse(config.groupIds),
                mcToQqTemplate: config.mcToQqTemplate,
                qqToMcTemplate: config.qqToMcTemplate,
                filterRules
            };
        } catch (error) {
            console.error('[MessageSyncConfigManager] 获取配置失败:', error);
            return null;
        }
    }

    /**
     * 更新配置
     */
    async updateConfig(config: MessageSyncConfig): Promise<MessageSyncConfig> {
        // 校验配置
        this.validateConfig(config);

        // 验证服务器是否存在
        const serverExists = await db.select().from(servers).where(eq(servers.id, this.serverId)).limit(1);

        if (serverExists.length === 0) {
            throw new Error('服务器不存在');
        }

        // 验证群组ID格式
        for (const groupId of config.groupIds) {
            if (groupId && !/^\d+$/.test(groupId)) {
                throw new Error(`群号格式不正确：${groupId}，应为纯数字`);
            }
        }

        // 开启事务
        db.transaction((tx: typeof db) => {
            // 更新或插入主配置
            const existingConfig = tx
                .select()
                .from(server_message_sync_configs)
                .where(eq(server_message_sync_configs.server_id, this.serverId))
                .limit(1)
                .all();

            const configData = {
                enabled: config.enabled,
                mcToQq: config.mcToQq,
                qqToMc: config.qqToMc,
                groupIds: JSON.stringify(config.groupIds),
                mcToQqTemplate: config.mcToQqTemplate,
                qqToMcTemplate: config.qqToMcTemplate,
                updatedAt: new Date().toISOString()
            };

            if (existingConfig.length === 0) {
                tx.insert(server_message_sync_configs)
                    .values({
                        server_id: this.serverId,
                        ...configData
                    })
                    .run();
            } else {
                tx.update(server_message_sync_configs)
                    .set(configData)
                    .where(eq(server_message_sync_configs.server_id, this.serverId))
                    .run();
            }

            // 删除现有的过滤规则
            tx.delete(message_filter_rules).where(eq(message_filter_rules.server_id, this.serverId)).run();

            // 插入新的过滤规则
            if (config.filterRules.length > 0) {
                const rulesToInsert = config.filterRules.map((rule) => ({
                    server_id: this.serverId,
                    keyword: rule.keyword,
                    replacement: rule.replacement,
                    direction: rule.direction,
                    matchMode: rule.matchMode,
                    enabled: rule.enabled
                }));

                tx.insert(message_filter_rules).values(rulesToInsert).run();
            }
        });

        return config;
    }

    /**
     * 重置为默认配置
     */
    async resetConfig(): Promise<MessageSyncConfig> {
        const defaultConfigData = await loadDefaultConfig();
        return await this.updateConfig(defaultConfigData);
    }

    /**
     * 删除配置
     */
    async deleteConfig(): Promise<void> {
        db.transaction((tx: typeof db) => {
            // 删除过滤规则
            tx.delete(message_filter_rules).where(eq(message_filter_rules.server_id, this.serverId)).run();

            // 删除主配置
            tx.delete(server_message_sync_configs)
                .where(eq(server_message_sync_configs.server_id, this.serverId))
                .run();
        });
    }

    /**
     * 校验配置
     */
    private validateConfig(config: MessageSyncConfig): void {
        const errors: string[] = [];

        // 校验模版长度
        if (config.mcToQqTemplate.length > 200) {
            errors.push('MC → QQ 消息模版长度不能超过200字符');
        }

        if (config.qqToMcTemplate.length > 200) {
            errors.push('QQ → MC 消息模版长度不能超过200字符');
        }

        // 校验群组ID
        for (const groupId of config.groupIds) {
            if (groupId && !/^\d*$/.test(groupId)) {
                errors.push(`群号格式不正确：${groupId}，应为纯数字或空字符串`);
            }
        }

        // 验证过滤规则
        for (const rule of config.filterRules) {
            if (!rule.keyword.trim()) {
                errors.push('过滤规则的关键词不能为空');
            }
        }

        if (errors.length > 0) {
            throw new Error(errors.join('；'));
        }
    }

    /**
     * 应用过滤规则到消息
     */
    applyFilters(message: string, direction: 'mcToQq' | 'qqToMc', rules: FilterRule[]): string | null {
        let filteredMessage = message;

        for (const rule of rules) {
            if (!rule.enabled) continue;

            // 检查规则是否适用于当前方向
            if (rule.direction !== 'both' && rule.direction !== direction) {
                continue;
            }

            let shouldReplace = false;

            switch (rule.matchMode) {
                case 'exact':
                    shouldReplace = filteredMessage === rule.keyword;
                    break;
                case 'contains':
                    shouldReplace = filteredMessage.includes(rule.keyword);
                    break;
                case 'regex':
                    try {
                        const regex = new RegExp(rule.keyword);
                        shouldReplace = regex.test(filteredMessage);
                    } catch (error) {
                        console.error('Invalid regex in filter rule:', rule.keyword, error);
                        continue;
                    }
                    break;
            }

            if (shouldReplace) {
                if (rule.replacement === '') {
                    // 空替换文本意味着屏蔽该消息
                    return null;
                } else {
                    // 替换关键词
                    if (rule.matchMode === 'regex') {
                        try {
                            const regex = new RegExp(rule.keyword, 'g');
                            filteredMessage = filteredMessage.replace(regex, rule.replacement);
                        } catch (error) {
                            console.error('Invalid regex in filter rule:', rule.keyword, error);
                        }
                    } else {
                        filteredMessage = filteredMessage.replace(new RegExp(rule.keyword, 'g'), rule.replacement);
                    }
                }
            }
        }

        return filteredMessage;
    }
}

async function loadDefaultConfig(): Promise<MessageSyncConfig> {
    return defaultConfig as MessageSyncConfig;
}
