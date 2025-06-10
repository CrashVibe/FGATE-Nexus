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

                    <!-- 配置选项卡片 -->
                    <n-grid :cols="1" :x-gap="20" :y-gap="20" responsive="screen">
                        <n-grid-item :span="1">
                            <n-card title="基础设置" hoverable style="cursor: pointer" @click="navigateTo('general')">
                                <template #header-extra>
                                    <n-icon :component="ServerOutline" size="20" />
                                </template>
                                <n-text depth="3"> 配置服务器的基础运行参数和常规设置。 </n-text>
                            </n-card>
                        </n-grid-item>

                        <n-grid-item :span="1">
                            <n-card title="高级配置" hoverable style="cursor: pointer" @click="navigateTo('advanced')">
                                <template #header-extra>
                                    <n-icon :component="BuildOutline" size="20" />
                                </template>
                                <n-text depth="3"> 高级功能配置，包括性能优化、调试选项等。 </n-text>
                            </n-card>
                        </n-grid-item>
                    </n-grid>
                </n-space>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowBackOutline, ServerOutline, BuildOutline } from '@vicons/ionicons5';

definePageMeta({
    layout: 'servere-edit'
});

const route = useRoute();
const router = useRouter();
const serverId = computed(() => Number(route.params.id));
const { serverApi } = useApi();

// 获取服务器基本信息
const serverData: any = await serverApi.getServer(serverId.value);

const goBack = () => {
    router.push('/');
};

const navigateTo = (configType: string) => {
    router.push(`/servers/${serverId.value}/${configType}`);
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
