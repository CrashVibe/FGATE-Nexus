import type { ApiResponse } from '~/server/shared/types/server/api';
import type { onebot_adapters } from '~/server/shared/types/adapters/adapter';

export default defineEventHandler(async (): Promise<ApiResponse<onebot_adapters[]>> => {
    try {
        const { adapterManager } = await import('~/server/utils/adapters/adapterManager');
        return {
            success: true,
            message: '获取适配器列表成功',
            data: await adapterManager.getAllAdapters()
        };
    } catch (err) {
        return {
            success: false,
            message: '获取适配器列表失败: ' + String(err),
            data: undefined
        };
    }
});
