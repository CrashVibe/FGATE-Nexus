import type { H3Event } from 'h3';
import type { ApiResponse } from '~/server/shared/types/server/api';

export async function handlePut(event: H3Event): Promise<ApiResponse<unknown>> {
    const body = await readBody(event);
    const id = Number(getRouterParam(event, 'id'));

    console.log('PUT /adapters/:id 请求数据:', JSON.stringify(body, null, 2));

    // 验证请求体结构
    if (!body.adapter_type || body.adapter_type !== 'onebot' || !body.config) {
        console.error('请求格式验证失败:', { adapter_type: body.adapter_type, hasConfig: !!body.config });
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '请求格式不正确'
        };
    }

    const config = body.config;

    if (config.responseTimeout && config.responseTimeout < 1000) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '响应超时不能小于1000毫秒哟，急于求成可不行！'
        };
    }

    try {
        // 将前端的 config 结构转换为数据库字段结构
        const updateData: Partial<{
            botId: number;
            accessToken: string | null;
            responseTimeout: number;
            enabled: boolean;
            connectionType: 'reverse' | 'forward';
            forwardUrl: string | null;
            autoReconnect: boolean;
        }> = {};

        // botId 处理：反向连接需要，正向连接可选
        const connectionType = config.connectionType || 'reverse';
        if (connectionType === 'reverse') {
            // 反向连接：botId 不能为 null，如果前端传了 null 或 undefined，就不更新这个字段
            if (config.botId !== undefined && config.botId !== null) {
                updateData.botId = config.botId;
            }
        } else {
            // 正向连接：botId 可以为 null，允许清空
            if (config.botId !== undefined) {
                updateData.botId = config.botId;
            }
        }
        if (config.accessToken !== undefined) updateData.accessToken = config.accessToken;
        if (config.responseTimeout !== undefined) updateData.responseTimeout = config.responseTimeout;
        if (config.enabled !== undefined) updateData.enabled = config.enabled;
        if (config.connectionType !== undefined) updateData.connectionType = config.connectionType;
        if (config.forwardUrl !== undefined) updateData.forwardUrl = config.forwardUrl;
        if (config.autoReconnect !== undefined) updateData.autoReconnect = config.autoReconnect;

        console.log('转换后的更新数据:', JSON.stringify(updateData, null, 2));

        const updatedAdapter = await adapterManager.updateAdapter(id, updateData);

        if (!updatedAdapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '找不到适配器啦，可能被数据纵火犯偷走了！'
            };
        }

        return {
            success: true,
            message: '适配器更新成功'
        };
    } catch (error) {
        console.error('更新适配器时发生错误:', error);

        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
            event.node.res.statusCode = 409;
            return {
                success: false,
                message: '笨蛋诶，Bot ID 都能重复，太逊了'
            };
        }

        // 添加更详细的错误信息
        console.error('错误详情:', {
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            adapterId: id,
            requestBody: body
        });

        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '不知道发生了什么，可能是服务器出了点小问题~'
        };
    }
}
