import type { H3Event } from 'h3';
import type { ApiResponse } from '~/server/shared/types/server/api';
import { adapterManager } from '@/server/utils/adapters/adapterManager';

export async function handleDelete(event: H3Event): Promise<ApiResponse<unknown>> {
    const id = Number(getRouterParam(event, 'id'));

    try {
        const deletedAdapter = await adapterManager.deleteAdapter(id);

        if (!deletedAdapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '找不到适配器啦，可能被数据纵火犯偷走了！'
            };
        }
        return {
            success: true,
            message: '适配器删除成功'
        };
    } catch (error) {
        console.error('删除适配器时发生错误:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '不知道发生了什么，可能是服务器出了点小问题~'
        };
    }
}
