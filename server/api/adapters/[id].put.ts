import type { AdapterActionResponse } from '@/server/shared/types/adapters/api';
import { dispatchToAdapter } from '~/server/handlers/adapters/adapterDispatcher';
export default defineEventHandler(async (event): Promise<AdapterActionResponse> => {
    const id = Number(getRouterParam(event, 'id'));
    if (isNaN(id)) {
        return {
            success: false,
            message: '笨蛋诶，ID 不应该是数字吗？'
        };
    }

    const body = await readBody(event);
    // 校验适配器字段
    if (body.adapter_type === 'onebot') {
        return await dispatchToAdapter('onebot', event.method, event);
    }
    return {
        success: false,
        message: `不支持的适配器类型：${body.adapter_type}`
    };
});
