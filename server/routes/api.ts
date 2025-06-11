import { defineWebSocketHandler } from 'h3';
import { WebSocketManager } from '@/server/utils/websocket-manager';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';
import { eq } from 'drizzle-orm';

const wsManager: WebSocketManager = WebSocketManager.getInstance();

export default defineWebSocketHandler({
    async open(peer) {
        const headers = peer.request.headers;

        const token = headers.get('authorization')?.replace('Bearer ', '');
        const clientVersion = headers.get('x-api-version');

        if (!token) {
            console.log('WebSocket 连接被拒绝：未提供令牌');
            peer.close(4001, '未提供令牌');
            return;
        }

        if (!clientVersion) {
            console.log('WebSocket 连接被拒绝：未提供客户端版本');
            peer.close(4002, '未提供客户端版本');
            return;
        }

        // 验证令牌
        const server = await db.select().from(servers).where(eq(servers.token, token)).limit(1);
        if (!server || server.length === 0) {
            console.log('WebSocket 连接被拒绝：无效的令牌');
            peer.close(4003, '无效的令牌');
            return;
        }

        // 查找是否有重复的连接
        const existingPeer = wsManager.getPeerByToken(token);
        if (existingPeer) {
            console.log('WebSocket 连接被拒绝：已有相同令牌的连接存在');
            peer.close(4004, '已有相同令牌的连接存在');
            return;
        }

        console.log('WebSocket 连接已接受，客户端版本：', clientVersion);

        peer.send(
            JSON.stringify({
                type: 'welcome',
                message: '连接成功，欢迎使用 FGATE 🎉',
                api_version: '0.0.1'
            })
        );

        try {
            wsManager.handleConnection(peer as any);
        } catch (error) {
            console.error('处理 WebSocket 连接时发生错误：', error);
            peer.close(4000, '服务器内部错误');
        }
    },

    message(peer, message) {
        wsManager.handleMessage(peer as any, message.text());
    },

    close(peer, details) {
        wsManager.handleDisconnection(peer as any, details.code, details.reason);
    },

    error(peer, error) {
        console.error('WebSocket 出现错误：', error);
    }
});

export function getWebSocketManager(): WebSocketManager | null {
    return wsManager;
}
