// server/api/adapters/[id]/forward.delete.ts
import { onebotClient } from '~/server/utils/adapters/onebot/OnebotClient';
import { db } from '~/server/database/client';
import { onebot_adapters } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const id = getRouterParam(event, 'id');

    if (!id) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing adapter ID'
        });
    }

    const adapterId = parseInt(id, 10);
    if (isNaN(adapterId)) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid adapter ID'
        });
    }

    try {
        // 获取适配器配置
        const adapter = await db.select().from(onebot_adapters).where(eq(onebot_adapters.adapter_id, adapterId)).get();

        if (!adapter) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Adapter not found'
            });
        }

        // 断开正向连接
        onebotClient.disconnect(adapter.botId);

        // 更新数据库中的连接类型为反向
        await db
            .update(onebot_adapters)
            .set({
                connectionType: 'reverse',
                forwardUrl: null,
                autoReconnect: null
            })
            .where(eq(onebot_adapters.adapter_id, adapterId));

        return {
            success: true,
            message: 'Forward connection disconnected successfully',
            data: {
                botId: adapter.botId,
                connected: false
            }
        };
    } catch (error) {
        console.error('断开正向连接失败:', error);

        // 检查是否是 H3Error
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to disconnect forward connection'
        });
    }
});
