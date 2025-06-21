import { MessageSyncConfigManager } from '~/server/utils/config/messageSyncConfigManager';
import defaultConfig from '~/configs/message_sync_defaults.json';

export default defineEventHandler(async (event) => {
    const serverId = parseInt(getRouterParam(event, 'id')!);

    if (isNaN(serverId) || serverId <= 0) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '无效的服务器ID',
            config: undefined
        };
    }

    try {
        const messageSyncManager = MessageSyncConfigManager.getInstance(serverId);
        let config = await messageSyncManager.getConfig();

        if (!config) {
            // 如果没有配置，返回默认配置
            config = defaultConfig;
        }

        return {
            success: true,
            message: '获取消息同步配置成功',
            config
        };
    } catch (error) {
        console.error('Failed to load message sync config:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '获取消息同步配置失败: ' + (error instanceof Error ? error.message : String(error)),
            config: undefined
        };
    }
});
