<template>
    <div class="page-container">
        <transition name="content-transition" appear>
            <div class="server-config">
                <n-space vertical size="large">
                    <!-- 页面标题 -->
                    <div class="header">
                        <n-space justify="space-between" align="center">
                            <div>
                                <n-text tag="h1" style="font-size: 24px; margin: 0">服务器配置</n-text>
                                <n-text depth="3">{{ serverData?.data?.name }}</n-text>
                            </div>
                            <n-button quaternary @click="goBack">
                                <template #icon>
                                    <n-icon :component="ArrowBackOutline" />
                                </template>
                                返回
                            </n-button>
                        </n-space>
                    </div>

                    <!-- 简介卡片 -->
                    <n-card v-if="desc" size="small" class="desc-card">
                        <n-text depth="3">{{ desc }}</n-text>
                    </n-card>

                    <!-- 配置选项卡片 -->
                    <n-grid :cols="'1 800:2'" :x-gap="20" :y-gap="20" responsive="screen">
                        <n-grid-item v-for="menuItem in configMenuItems" :key="menuItem.key" :span="1">
                            <n-card
                                :title="menuItem.label"
                                hoverable
                                style="cursor: pointer"
                                @click="navigateToMenuItem(menuItem.key)"
                            >
                                <template #header-extra>
                                    <n-icon :component="getIconForMenuItem(menuItem.key)" size="20" />
                                </template>
                                <n-text depth="3">{{ menuItem.desc }}</n-text>
                            </n-card>
                        </n-grid-item>
                    </n-grid>
                </n-space>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowBackOutline, ServerOutline, BuildOutline, SettingsOutline } from '@vicons/ionicons5';
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
const menuOptions = inject(
    'menuOptions',
    computed(() => [])
) as unknown as import('vue').Ref<Array<{ label: string; key: string; desc?: string }>>;
const desc = computed(() => {
    const found = menuOptions.value.find((item) => item.key === route.path);
    return found?.desc || '';
});

// 过滤出配置相关的菜单项（排除"返回服务器管理"）
const configMenuItems = computed(() => {
    return menuOptions.value.filter((item) => item.key !== '/' && item.key.includes('/servers/'));
});

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

const navigateToMenuItem = (key: string) => {
    router.push(key);
};

const getIconForMenuItem = (key: string) => {
    if (key.includes('/config')) return SettingsOutline;
    if (key.includes('/general')) return ServerOutline;
    if (key.includes('/advanced')) return BuildOutline;
    if (key.includes('/binding')) return SettingsOutline;
    return SettingsOutline;
};
</script>

<style scoped lang="less">
.server-config {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}

.header {
    margin-bottom: 24px;
}
</style>
