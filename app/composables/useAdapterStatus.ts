import { ref } from 'vue';
import type { ApiResponse } from '~/server/shared/types/server/api';

interface AdapterStatusData {
    hasAdapter: boolean;
    adapterConnected: boolean;
    adapterInfo?: {
        id: number;
        type: string;
        connected: boolean;
    };
}

export function useAdapterStatus(serverId: number) {
    const adapterStatus = ref<AdapterStatusData | null>(null);
    const loading = ref(false);
    const { $serverAPI } = useNuxtApp();

    async function fetchAdapterStatus() {
        loading.value = true;
        try {
            const response = await $serverAPI.Get<ApiResponse<AdapterStatusData>>(
                `/servers/${serverId}/adapter-status`
            );
            if (response.success && response.data) {
                adapterStatus.value = response.data;
            }
            return response;
        } catch (error) {
            console.error('Failed to fetch adapter status:', error);
            throw error;
        } finally {
            loading.value = false;
        }
    }

    return {
        adapterStatus,
        loading,
        fetchAdapterStatus
    };
}
