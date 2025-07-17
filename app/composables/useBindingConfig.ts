import type {
    GetBindingConfigResponse,
    UpdateBindingConfigRequest,
    UpdateBindingConfigResponse
} from '~/server/shared/types/bindingConfig';
import { ref } from 'vue';

export function useBindingConfig(serverId: number) {
    const config = ref<GetBindingConfigResponse['config'] | null>(null);
    const { $serverAPI } = useNuxtApp();

    async function fetchConfig() {
        try {
            const response = await $serverAPI.Get<GetBindingConfigResponse>(`/servers/${serverId}/binding`);
            config.value = response.config;
            return response;
        } catch (error) {
            console.error('Failed to fetch binding config:', error);
            throw error;
        }
    }

    async function saveConfig(updatedConfig: UpdateBindingConfigRequest) {
        try {
            const response = await $serverAPI.Put<UpdateBindingConfigResponse>(
                `/servers/${serverId}/binding`,
                updatedConfig
            );
            config.value = response.config;
            return response.config;
        } catch (error) {
            console.error('Failed to save binding config:', error);
            throw error;
        }
    }

    return { config, fetchConfig, saveConfig };
}
