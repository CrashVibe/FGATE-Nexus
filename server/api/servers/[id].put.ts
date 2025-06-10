import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));
    const body = await readBody(event);

    if (!serverId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid server ID'
        });
    }

    try {
        await db
            .update(servers)
            .set({
                name: body.name
                // description 字段的更新逻辑已移除
            })
            .where(eq(servers.id, serverId));

        return {
            success: true,
            message: 'Server updated successfully'
        };
    } catch (error) {
        console.error('Failed to update server:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
});
