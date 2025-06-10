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
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ArrowBackOutline } from '@vicons/ionicons5';
import GeneralConfig from '~/components/Config/GeneralConfig.vue';

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
