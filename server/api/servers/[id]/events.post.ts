import { PlayerManager } from '~/server/utils/playerManager';

export default defineEventHandler(async (event) => {
    // 这是一个示例处理器，用于演示如何在实际的Minecraft服务器中集成玩家加入检查

    // 在实际应用中，这个处理器应该被Minecraft服务器调用
    // 例如通过插件或mod发送HTTP请求到这个端点

    const body = await readBody(event);
    const { serverId, playerName, playerUuid, action } = body;

    if (!serverId || !playerName || !playerUuid) {
        throw createError({
            statusCode: 400,
            statusMessage: 'Missing required fields'
        });
    }

    try {
        switch (action) {
            case 'join': {
                // 玩家尝试加入服务器
                const joinResult = await PlayerManager.checkPlayerJoin({
                    serverId: Number(serverId),
                    playerName,
                    playerUuid
                });

                return {
                    success: true,
                    action: 'join',
                    allowed: joinResult.allowed,
                    reason: joinResult.reason
                };
            }
            default:
                throw createError({
                    statusCode: 400,
                    statusMessage: 'Invalid action'
                });
        }
    } catch (error) {
        console.error('Failed to handle server event:', error);
        throw createError({
            statusCode: 500,
            statusMessage: 'Internal server error'
        });
    }
});
