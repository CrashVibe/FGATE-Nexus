<template>
    <div class="advanced-config">
        <n-space vertical size="large">
            <!-- 连接状态 -->
            <n-card title="服务器状态" size="small">
                <n-space vertical size="medium">
                    <n-space align="center">
                        <n-text>连接状态：</n-text>
                        <n-tag :type="serverStatus.isOnline ? 'success' : 'error'" size="small">
                            {{ serverStatus.isOnline ? '在线' : '离线' }}
                        </n-tag>
                    </n-space>

                    <n-space v-if="serverStatus.isOnline" align="center">
                        <n-text>在线玩家：</n-text>
                        <n-text>{{ serverStatus.playerCount || 0 }}</n-text>
                    </n-space>

                    <n-space v-if="serverStatus.lastSeen" align="center">
                        <n-text>最后连接：</n-text>
                        <n-text>{{ formatTime(serverStatus.lastSeen) }}</n-text>
                    </n-space>
                </n-space>
            </n-card>

            <!-- 服务器管理 -->
            <n-card title="服务器管理" size="small">
                <n-alert type="info" title="提示" style="margin-bottom: 16px"> 这些操作将影响服务器连接和数据 </n-alert>

                <n-space vertical size="medium">
                    <n-form-item label="连接管理">
                        <n-space align="center">
                            <n-button type="warning" :loading="operating" @click="forceDisconnect"> 断开连接 </n-button>
                            <n-text depth="3">断开与服务器的连接</n-text>
                        </n-space>
                    </n-form-item>

                    <n-form-item label="服务器删除">
                        <n-space align="center">
                            <n-button type="error" :loading="operating" @click="deleteServer"> 删除服务器 </n-button>
                            <n-text depth="3">永久删除服务器及其所有数据</n-text>
                        </n-space>
                    </n-form-item>
                </n-space>
            </n-card>
        </n-space>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useRouter } from 'vue-router';

const props = defineProps<{
    serverId: number;
}>();

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const { serverApi } = useApi();

// 服务器状态
const serverStatus = ref({
    isOnline: false,
    playerCount: 0,
    lastSeen: null as Date | null,
    supportsRcon: false,
    software: '',
    version: ''
});

// 操作状态
const operating = ref(false);

// 获取服务器状态
const fetchServerStatus = async () => {
    try {
        const response: any = await serverApi.getServerStatus(props.serverId);
        if (response.success) {
            Object.assign(serverStatus.value, response.data);
        }
    } catch (error) {
        console.error('获取服务器状态失败:', error);
    }
};

// 强制断开连接
const forceDisconnect = () => {
    dialog.warning({
        title: '确认断开',
        content: '此操作将断开与服务器的连接，服务器将显示为离线状态。',
        positiveText: '确认',
        negativeText: '取消',
        onPositiveClick: async () => {
            operating.value = true;
            try {
                await serverApi.disconnectServer(props.serverId);
                message.success('连接已断开');
                await fetchServerStatus();
            } catch (error) {
                console.error('断开连接失败:', error);
                message.error('断开连接失败');
            } finally {
                operating.value = false;
            }
        }
    });
};

// 删除服务器
const deleteServer = () => {
    dialog.error({
        title: '确认删除',
        content: '此操作将永久删除服务器及其所有数据，是否继续？',
        positiveText: '确认删除',
        negativeText: '取消',
        onPositiveClick: async () => {
            operating.value = true;
            try {
                await serverApi.deleteServer(props.serverId);
                message.success('服务器删除成功');
                router.push('/');
            } catch (error) {
                console.error('删除服务器失败:', error);
                message.error('删除服务器失败');
            } finally {
                operating.value = false;
            }
        }
    });
};

// 格式化时间
const formatTime = (date: Date | null) => {
    if (!date) return '从未连接';
    return new Intl.DateTimeFormat('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    }).format(new Date(date));
};

// 初始化
let statusInterval: ReturnType<typeof setInterval> | null = null;

onMounted(async () => {
    await fetchServerStatus();
    // 定期刷新状态
    statusInterval = setInterval(fetchServerStatus, 5000); // 降低刷新频率
});

onBeforeUnmount(() => {
    // 清理定时器
    if (statusInterval) {
        clearInterval(statusInterval);
        statusInterval = null;
    }
});
</script>

<style scoped lang="less">
.advanced-config {
    .n-card {
        margin-bottom: 16px;
    }
}
</style>
