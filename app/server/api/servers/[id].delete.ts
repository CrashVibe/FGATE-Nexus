import { db } from '~/server/database/client';
import { servers, players } from '~/server/database/schema';
import { eq } from 'drizzle-orm';

export default defineEventHandler(async (event) => {
    const serverId = Number(getRouterParam(event, 'id'));

    if (!serverId) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: 'Invalid server ID',
            data: undefined
        };
    }

    try {
        const wsManger = WebSocketManager.getInstance();
        await wsManger.disconnectServer(serverId);

        const playerRows = await db.select().from(players);
        for (const p of playerRows) {
            if (!p.servers) {
              continue;
            }
            const list = p.servers
                .split(',')
                .map((id: string) => Number(id))
                .filter(Boolean);
            const filtered = list.filter((id: number) => id !== serverId);
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
            message: 'Server deleted successfully',
            data: undefined
        };
    } catch (error) {
        event.node.res.statusCode = 500;
        console.error('Failed to delete server:', error);
        return {
            success: false,
            message: '删除服务器失败: ' + String(error),
            data: undefined
        };
    }
});
