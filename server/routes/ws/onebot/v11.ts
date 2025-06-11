import { defineWebSocketHandler } from 'h3';
import { db } from '@/server/database/client';
import { onebot_adapters } from '@/server/database/schema';
import { eq } from 'drizzle-orm';
import { onebotConnectionManager } from '@/server/utils/adapters/onebot/connectionManager';

export default defineWebSocketHandler({
    async open(peer) {
        const idHeader = peer.request.headers.get('x-self-id');
        if (!idHeader) {
            peer.close(4001, '缺少 X-Self-ID');
            return;
        }
        const botId = Number(idHeader);
        const adapter = await db.select().from(onebot_adapters).where(eq(onebot_adapters.botId, botId)).get();
        if (!adapter || !adapter.enabled) {
            peer.close(4002, '适配器不存在或未启用');
            return;
        }
        const token = peer.request.headers.get('authorization')?.replace('Bearer ', '');
        if (adapter.accessToken && adapter.accessToken !== token) {
            peer.close(4003, '令牌无效');
            return;
        }
        if (onebotConnectionManager.has(botId)) {
            peer.close(4004, '已有连接');
            return;
        }
        onebotConnectionManager.add(botId, peer);
    },
    message(peer, message) {
        console.log('OneBot message:', message.text());
    },
    close(peer) {
        const idHeader = peer.request.headers.get('x-self-id');
        if (idHeader) {
            onebotConnectionManager.remove(Number(idHeader));
        }
    }
});
