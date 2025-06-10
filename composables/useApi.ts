import type { ServerListResponse, ServerWithStatus } from '~/server/shared/types/server/api';
import type { AdapterListResponse, AdapterActionResponse } from '~/server/shared/types/adapters/api';

export const useApi = () => {
    const { $serverAPI } = useNuxtApp();

    // 服务器相关 API
    const serverApi = {
        // 获取服务器列表
        getServerList: () => $serverAPI.Get<ServerListResponse>('/servers/list'),

        // 添加服务器
        addServer: (data: { name: string; token: string }) => $serverAPI.Post('/servers/add', data),

        // 获取单个服务器信息
        getServer: (id: number) => $serverAPI.Get(`/servers/${id}`),

        // 更新服务器
        updateServer: (id: number, data: { name: string }) => $serverAPI.Put(`/servers/${id}`, data),

        // 删除服务器
        deleteServer: (id: number) => $serverAPI.Delete(`/servers/${id}`),

        // 获取服务器状态（现在通过获取服务器信息接口）
        getServerStatus: (id: number) => $serverAPI.Get(`/servers/${id}`),

        // 断开服务器连接
        disconnectServer: (id: number) => $serverAPI.Put(`/servers/${id}/disconnect`),

        // 清空服务器数据
        clearServerData: (id: number) => $serverAPI.Delete(`/servers/${id}/clear`)
    };

    // 适配器相关 API
    const adapterApi = {
        // 获取适配器列表
        getAdapters: () => $serverAPI.Get<AdapterListResponse>('/adapters'),

        // 添加适配器
        addAdapter: (data: any) => $serverAPI.Post<AdapterActionResponse>('/adapters', data),

        // 更新适配器
        updateAdapter: (id: number, data: any) => $serverAPI.Put<AdapterActionResponse>(`/adapters/${id}`, data),

        // 删除适配器
        deleteAdapter: (id: number, data: any) => $serverAPI.Delete<AdapterActionResponse>(`/adapters/${id}`, data)
    };

    return {
        serverApi,
        adapterApi
    };
};
