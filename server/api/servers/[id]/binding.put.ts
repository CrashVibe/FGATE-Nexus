import { defineEventHandler, readBody } from 'h3';
import { BindingConfigManager } from '~/server/utils/config/bindingConfigManager';
import type { UpdateBindingConfigRequest, UpdateBindingConfigResponse } from '~/server/shared/types/bindingConfig';

export default defineEventHandler(async (event): Promise<UpdateBindingConfigResponse> => {
  const serverId = Number(event.context.params?.id);
  if (isNaN(serverId)) {
    throw createError({ statusCode: 400, message: 'Invalid server ID' });
  }

  const body = await readBody<UpdateBindingConfigRequest>(event);
  const manager = BindingConfigManager.getInstance(serverId);
  const updatedConfig = await manager.updateConfig(body);

  return { config: updatedConfig };
});
