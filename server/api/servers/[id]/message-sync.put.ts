import { z } from 'zod';
import { MessageSyncConfigManager } from '~/server/utils/config/messageSyncConfigManager';

// 过滤规则验证模式
const FilterRuleSchema = z.object({
    id: z.string().optional(),
    keyword: z.string().min(1, '关键词不能为空'),
    replacement: z.string(),
    direction: z.enum(['both', 'mcToQq', 'qqToMc']),
    matchMode: z.enum(['exact', 'contains', 'regex']),
    enabled: z.boolean()
});

// 消息互通配置验证模式
const MessageSyncConfigSchema = z.object({
    enabled: z.boolean(),
    mcToQq: z.boolean(),
    qqToMc: z.boolean(),
    groupIds: z
        .array(z.string().regex(/^\d*$/, 'QQ群号必须为数字或空字符串'))
        .refine((ids) => ids.filter((id) => id.trim() !== '').every((id) => /^\d+$/.test(id)), '非空QQ群号必须为数字'),
    mcToQqTemplate: z.string().min(1, 'MC → QQ 消息模版不能为空').max(200, '消息模版长度不能超过200字符'),
    qqToMcTemplate: z.string().min(1, 'QQ → MC 消息模版不能为空').max(200, '消息模版长度不能超过200字符'),
    filterRules: z.array(FilterRuleSchema)
});

export default defineEventHandler(async (event) => {
    const serverId = parseInt(getRouterParam(event, 'id')!);

    if (isNaN(serverId) || serverId <= 0) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '无效的服务器ID',
            data: undefined
        };
    }

    try {
        const body = await readBody(event);

        // 验证请求数据
        const validationResult = MessageSyncConfigSchema.safeParse(body);
        if (!validationResult.success) {
            const errors = validationResult.error.errors
                .map((err) => `${err.path.join('.')}: ${err.message}`)
                .join('；');

            event.node.res.statusCode = 400;
            return {
                success: false,
                message: '数据验证失败: ' + errors,
                data: undefined
            };
        }

        const config = validationResult.data;

        // 额外验证
        if (config.enabled && config.groupIds.filter((id) => id.trim() !== '').length === 0) {
            event.node.res.statusCode = 400;
            return {
                success: false,
                message: '启用消息互通时必须配置至少一个QQ群',
                data: undefined
            };
        }

        // 验证过滤规则
        for (const rule of config.filterRules) {
            if (rule.enabled && !rule.keyword.trim()) {
                event.node.res.statusCode = 400;
                return {
                    success: false,
                    message: '启用的过滤规则必须设置关键词',
                    data: undefined
                };
            }

            // 验证正则表达式
            if (rule.matchMode === 'regex') {
                try {
                    new RegExp(rule.keyword);
                } catch {
                    event.node.res.statusCode = 400;
                    return {
                        success: false,
                        message: `过滤规则 "${rule.keyword}" 不是有效的正则表达式`,
                        data: undefined
                    };
                }
            }
        }

        const messageSyncManager = MessageSyncConfigManager.getInstance(serverId);
        const updatedConfig = await messageSyncManager.updateConfig(config);

        return {
            success: true,
            message: '消息互通配置保存成功',
            data: updatedConfig
        };
    } catch (error: unknown) {
        console.error('Failed to save message sync config:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '保存消息互通配置失败: ' + (error instanceof Error ? error.message : String(error)),
            data: undefined
        };
    }
});
