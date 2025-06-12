<template>
    <div class="header">
        <n-space justify="space-between" align="center">
            <div>
                <n-text tag="h1" style="font-size: 24px; margin: 0">{{ title }}</n-text>
                <n-text depth="3">{{ serverName }}</n-text>
            </div>
            <n-button quaternary @click="goBack">
                <template #icon>
                    <n-icon :component="ArrowBackOutline" />
                </template>
                {{ backButtonText || '返回配置总览' }}
            </n-button>
        </n-space>
    </div>
</template>

<script setup lang="ts">
import { ArrowBackOutline } from '@vicons/ionicons5';
import { useRouter } from 'vue-router';

interface Props {
    title: string;
    serverName?: string;
    backButtonText?: string;
    backPath?: string;
}

const props = withDefaults(defineProps<Props>(), {
    serverName: '',
    backButtonText: '返回配置总览',
    backPath: '/servers/[id]/config'
});

const router = useRouter();

const goBack = () => {
    // 如果 backPath 包含 [id]，则使用当前路由的 id 参数替换
    if (props.backPath.includes('[id]')) {
        const currentRoute = router.currentRoute.value;
        const serverId = currentRoute.params.id;
        const targetPath = props.backPath.replace('[id]', serverId as string);
        router.push(targetPath);
    } else {
        router.push(props.backPath);
    }
};
</script>

<style scoped lang="less">
.header {
    margin-bottom: 24px;
}
</style>
