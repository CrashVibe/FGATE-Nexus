import type { H3Event } from 'h3';
import type { AdapterActionResponse } from '@/server/shared/types/adapters/api';

export async function handlePost(event: H3Event): Promise<AdapterActionResponse> {
    const body = await readBody(event);

    // 验证必要字段
    if (!body.adapter_type || !body.config.botId || !body.config.listenPath) {
        event.node.res.statusCode = 400;
        // 一个个校验
        if (!body.adapter_type) {
            return {
                success: false,
                message: '缺少必填字段：adapter_type'
            };
        }
        if (!body.config.botId) {
            return {
                success: false,
                message: '缺少必填字段：botId'
            };
        }
        if (!body.config.listenPath) {
            return {
                success: false,
                message: '缺少必填字段：listenPath'
            };
        }
    }

    if (body.config.responseTimeout < 1000) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '超时时间必须大于1000毫秒'
        };
    }

    const { adapterManager } = await import('~/server/utils/adapters/adapterManager');
    try {
        await adapterManager.createAdapter({
            adapterType: body.adapter_type,
            botId: body.config.botId,
            accessToken: body.config.accessToken?.trim() || null,
            listenPath: body.config.listenPath,
            responseTimeout: body.config.responseTimeout || 6000,
            enabled: body.config.enabled ?? true
        });

        return {
            success: true,
            message: '创建成功！'
        };
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            event.node.res.statusCode = 409;
            return {
                success: false,
                message: '适配器已存在，请检查 Bot ID 是否重复'
            };
        }
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: `创建适配器失败：${error.message || '未知错误'}`
        };
    }
}
