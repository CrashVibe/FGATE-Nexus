<template>
  <n-card hoverable bordered class="onebot-card" @click="handleCardClick">
    <div class="card-header">
      <div class="bot-info">
        <n-icon size="24">
          <svg viewBox="0 0 24 24">
            <path
              d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
            />
          </svg>
        </n-icon>
        <div class="bot-details">
          <h3 class="bot-name">
            {{ adapter.detail?.connectionType === 'forward' ? `适配器 ${adapter.id}` : `Bot ${adapter.detail?.botId}` }}
          </h3>
          <p class="bot-type">OneBot V11 ({{ adapter.detail?.connectionType === 'forward' ? '正向' : '反向' }})</p>
        </div>
      </div>

      <div class="status-badges">
        <n-tag :type="statusType" size="small" round>
          {{ statusText }}
        </n-tag>
      </div>
    </div>

    <div class="card-body">
      <div class="connection-info">
        <div class="info-item">
          <span class="info-label">连接方式</span>
          <n-tag :type="adapter.detail?.connectionType === 'forward' ? 'warning' : 'info'" size="small" round>
            {{ adapter.detail?.connectionType === 'forward' ? '正向连接' : '反向连接' }}
          </n-tag>
        </div>

        <div class="info-item">
          <span class="info-label">响应超时</span>
          <span class="info-value">
            {{ adapter.detail?.responseTimeout != null ? (adapter.detail.responseTimeout / 1000).toFixed(1) : '-' }}s
          </span>
        </div>

        <div v-if="adapter.detail?.accessToken" class="info-item token-item">
          <span class="info-label">访问令牌</span>
          <div class="token-display" @click.stop="showToken = !showToken">
            <span class="token-value">
              {{ showToken ? adapter.detail.accessToken : '●●●●●●●●' }}
            </span>
            <n-icon :component="showToken ? EyeOutline : EyeOff" size="14" class="token-icon" />
          </div>
        </div>
      </div>
    </div>

    <div class="card-footer" @click.stop>
      <div class="action-buttons">
        <n-button
          :type="adapter.detail?.enabled ? 'warning' : 'primary'"
          size="small"
          :loading="toggleLoading"
          class="toggle-btn"
          @click="toggleAdapter"
        >
          {{ adapter.detail?.enabled ? '禁用' : '启用' }}
        </n-button>

        <n-button type="error" size="small" :loading="deleteLoading" class="delete-btn" @click="deleteAdapter">
          删除
        </n-button>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import type { OnebotAdapterUnion } from '~/server/shared/types/adapters/adapter';
import { EyeOutline, EyeOff } from '@vicons/ionicons5';
import { useRequest } from 'alova/client';

const props = defineProps<{
  adapter: OnebotAdapterUnion;
}>();

const emit = defineEmits<{
  update: [];
  delete: [];
  'editing-change': [adapterId: number, isEditing: boolean];
  click: [];
}>();

const { adapterApi } = useApi();
const message = useMessage();
const dialog = useDialog();

const showToken = ref(false);
const toggleLoading = ref(false);
const deleteLoading = ref(false);

// 状态相关的计算属性
const statusType = computed(() => {
  const enabled = props.adapter.detail?.enabled;
  const connected = props.adapter.connected;

  if (enabled && connected) return 'success';
  if (enabled && !connected) return 'warning';
  return 'error';
});

const statusText = computed(() => {
  const enabled = props.adapter.detail?.enabled;
  const connected = props.adapter.connected;

  if (enabled && connected) return '运行中';
  if (enabled && !connected) return '已启用';
  return '已禁用';
});

// 处理卡片点击 - 发出事件让父组件处理跳转
function handleCardClick() {
  emit('click');
}

