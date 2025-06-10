import type { AdapterListResponse } from '@/server/shared/types/adapters/api';

export default defineEventHandler(async (): Promise<AdapterListResponse> => {
    const { adapterManager } = await import('~/server/utils/adapters/adapterManager');
    return {
        success: true,
        message: '获取适配器列表成功',
        data: await adapterManager.getAllAdapters()
    };
});
