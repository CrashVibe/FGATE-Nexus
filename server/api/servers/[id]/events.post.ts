import { PlayerManager } from '~/server/utils/playerManager';

export default defineEventHandler(async (event) => {
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
