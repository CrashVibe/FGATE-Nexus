import { defineEventHandler } from 'h3';
import { BindingConfigManager } from '~/server/utils/config/bindingConfigManager';
import type { GetBindingConfigResponse } from '~/server/shared/types/bindingConfig';

export default defineEventHandler(async (event): Promise<GetBindingConfigResponse> => {
  const serverId = Number(event.context.params?.id);
  if (isNaN(serverId)) {
    throw createError({ statusCode: 400, message: 'Invalid server ID' });
  }

  const manager = BindingConfigManager.getInstance(serverId);
  const config = await manager.getConfig();

  return { config };
});
