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

const props = defineProps<{
    serverId: number;
}>();

const message = useMessage();
const { serverApi } = useApi();

// 基本配置
const generalConfig = ref({
    name: '',
    token: ''
});

// 服务器状态
const serverStatus = ref<any>(null);
const saving = ref(false);

// 获取基本配置
const fetchGeneralConfig = async () => {
    try {
        const response: any = await serverApi.getServer(props.serverId);
        if (response.data) {
            generalConfig.value = {
                name: response.data.name || '',
                token: response.data.token || ''
            };
            serverStatus.value = response.data;
        }
    } catch (error) {
        console.error('获取基本配置失败:', error);
        message.error('获取基本配置失败');
    }
};

// 保存基本配置
const saveGeneralConfig = async () => {
    saving.value = true;
    try {
        await serverApi.updateServer(props.serverId, {
            name: generalConfig.value.name
        });
        message.success('基本配置保存成功');
    } catch (error) {
        console.error('保存基本配置失败:', error);
        message.error('保存基本配置失败');
    } finally {
        saving.value = false;
    }
};

// 初始化
onMounted(async () => {
    await fetchGeneralConfig();
});
</script>

<style scoped lang="less">
.general-config {
    .n-card {
        margin-bottom: 16px;
    }
}
</style>
