import type { ApiResponse } from '~/server/shared/types/server/api';
import type { AdapterUnionType } from '~/server/shared/types/adapters/adapter';

export default defineEventHandler(async (event): Promise<ApiResponse<AdapterUnionType>> => {
    const id = getRouterParam(event, 'id');
    const adapterId = parseInt(id || '');

    if (isNaN(adapterId)) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '无效的适配器 ID'
        };
    }

    try {
        const adapter = await adapterManager.getAdapter(adapterId);

        if (!adapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '适配器不存在'
            };
        }

        return {
            success: true,
            data: adapter,
            message: '获取适配器信息成功'
        };
    } catch (error) {
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: `获取适配器信息失败：${error instanceof Error ? error.message : '未知错误'}`
        };
    }
});
