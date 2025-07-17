import type { H3Event } from 'h3';
import type { ApiResponse } from '~/server/shared/types/server/api';

export async function handlePost(event: H3Event): Promise<ApiResponse<unknown>> {
    const body = await readBody(event);
    if (!body.adapter_type) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '缺少必填字段：adapter_type'
        };
    }

    // 反向连接需要 botId，正向连接不需要
    const connectionType = body.config?.connectionType || 'reverse';
    if (connectionType === 'reverse' && !body.config?.botId) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '反向连接模式下，缺少必填字段：botId'
        };
    }

    if (body.config?.responseTimeout && body.config.responseTimeout < 1000) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '超时时间必须大于1000毫秒'
        };
    }

    try {
        await adapterManager.createAdapter({
            host: body.host,
            port: body.port,
            connectionType: connectionType as 'reverse' | 'forward',
            accessToken: body.config?.accessToken?.trim() || null,
            enabled: body.config?.enabled ?? true,
            autoReconnect: body.config?.autoReconnect ?? true,
        });

        return {
            success: true,
            message: '创建成功！'
        };
    } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            event.node.res.statusCode = 409;
            return {
                success: false,
                message: '适配器已存在，请检查 Bot ID 是否重复'
            };
        }
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: `创建适配器失败：${error instanceof Error ? error.message : '未知错误'}`
        };
    }
}
