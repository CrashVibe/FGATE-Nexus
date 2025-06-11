import type { ServerListResponse, ServerWithStatus } from '~/server/shared/types/server/api';
import type { AdapterListResponse, AdapterActionResponse } from '~/server/shared/types/adapters/api';
import type { PlayerListResponse } from '~/server/shared/types/player/api';
import type { SocialAccountListResponse } from '~/server/shared/types/account/api';

export const useApi = () => {
    const { $serverAPI } = useNuxtApp();

    const serverApi = {
        getServerList: () => $serverAPI.Get<ServerListResponse>('/servers/list'),

        addServer: (data: { name: string; token: string }) => $serverAPI.Post('/servers/add', data),

        getServer: (id: number) => $serverAPI.Get(`/servers/${id}`),

        updateServer: (id: number, data: { name: string }) => $serverAPI.Put(`/servers/${id}`, data),

        deleteServer: (id: number) => $serverAPI.Delete(`/servers/${id}`),

        getServerStatus: (id: number) => $serverAPI.Get(`/servers/${id}`),

        disconnectServer: (id: number) => $serverAPI.Put(`/servers/${id}/disconnect`),

        clearServerData: (id: number) => $serverAPI.Delete(`/servers/${id}/clear`)
    };

    const adapterApi = {
        getAdapters: () => $serverAPI.Get<AdapterListResponse>('/adapters'),

        addAdapter: (data: any) => $serverAPI.Post<AdapterActionResponse>('/adapters', data),

        updateAdapter: (id: number, data: any) => $serverAPI.Put<AdapterActionResponse>(`/adapters/${id}`, data),

        deleteAdapter: (id: number, data: any) => $serverAPI.Delete<AdapterActionResponse>(`/adapters/${id}`, data)
    };

    const playerApi = {
        getPlayers: () => $serverAPI.Get<PlayerListResponse>('/players/list')
    };

    const accountApi = {
        getAccounts: () => $serverAPI.Get<SocialAccountListResponse>('/accounts/list')
    };

    return {
        serverApi,
        adapterApi,
        playerApi,
        accountApi
    };
};
