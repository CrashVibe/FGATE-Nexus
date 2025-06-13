import type { H3Event } from 'h3';
import type { ApiResponse } from '~/server/shared/types/server/api';

// 定义适配器处理器函数类型
type AdapterHandler = (event: H3Event) => Promise<ApiResponse<unknown>>;
type AdapterHandlerFactory = () => Promise<AdapterHandler>;

const handlerMap: Record<string, Record<string, AdapterHandlerFactory>> = {
    onebot: {
        POST: () => import('./onebot/post').then((m) => m.handlePost),
        PUT: () => import('./onebot/put').then((m) => m.handlePut),
        DELETE: () => import('./onebot/delete').then((m) => m.handleDelete)
    }
};

export async function dispatchToAdapter(type: string, method: string, event: H3Event) {
    const adapter = handlerMap[type];
    if (!adapter) {
        throw createError({ statusCode: 400, statusMessage: `未知适配器类型：${type}` });
    }

    const handlerFactory = adapter[method.toUpperCase() as keyof typeof adapter];
    if (!handlerFactory) {
        throw createError({ statusCode: 405, statusMessage: `适配器 ${type} 不支持 ${method}` });
    }

    const handler = await handlerFactory();
    return handler(event);
}
