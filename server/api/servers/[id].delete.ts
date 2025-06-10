import { db } from '~/server/database/client';
import { servers } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));

    if (!serverId) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Invalid server ID'
        });
    }

    try {
        const wsManger = WebSocketManager.getInstance();
        await wsManger.disconnectServer(serverId);
        await db.delete(servers).where(eq(servers.id, serverId));

        return {
            success: true,
            message: 'Server deleted successfully'
        };
    } catch (error) {
        console.error('Failed to delete server:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
});
