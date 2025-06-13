import { dispatchToAdapter } from '~/server/handlers/adapters/adapterDispatcher';
import { adapterManager } from '~/server/utils/adapters/adapterManager';
import type { ApiResponse } from '~/server/shared/types/server/api';

export default defineEventHandler(async (event): Promise<ApiResponse<unknown>> => {
    const id = Number(getRouterParam(event, 'id'));
    if (isNaN(id)) {
        return {
            success: false,
            message: '笨蛋诶，ID 不应该是数字吗？'
        };
    }

    try {
        const body = await readBody(event);

        // 如果 body 中有 adapter_type，使用它；否则从数据库查询
        let adapterType = body.adapter_type;
        if (!adapterType) {
            const adapter = await adapterManager.getAdapter(id);
            if (!adapter) {
                return {
                    success: false,
                    message: '找不到适配器啦，可能被数据纵火犯偷走了！'
                };
            }
            adapterType = adapter.type;
        }

        // 根据适配器类型分发到对应的处理器
        if (adapterType === 'onebot') {
            return await dispatchToAdapter('onebot', event.method, event);
        }

        return {
            success: false,
            message: `不支持的适配器类型：${adapterType}`
        };
    } catch (error) {
        console.error('更新适配器时发生错误:', error);
        return {
            success: false,
            message: '更新适配器失败，服务器发生错误'
        };
    }
});
