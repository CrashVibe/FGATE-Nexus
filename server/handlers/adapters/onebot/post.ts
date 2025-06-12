import type { H3Event } from 'h3';
import type { ApiResponse } from '~/server/shared/types/server/api';

export async function handlePost(event: H3Event): Promise<ApiResponse<unknown>> {
  const body = await readBody(event);
  if (!body.adapter_type || !body.config.botId) {
    event.node.res.statusCode = 400;
    if (!body.adapter_type) {
      return {
        success: false,
        message: '缺少必填字段：adapter_type'
      };
    }
    if (!body.config.botId) {
      return {
        success: false,
        message: '缺少必填字段：botId'
      };
    }
  }

  if (body.config.responseTimeout < 1000) {
    event.node.res.statusCode = 400;
    return {
      success: false,
      message: '超时时间必须大于1000毫秒'
    };
  }

  const { adapterManager } = await import('~/server/utils/adapters/adapterManager');
  try {
    await adapterManager.createAdapter({
      adapterType: body.adapter_type,
      botId: body.config.botId,
      accessToken: body.config.accessToken?.trim() || null,
      responseTimeout: body.config.responseTimeout || 6000,
      enabled: body.config.enabled ?? true
    });

    return {
      success: true,
      message: '创建成功！'
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
      event.node.res.statusCode = 409;
      return {
        success: false,
        message: '适配器已存在，请检查 Bot ID 是否重复'
      };
    }
    event.node.res.statusCode = 500;
    return {
      success: false,
      message: `创建适配器失败：${error instanceof Error ? error.message : '未知错误'}`
    };
  }
}
