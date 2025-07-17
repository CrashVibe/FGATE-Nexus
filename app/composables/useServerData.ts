import { ref, computed } from 'vue';
import { useRoute } from 'vue-router';
import { useRequest } from 'alova/client';
import { useMessage } from 'naive-ui';
import type { ApiResponse, ServerWithStatus } from '~/server/shared/types/server/api';

export function useServerData() {
    const route = useRoute();
    const message = useMessage();
    const { serverApi } = useApi();

    const serverId = computed(() => Number(route.params.id));
    const serverData = ref<ApiResponse<ServerWithStatus> | null>(null);
    const loading = ref(true);

    const { onSuccess, onError, onComplete } = useRequest(serverApi.getServer(serverId.value))
        .onSuccess(({ data }) => {
            serverData.value = data;
        })
        .onError(() => {
            message.error('获取服务器信息失败');
        })
        .onComplete(() => {
            loading.value = false;
        });

    const serverName = computed(() => {
        if (serverData.value?.success && serverData.value.data) {
            return serverData.value.data.name;
        }
        return serverData.value?.data?.name || '';
    });

    return {
        serverId,
        serverData,
        serverName,
        loading,
        onSuccess,
        onError,
        onComplete
    };
}
