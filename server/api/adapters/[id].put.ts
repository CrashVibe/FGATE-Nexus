import { dispatchToAdapter } from '~/server/handlers/adapters/adapterDispatcher';
import type { ApiResponse } from '~/server/shared/types/server/api';
export default defineEventHandler(async (event): Promise<ApiResponse<unknown>> => {
    const id = Number(getRouterParam(event, 'id'));
    if (isNaN(id)) {
        return {
            success: false,
            message: '笨蛋诶，ID 不应该是数字吗？'
        };
    }

    const body = await readBody(event);
    if (body.adapter_type === 'onebot') {
        return await dispatchToAdapter('onebot', event.method, event);
    }
    return {
        success: false,
        message: `不支持的适配器类型：${body.adapter_type}`
    };
});