// 切换启用/禁用状态
function toggleAdapter() {
  toggleLoading.value = true;
  const newEnabled = !props.adapter.detail?.enabled;

  // 确保包含所有当前配置，只更新 enabled 字段
  const currentConfig = {
    botId: props.adapter.detail?.botId || null,
    accessToken: props.adapter.detail?.accessToken || null,
    responseTimeout: props.adapter.detail?.responseTimeout || 6000,
    enabled: newEnabled,
    connectionType: props.adapter.detail?.connectionType || 'reverse',
    forwardUrl: props.adapter.detail?.forwardUrl || null,
    autoReconnect: props.adapter.detail?.autoReconnect ?? true
  };

  console.log('切换适配器状态:', { id: props.adapter.id, newEnabled, config: currentConfig });

  useRequest(
    adapterApi.updateAdapter(props.adapter.id, {
      adapter_type: 'onebot',
      config: currentConfig
    })
  )
    .onSuccess(({ data }) => {
      if (data.success) {
        message.success(`适配器已${newEnabled ? '启用' : '禁用'}`);
        emit('update');
      } else {
        message.error(data.message || '操作失败');
      }
    })
    .onError(() => {
      message.error('操作失败');
    })
    .onComplete(() => {
      toggleLoading.value = false;
    });
}

// 删除适配器
function deleteAdapter() {
  const displayName =
    props.adapter.detail?.connectionType === 'forward'
      ? `适配器 ${props.adapter.id}`
      : `机器人 ${props.adapter.detail?.botId}`;

  dialog.warning({
    title: '确认删除',
    content: `确定要删除${displayName}吗？此操作不可撤销。`,
    positiveText: '确定删除',
    negativeText: '取消',
    onPositiveClick: () => {
      deleteLoading.value = true;

      useRequest(adapterApi.deleteAdapter(props.adapter.id))
        .onSuccess(({ data }) => {
          if (data.success) {
            message.success('适配器已删除');
            emit('delete');
          } else {
            message.error(data.message || '删除失败');
          }
        })
        .onError(() => {
          message.error('删除失败');
        })
        .onComplete(() => {
          deleteLoading.value = false;
        });
    }
  });
}
</script>

<style scoped lang="less">
.onebot-card {
  cursor: pointer;
  transition: all 0.3s ease;
  border-radius: 8px;

  &:hover {
    transform: translateY(-2px);
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.bot-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.bot-details {
  flex: 1;
  min-width: 0;
}

.bot-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  line-height: 1.3;
}

.bot-type {
  margin: 0;
  font-size: 12px;
  opacity: 0.7;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badges {
  flex-shrink: 0;
}

.card-body {
  margin-bottom: 16px;
}

.connection-info {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: var(--n-color);
  border-radius: 6px;
  border: 1px solid var(--n-border-color);

  &.token-item {
    cursor: pointer;
  }
}

.info-label {
  font-size: 13px;
  opacity: 0.8;
  font-weight: 500;
}

.info-value {
  font-size: 13px;
  font-weight: 500;
}

.token-display {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 6px;
  border-radius: 4px;
  transition: all 0.2s ease;

  .token-value {
    font-family: monospace;
    font-size: 12px;
    max-width: 120px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .token-icon {
    opacity: 0.6;
  }
}

.card-footer {
  border-top: 1px solid var(--n-border-color);
  padding-top: 16px;
  margin-top: 16px;
}

.action-buttons {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
}

/* 移动端适配 */
@media (max-width: 768px) {
  .card-header {
    flex-direction: column;
    gap: 12px;
    margin-bottom: 12px;
  }

  .bot-info {
    width: 100%;
  }

  .status-badges {
    align-self: flex-start;
  }

  .info-item {
    padding: 6px 10px;
  }

  .info-label,
  .info-value {
    font-size: 12px;
  }

  .action-buttons {
    justify-content: stretch;
  }

  .toggle-btn,
  .delete-btn {
    flex: 1;
  }
}

@media (max-width: 480px) {
  .bot-name {
    font-size: 15px;
  }

  .connection-info {
    gap: 6px;
  }

  .card-footer {
    margin-top: 12px;
    padding-top: 12px;
  }
}
</style>
