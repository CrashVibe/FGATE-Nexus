import type { H3Event } from 'h3';
import type { AdapterActionResponse } from '@/server/shared/types/adapters/api';

export async function handleDelete(event: H3Event): Promise<AdapterActionResponse> {
    const id = Number(getRouterParam(event, 'id'));

    const { adapterManager } = await import('~/server/utils/adapters/adapterManager');

    try {
        const deletedAdapter = await adapterManager.deleteAdapter(id);

        if (!deletedAdapter) {
            event.node.res.statusCode = 404;
            return {
                success: false,
                message: '找不到适配器啦，可能被数据纵火犯偷走了！'
            };
        }
        await adapterManager.deleteAdapter(id);
        return {
            success: true,
            message: '适配器删除成功'
        };
    } catch (error: any) {
        console.error('删除适配器时发生错误:', error);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '不知道发生了什么，可能是服务器出了点小问题~'
        };
    }
}
