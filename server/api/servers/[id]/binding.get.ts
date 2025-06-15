import { defineEventHandler } from 'h3';
import { BindingConfigManager } from '~/server/utils/config/bindingConfigManager';
import type { GetBindingConfigResponse } from '~/server/shared/types/bindingConfig';

export default defineEventHandler(async (event): Promise<GetBindingConfigResponse> => {
    const serverId = Number(event.context.params?.id);

    // 更严格的参数验证
    if (!event.context.params?.id || isNaN(serverId) || serverId <= 0) {
        throw createError({
            statusCode: 400,
            message: 'Invalid server ID: ID must be a positive number'
        });
    }

    const manager = BindingConfigManager.getInstance(serverId);
    const config = await manager.getConfig();

    return { config };
});
