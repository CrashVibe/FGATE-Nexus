<template>
  <div class="forward-connection-section">
    <n-divider dashed />
    <div class="section-header">
      <n-text strong>连接类型配置</n-text>
    </div>

    <n-form-item label="连接类型" :show-feedback="false">
      <n-select
        v-model:value="connectionType"
        :options="connectionTypeOptions"
        @update:value="onConnectionTypeChange"
      />
    </n-form-item>

    <!-- 正向连接配置 -->
    <template v-if="connectionType === 'forward'">
      <n-form-item label="机器人 WebSocket URL" :show-feedback="false">
        <n-input v-model:value="forwardConfig.url" placeholder="ws://localhost:5700" clearable />
      </n-form-item>

      <n-form-item label="自动重连" :show-feedback="false">
        <n-switch v-model:value="forwardConfig.autoReconnect" />
      </n-form-item>

      <!-- 连接控制按钮 -->
      <div class="connection-controls">
        <n-button
          v-if="!forwardConnection.connected"
          type="primary"
          :loading="connecting"
          :disabled="!forwardConfig.url"
          size="small"
          @click="connectForward"
        >
          连接
        </n-button>

        <n-button v-else type="warning" :loading="disconnecting" size="small" @click="disconnectForward">
          断开连接
        </n-button>

        <n-button secondary size="small" :loading="statusLoading" @click="refreshStatus"> 刷新状态 </n-button>
      </div>

      <!-- 连接状态显示 -->
      <div class="connection-status">
        <n-tag :bordered="false" :type="forwardConnection.connected ? 'success' : 'error'" size="small">
          {{ forwardConnection.connected ? '正向连接已建立' : '正向连接未建立' }}
        </n-tag>
      </div>
    </template>

    <!-- 反向连接说明 -->
    <template v-else>
      <n-alert type="info" :show-icon="false">
        <template #header>反向连接模式</template>
        机器人客户端将主动连接到此服务器的 WebSocket 端点。<br />
        连接地址：<code>{{ reverseWsUrl }}</code>
      </n-alert>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { useMessage } from 'naive-ui';
import { useRequest } from 'alova/client';

interface ForwardConfig {
  url: string;
  autoReconnect: boolean;
}

interface ForwardConnection {
  connected: boolean;
  readyState: number | null;
}

const props = defineProps<{
  adapterId: number;
  currentConnectionType?: 'reverse' | 'forward';
  currentForwardUrl?: string;
  currentAutoReconnect?: boolean;
}>();

const emit = defineEmits<{
  (e: 'connection-type-changed', type: 'reverse' | 'forward'): void;
}>();

const { $serverAPI } = useNuxtApp();
const message = useMessage();

// 状态管理
const connectionType = ref<'reverse' | 'forward'>(props.currentConnectionType || 'reverse');
const connecting = ref(false);
const disconnecting = ref(false);
const statusLoading = ref(false);

// 正向连接配置
const forwardConfig = ref<ForwardConfig>({
  url: props.currentForwardUrl || '',
  autoReconnect: props.currentAutoReconnect ?? true
});

// 正向连接状态
const forwardConnection = ref<ForwardConnection>({
  connected: false,
  readyState: null
});

// 选项配置
const connectionTypeOptions = [
  { label: '反向连接（机器人连接到服务器）', value: 'reverse' },
  { label: '正向连接（服务器连接到机器人）', value: 'forward' }
];

// 计算属性
const reverseWsUrl = computed(() => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host;
  return `${protocol}//${host}/ws/onebot/v11`;
});

// 监听 props 变化
watch(
  () => [props.currentConnectionType, props.currentForwardUrl, props.currentAutoReconnect],
  ([newType, newUrl, newAutoReconnect]) => {
    if (typeof newType === 'string') {
      connectionType.value = newType as 'reverse' | 'forward';
    }
    if (typeof newUrl === 'string') {
      forwardConfig.value.url = newUrl;
    }
    if (typeof newAutoReconnect === 'boolean') {
      forwardConfig.value.autoReconnect = newAutoReconnect;
    }
  }
);

// 方法定义
function onConnectionTypeChange(type: 'reverse' | 'forward') {
  emit('connection-type-changed', type);

  if (type === 'reverse' && forwardConnection.value.connected) {
    // 如果切换到反向连接且当前有正向连接，断开它
    disconnectForward();
  }
}

async function connectForward() {
  if (!forwardConfig.value.url) {
    message.error('请输入机器人 WebSocket URL');
    return;
  }

  connecting.value = true;

  try {
    const response = await useRequest(
      $serverAPI.Post(`/adapters/${props.adapterId}/forward`, {
        url: forwardConfig.value.url,
        autoReconnect: forwardConfig.value.autoReconnect
      })
    ).send();

    const data = response as { success: boolean; message: string };

    if (data.success) {
      message.success('正向连接建立成功');
      await refreshStatus();
    } else {
      message.error(data.message || '连接失败');
    }
  } catch (error) {
    console.error('连接失败:', error);
    message.error('连接失败');
  } finally {
    connecting.value = false;
  }
}

async function disconnectForward() {
  disconnecting.value = true;

  try {
    const response = await useRequest($serverAPI.Delete(`/adapters/${props.adapterId}/forward`)).send();

    const data = response as { success: boolean; message: string };

    if (data.success) {
      message.success('正向连接已断开');
      forwardConnection.value.connected = false;
      forwardConnection.value.readyState = null;
    } else {
      message.error(data.message || '断开连接失败');
    }
  } catch (error) {
    console.error('断开连接失败:', error);
    message.error('断开连接失败');
  } finally {
    disconnecting.value = false;
  }
}

async function refreshStatus() {
  statusLoading.value = true;

  try {
    const response = await useRequest($serverAPI.Get(`/adapters/${props.adapterId}/forward`)).send();

    const data = response as {
      success: boolean;
      data: {
        botId: number;
        connected: boolean;
        readyState: number | null;
      };
    };

    if (data.success) {
      forwardConnection.value.connected = data.data.connected;
      forwardConnection.value.readyState = data.data.readyState;
    }
  } catch (error) {
    console.error('获取状态失败:', error);
  } finally {
    statusLoading.value = false;
  }
}

// 组件挂载时刷新状态
onMounted(() => {
  if (connectionType.value === 'forward') {
    refreshStatus();
  }
});
</script>

<style scoped>
.forward-connection-section {
  margin-top: 16px;
}

.connection-controls {
  display: flex;
  gap: 8px;
  margin-bottom: 12px;
  flex-wrap: wrap;
}

code {
  font-family: monospace;
  padding: 2px 4px;
  border-radius: 4px;
  background: rgba(127, 127, 127, 0.1);
}
</style>
