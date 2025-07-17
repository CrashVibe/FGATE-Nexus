// server/api/adapters/[id]/forward.post.ts
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

    const body = await readBody<OnebotConfig>(event);

    try {
        // 获取适配器配置
        const adapter = await db.select().from(onebot_adapters).where(eq(onebot_adapters.adapter_id, adapterId)).get();

        if (!adapter) {
            throw createError({
                statusCode: 404,
                statusMessage: 'Adapter not found'
            });
        }

        // 更新数据库中的正向连接配置
        await db
            .update(onebot_adapters)
            .set({
                connectionType: 'forward',
                forwardUrl: body.url,
                autoReconnect: body.autoReconnect ?? true,
                ...(body.accessToken && { accessToken: body.accessToken })
            })
            .where(eq(onebot_adapters.adapter_id, adapterId));

        // 建立正向连接
        const connectionConfig = {
            adapterId: adapterId,
            botId: adapter.botId,
            url: body.url,
            accessToken: body.accessToken || adapter.accessToken || undefined,
            autoReconnect: body.autoReconnect ?? true,
            responseTimeout: adapter.responseTimeout
        };

        const success = await onebotClient.createConnection(connectionConfig);

        if (success) {
            return {
                success: true,
                message: 'Forward connection established successfully',
                data: {
                    botId: adapter.botId,
                    url: body.url,
                    connected: true
                }
            };
        } else {
            throw createError({
                statusCode: 500,
                statusMessage: 'Failed to establish forward connection'
            });
        }
    } catch (error) {
        console.error('建立正向连接失败:', error);

        // 检查是否是 H3Error
        if (error && typeof error === 'object' && 'statusCode' in error) {
            throw error;
        }

        throw createError({
            statusCode: 500,
            statusMessage: 'Failed to create forward connection'
        });
    }
});
