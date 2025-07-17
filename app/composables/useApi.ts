import type {
    ApiResponse,
    ServerWithStatus,
    AdapterListResponse,
    EnhancedPlayerListResponse,
    SocialAccountListResponse,
    ServerListResponse
} from '~/server/shared/types/server/api';
import type { AdapterFormData, AdapterPayload } from '~/utils/adapters/forms';

export const useApi = () => {
    const { $serverAPI } = useNuxtApp();

    const serverApi = {
        getServerList: () => $serverAPI.Get<ServerListResponse>('/servers/list'),
        addServer: (data: { name: string; token: string }) => $serverAPI.Post<ApiResponse<void>>('/servers/add', data),
        getServer: (id: number) => $serverAPI.Get<ApiResponse<ServerWithStatus>>(`/servers/${id}`),
        updateServer: (id: number, data: { name: string; adapter_id?: number | null }) =>
            $serverAPI.Put<ApiResponse<void>>(`/servers/${id}`, data),
        deleteServer: (id: number) => $serverAPI.Delete<ApiResponse<void>>(`/servers/${id}`),
        getServerStatus: (id: number) => $serverAPI.Get<ApiResponse<ServerWithStatus>>(`/servers/${id}`),
        disconnectServer: (id: number) => $serverAPI.Put<ApiResponse<void>>(`/servers/${id}/disconnect`),
        clearServerData: (id: number) => $serverAPI.Delete<ApiResponse<void>>(`/servers/${id}/clear`)
    };

    const adapterApi = {
        getAdapters: () => $serverAPI.Get<AdapterListResponse>('/adapters'),
        getAdapter: (id: number) => $serverAPI.Get<ApiResponse<AdapterUnionType>>(`/adapters/${id}`),
        addAdapter: (data: AdapterFormData) => $serverAPI.Post<ApiResponse<void>>('/adapters', data),
        updateAdapter: (id: number, data: AdapterPayload) => $serverAPI.Put<ApiResponse<void>>(`/adapters/${id}`, data),
        deleteAdapter: (id: number) => $serverAPI.Delete<ApiResponse<void>>(`/adapters/${id}`)
    };

    const playerApi = {
        getPlayers: () => $serverAPI.Get<EnhancedPlayerListResponse>('/players/list')
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
