import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));
    const body = await readBody(event);

    if (!serverId) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: 'Invalid server ID',
            data: undefined
        };
    }

    try {
        await db
            .update(servers)
            .set({
                name: body.name,
                adapter_id: body.adapter_id ?? null // 支持更新适配器绑定
            })
            .where(eq(servers.id, serverId));

        return {
            success: true,
            message: 'Server updated successfully',
            data: undefined
        };
    } catch (error) {
        event.node.res.statusCode = 500;
        console.error('Failed to update server:', error);
        return {
            success: false,
            message: '更新服务器失败: ' + String(error),
            data: undefined
        };
    }
});
