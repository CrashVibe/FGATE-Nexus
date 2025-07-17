import type { ApiResponse } from '~/server/shared/types/server/api';
import type { AdapterUnionType } from '~/server/utils/adapters/adapterManager';

export default defineEventHandler(async (): Promise<ApiResponse<AdapterUnionType[]>> => {
    try {
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
