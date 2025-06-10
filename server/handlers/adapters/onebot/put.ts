import type { H3Event } from 'h3';
import type { AdapterActionResponse } from '@/server/shared/types/adapters/api';

export async function handlePut(event: H3Event): Promise<AdapterActionResponse> {
    const body = await readBody(event);
    const id = Number(getRouterParam(event, 'id'));

    // 验证超时时间
    if (body.responseTimeout && body.responseTimeout < 1000) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '响应超时不能小于1000毫秒哟，急于求成可不行！'
        };
    }

    const { adapterManager } = await import('~/server/utils/adapters/adapterManager');

    try {
        const updatedAdapter = await adapterManager.updateAdapter(id, body);

        if (!updatedAdapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '找不到适配器啦，可能被数据纵火犯偷走了！'
            };
        }

        return {
            success: true,
            message: '适配器更新成功'
        };
    } catch (error: any) {
        if (error.message.includes('UNIQUE constraint failed')) {
            event.node.res.statusCode = 409;
            return {
                success: false,
                message: '笨蛋诶，Bot ID 都能重复，太逊了'
            };
        }
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '不知道发生了什么，可能是服务器出了点小问题~'
        };
    }
}
