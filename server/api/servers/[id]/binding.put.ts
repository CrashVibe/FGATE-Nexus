import { defineEventHandler, readBody } from 'h3';
import { BindingConfigManager } from '~/server/utils/config/bindingConfigManager';
import type { UpdateBindingConfigRequest, UpdateBindingConfigResponse } from '~/server/shared/types/bindingConfig';

export default defineEventHandler(async (event): Promise<UpdateBindingConfigResponse> => {
    const serverId = Number(event.context.params?.id);
    if (isNaN(serverId)) {
        throw createError({ statusCode: 400, message: 'Invalid server ID' });
    }

    try {
        const body = await readBody<UpdateBindingConfigRequest>(event);
        const manager = BindingConfigManager.getInstance(serverId);
        const updatedConfig = await manager.updateConfig(body);

        return { config: updatedConfig };
    } catch (error) {
        if (error instanceof Error) {
            throw createError({
                statusCode: 400,
                message: error.message
            });
        }
        throw createError({
            statusCode: 500,
            message: '更新配置失败'
        });
    }
});
