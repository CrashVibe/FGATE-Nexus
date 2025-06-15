import { defineEventHandler } from 'h3';
import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { adapterManager } from '~/server/utils/adapters/adapterManager';
import type { ApiResponse } from '~/server/shared/types/server/api';

interface AdapterStatusResponse {
    hasAdapter: boolean;
    adapterConnected: boolean;
    adapterInfo?: {
        id: number;
        type: string;
        connected: boolean;
    };
}

export default defineEventHandler(async (event): Promise<ApiResponse<AdapterStatusResponse>> => {
    const serverId = Number(event.context.params?.id);

    // 更严格的参数验证
    if (!event.context.params?.id || isNaN(serverId) || serverId <= 0) {
        throw createError({
            statusCode: 400,
            message: 'Invalid server ID: ID must be a positive number'
        });
    }

    try {
        // 获取服务器信息
        const server = await db.select().from(servers).where(eq(servers.id, serverId)).limit(1);

        if (server.length === 0) {
            throw createError({ statusCode: 404, message: 'Server not found' });
        }

        const serverData = server[0];

        // 检查是否配置了适配器
        if (!serverData.adapter_id) {
            return {
                success: true,
                message: '服务器未配置适配器',
                data: {
                    hasAdapter: false,
                    adapterConnected: false
                }
            };
        }

        // 获取适配器详细信息
        const adapter = await adapterManager.getAdapter(serverData.adapter_id);

        if (!adapter) {
            return {
                success: true,
                message: '适配器不存在',
                data: {
                    hasAdapter: false,
                    adapterConnected: false
                }
            };
        }

        return {
            success: true,
            message: '获取适配器状态成功',
            data: {
                hasAdapter: true,
                adapterConnected: adapter.connected || false,
                adapterInfo: {
                    id: adapter.id,
                    type: adapter.type,
                    connected: adapter.connected || false
                }
            }
        };
    } catch (error) {
        console.error('获取适配器状态失败:', error);
        throw createError({
            statusCode: 500,
            message: '获取适配器状态失败'
        });
    }
});
