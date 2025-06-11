<template>
    <div class="general-config">
        <n-space vertical size="large">
            <!-- 基本信息 -->
            <n-card title="基本信息" size="small">
                <n-form :model="generalConfig" label-placement="left" label-width="120px">
                    <n-form-item label="服务器名称">
                        <n-input v-model:value="generalConfig.name" placeholder="输入服务器名称" />
                    </n-form-item>
                    <n-form-item label="服务器Token">
                        <n-input v-model:value="generalConfig.token" placeholder="服务器访问令牌" readonly />
                        <template #feedback> Token用于服务器认证，不可修改 </template>
                    </n-form-item>
                </n-form>
            </n-card>

            <!-- 服务器状态 -->
            <n-card title="服务器状态" size="small">
                <n-space vertical size="medium">
                    <n-space align="center">
                        <n-text>当前状态：</n-text>
                        <n-tag :type="serverStatus?.isOnline ? 'success' : 'error'" size="small">
                            {{ serverStatus?.isOnline ? '在线' : '离线' }}
                        </n-tag>
                    </n-space>

                    <n-space v-if="serverStatus?.software" align="center">
                        <n-text>服务端：</n-text>
                        <n-text>{{ serverStatus.software }}</n-text>
                    </n-space>

                    <n-space v-if="serverStatus?.version" align="center">
                        <n-text>版本：</n-text>
                        <n-text>{{ serverStatus.version }}</n-text>
                    </n-space>
                </n-space>
            </n-card>

            <!-- 保存按钮 -->
            <n-space justify="end">
                <n-button type="primary" :loading="saving" @click="saveGeneralConfig"> 保存基本配置 </n-button>
            </n-space>
        </n-space>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useRequest } from 'alova/client';
import type { ServerWithStatus } from '~/server/shared/types/server/api';

const props = defineProps<{
    serverId: number;
}>();

const message = useMessage();
const { serverApi } = useApi();

const generalConfig = ref({
    name: '',
    token: ''
});

const serverStatus = ref<ServerWithStatus | null>(null);
const saving = ref(false);

const fetchGeneralConfig = () => {
    useRequest(serverApi.getServer(props.serverId))
        .onSuccess(({ data }) => {
            if (data.success && data.data) {
                generalConfig.value = {
                    name: data.data.name || '',
                    token: data.data.token || ''
                };
                serverStatus.value = data.data;
            } else {
                message.error(data.message || '获取基本配置失败');
            }
        })
        .onError((error) => {
            message.error('获取基本配置失败');
            console.error('获取基本配置失败:', error);
        });
};

const saveGeneralConfig = () => {
    saving.value = true;
    useRequest(
        serverApi.updateServer(props.serverId, {
            name: generalConfig.value.name
        })
    )
        .onSuccess(({ data }) => {
            if (data.success) {
                message.success('基本配置保存成功');
            } else {
                message.error(data.message || '保存基本配置失败');
            }
        })
        .onError((error) => {
            message.error('保存基本配置失败');
            console.error('保存基本配置失败:', error);
        })
        .onComplete(() => {
            saving.value = false;
        });
};

onMounted(() => {
    fetchGeneralConfig();
});
</script>

<style scoped lang="less">
.general-config {
    .n-card {
        margin-bottom: 16px;
    }
}
</style>
