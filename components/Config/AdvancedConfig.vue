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

        <n-space :vertical="isMobile" size="medium">
          <n-form-item label="连接管理">
            <n-space :vertical="isMobile" :align="isMobile ? 'stretch' : 'center'">
              <n-button type="warning" :loading="operating" :block="isMobile" @click="forceDisconnect">
                断开连接
              </n-button>
              <n-text depth="3">断开与服务器的连接</n-text>
            </n-space>
          </n-form-item>

          <n-form-item label="服务器删除">
            <n-space :vertical="isMobile" :align="isMobile ? 'stretch' : 'center'">
              <n-button type="error" :loading="operating" :block="isMobile" @click="deleteServer">
                删除服务器
              </n-button>
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
  .n-card {
    margin-bottom: 16px;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .advanced-config {
    .n-card {
      margin-bottom: 12px;

      :deep(.n-card__content) {
        padding: 12px;
      }

      .n-form-item {
        :deep(.n-form-item__label) {
          font-size: 14px;
          margin-bottom: 8px;
        }
      }

      .n-alert {
        margin-bottom: 12px;

        :deep(.n-alert__content) {
          font-size: 13px;
          line-height: 1.4;
        }
      }
    }
  }
}

@media (max-width: 480px) {
  .advanced-config {
    .n-card {
      :deep(.n-card__content) {
        padding: 8px;
      }

      .n-form-item {
        :deep(.n-form-item__label) {
          font-size: 13px;
        }
      }

      .n-alert {
        :deep(.n-alert__content) {
          font-size: 12px;
        }
      }
    }
  }
}
</style>
