import { db } from '~/server/database/client';
import { servers, players } from '~/server/database/schema';
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

        const playerRows = await db.select().from(players);
        for (const p of playerRows) {
            if (!p.servers) continue;
            const list = p.servers.split(',').map((id) => Number(id)).filter(Boolean);
            const filtered = list.filter((id) => id !== serverId);
            if (filtered.length !== list.length) {
                await db
                    .update(players)
                    .set({ servers: filtered.join(',') })
                    .where(eq(players.id, p.id));
            }
        }

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
