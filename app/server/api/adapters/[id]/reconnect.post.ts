import { eq } from 'drizzle-orm';
import { db } from '~/server/database/client';
import { onebot_adapters } from '~/server/database/schema';
import type { ApiResponse } from '~/server/shared/types/server/api';

export default defineEventHandler(async (event): Promise<ApiResponse<string>> => {
    const id = getRouterParam(event, 'id');
    const adapterId = parseInt(id || '');

    if (isNaN(adapterId)) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '无效的适配器 ID'
        };
    }

    try {
        const adapter = await db.select().from(onebot_adapters).where(eq(onebot_adapters.adapter_id, adapterId)).get();

        if (!adapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '适配器不存在'
            };
        }

        // 如果是正向连接，重连该特定适配器
        if (adapter.connectionType === 'forward' && adapter.forwardUrl) {
            // 先断开现有连接
            onebotForwardClient.disconnect(adapterId);

            // 等待一下再重连
            await new Promise((resolve) => setTimeout(resolve, 500));

            // 重新建立连接
            const success = await onebotForwardClient.createConnection({
                adapterId: adapter.adapter_id,
                host: adapter.forwardUrl,
                access_token: adapter.accessToken || undefined,
                autoReconnect: true
            });

            if (success) {
                return {
                    success: true,
                    message: '适配器重新连接成功',
                    data: `正向连接已重新建立: ${adapter.forwardUrl}`
                };
            } else {
                return {
                    success: false,
                    message: '重新连接失败，请检查配置和网络连接'
                };
            }
        } else {
            return {
                success: false,
                message: '该适配器不是正向连接类型或缺少 URL 配置'
            };
        }
    } catch (error) {
        console.error('重新连接失败:', error);
        return {
            success: false,
            message: '重新连接失败: ' + String(error)
        };
    }
});
