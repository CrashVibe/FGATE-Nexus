<template>
    <div class="page-container">
        <transition name="content-transition" appear>
            <div class="general-page">
                <n-space vertical size="large">
                    <!-- 页面标题 -->
                    <div class="header">
                        <n-space justify="space-between" align="center">
                            <div>
                                <n-text tag="h1" style="font-size: 24px; margin: 0">基础设置</n-text>
                                <n-text depth="3">{{ serverData?.data?.name }}</n-text>
                            </div>
                            <n-button quaternary @click="goBack">
                                <template #icon>
                                    <n-icon :component="ArrowBackOutline" />
                                </template>
                                返回服务器管理
                            </n-button>
                        </n-space>
                    </div>

                    <!-- 基础设置内容 -->
                    <GeneralConfig :server-id="serverId" />
                </n-space>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowBackOutline } from '@vicons/ionicons5';
import GeneralConfig from '~/components/Config/GeneralConfig.vue';
import { useRequest } from 'alova/client';
import { useMessage } from 'naive-ui';
import type { ApiResponse, ServerWithStatus } from '~/server/shared/types/server/api';

definePageMeta({
    layout: 'servere-edit'
});

const route = useRoute();
const router = useRouter();
const serverId = computed(() => Number(route.params.id));
const { serverApi } = useApi();

const serverData = ref<ApiResponse<ServerWithStatus> | null>(null);
const loading = ref(true);
const message = useMessage();

useRequest(serverApi.getServer(serverId.value))
    .onSuccess(({ data }) => {
        serverData.value = data;
    })
    .onError((event) => {
        // @ts-expect-error alova event.data 结构类型推断不全
        message.error(event.data?.message || '获取服务器信息失败');
    })
    .onComplete(() => {
        loading.value = false;
    });

const goBack = () => {
    router.push('/');
};
</script>

<style scoped lang="less">
.general-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    margin-bottom: 24px;
}
</style>
