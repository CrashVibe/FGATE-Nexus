<template>
  <div class="advanced-config">
    <!-- 使用 Naive UI 网格系统进行响应式布局 -->
    <n-grid :cols="1" y-gap="20" :item-responsive="true">
      <!-- 服务器管理卡片 -->
      <n-gi>
        <n-card title="服务器管理" size="small" hoverable>
          <n-alert type="info" title="提示" class="management-alert"> 这些操作将影响服务器连接和数据 </n-alert>

          <n-grid :cols="isMobile ? 1 : 2" x-gap="20" y-gap="16" :item-responsive="true">
            <!-- 连接管理 -->
            <n-gi>
              <n-card embedded class="action-card">
                <template #header>
                  <n-text>连接管理</n-text>
                </template>
                <n-space vertical size="medium">
                  <n-button type="warning" :loading="operating" block @click="forceDisconnect"> 断开连接 </n-button>
                  <n-text depth="3" style="text-align: center"> 断开与服务器的连接 </n-text>
                </n-space>
              </n-card>
            </n-gi>

            <!-- 服务器删除 -->
            <n-gi>
              <n-card embedded class="action-card">
                <template #header>
                  <n-text>服务器删除</n-text>
                </template>
                <n-space vertical size="medium">
                  <n-button type="error" :loading="operating" block @click="deleteServer"> 删除服务器 </n-button>
                  <n-text depth="3" style="text-align: center"> 永久删除服务器及其所有数据 </n-text>
                </n-space>
              </n-card>
            </n-gi>
          </n-grid>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import { useRouter } from 'vue-router';
import { useRequest } from 'alova/client';
import { useBreakpoint, useMemo } from 'vooks';
import type { ServerWithStatus } from '~/server/shared/types/server/api';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

const props = defineProps<{
  serverId: number;
}>();

const message = useMessage();
const dialog = useDialog();
const router = useRouter();
const { serverApi } = useApi();

const serverStatus = ref<ServerWithStatus>({
  isOnline: false,
  playerCount: 0,
  lastSeen: null,
  supportsRcon: false,
  supportsPapi: false,
  software: '',
  version: '',
  id: 0,
  name: '',
  token: '',
  adapter_id: null
});

const operating = ref(false);

const fetchServerStatus = () => {
  useRequest(serverApi.getServerStatus(props.serverId))
    .onSuccess(({ data }) => {
      if (data.success && data.data) {
        Object.assign(serverStatus.value, data.data);
      } else {
        message.error(data.message || '获取服务器状态失败');
      }
    })
    .onError(() => {
      message.error('获取服务器状态失败');
    });
};

const forceDisconnect = () => {
  dialog.warning({
    title: '确认断开',
    content: '此操作将断开与服务器的连接，服务器将显示为离线状态。',
    positiveText: '确认',
    negativeText: '取消',
    onPositiveClick: () => {
      operating.value = true;
      useRequest(serverApi.disconnectServer(props.serverId))
        .onSuccess(({ data }) => {
          if (data.success) {
            message.success('连接已断开');
            fetchServerStatus();
          } else {
            message.error(data.message || '断开连接失败');
          }
        })
        .onError(() => {
          message.error('断开连接失败');
        })
        .onComplete(() => {
          operating.value = false;
        });
    }
  });
};

const deleteServer = () => {
  dialog.error({
    title: '确认删除',
    content: '此操作将永久删除服务器及其所有数据，是否继续？',
    positiveText: '确认删除',
    negativeText: '取消',
    onPositiveClick: () => {
      operating.value = true;
      useRequest(serverApi.deleteServer(props.serverId))
        .onSuccess(({ data }) => {
          if (data.success) {
            message.success('服务器删除成功');
            router.push('/');
          } else {
            message.error(data.message || '删除服务器失败');
          }
        })
        .onError(() => {
          message.error('删除服务器失败');
        })
        .onComplete(() => {
          operating.value = false;
        });
    }
  });
};

let statusInterval: ReturnType<typeof setInterval> | null = null;

onMounted(() => {
  fetchServerStatus();
  statusInterval = setInterval(fetchServerStatus, 5000);
});

onBeforeUnmount(() => {
  if (statusInterval) {
    clearInterval(statusInterval);
    statusInterval = null;
  }
});
</script>

<style scoped lang="less">
.advanced-config {
  .management-alert {
    margin-bottom: 16px;
  }

  .action-card {
    height: 100%;

    :deep(.n-card__header) {
      text-align: center;
      font-weight: 600;
    }

    :deep(.n-card__content) {
      display: flex;
      flex-direction: column;
      justify-content: center;
      height: 100%;
    }
  }
}
</style>
