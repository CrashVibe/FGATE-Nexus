<template>
  <div class="general-config">
    <n-space vertical size="large">
      <!-- 基本信息 -->
      <n-card title="基本信息" size="small">
        <n-form
          :model="generalConfig"
          :label-placement="isMobile ? 'top' : 'left'"
          :label-width="isMobile ? undefined : '120px'"
        >
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

      <n-card title="Bot 实例绑定" size="small">
        <n-space vertical size="medium">
          <template v-if="adapterStatus">
            <n-alert v-if="!adapterStatus.hasAdapter" type="info" size="small">
              未配置 Bot 实例，某些功能（如账号绑定）将无法使用
            </n-alert>
            <n-alert v-else-if="!adapterStatus.adapterConnected" type="warning" size="small">
              Bot 实例已配置但未连接 ({{ adapterStatus.adapterInfo?.type }})
            </n-alert>
            <n-alert v-else type="success" size="small">
              Bot 实例已连接 ({{ adapterStatus.adapterInfo?.type }})
            </n-alert>
          </template>

          <n-form
            :model="generalConfig"
            :label-placement="isMobile ? 'top' : 'left'"
            :label-width="isMobile ? undefined : '120px'"
          >
            <n-form-item label="Bot 实例">
              <n-select
                v-model:value="generalConfig.adapter_id"
                :options="botOptions"
                placeholder="请选择要绑定的 Bot 实例"
                clearable
                @update:value="onAdapterChange"
              />
              <template #feedback> Bot 实例用于连接外部平台（如QQ机器人），实现账号绑定等功能 </template>
            </n-form-item>
          </n-form>
        </n-space>
      </n-card>

      <!-- 保存按钮 -->
      <n-space :justify="isMobile ? 'center' : 'end'">
        <n-button type="primary" :loading="saving" :block="isMobile" @click="saveGeneralConfig">
          保存基本配置
        </n-button>
      </n-space>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, inject, onUnmounted } from 'vue';
import { useMessage } from 'naive-ui';
import { useRequest } from 'alova/client';
import { useBreakpoint, useMemo } from 'vooks';
import type { ServerWithStatus } from '~/server/shared/types/server/api';
import type { AdapterUnionType } from '~/server/shared/types/adapters/adapter';
import { isOnebotAdapter, isWebSocketAdapter } from '~/utils/adapters/componentMap';
import { useAdapterStatus } from '~/composables/useAdapterStatus';

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
const { serverApi, adapterApi } = useApi();
const { adapterStatus, fetchAdapterStatus } = useAdapterStatus(props.serverId);

// 从 layout 注入页面状态管理函数
const registerPageState = inject<(state: PageState) => void>('registerPageState');
const clearPageState = inject<() => void>('clearPageState');

const generalConfig = ref({
  name: '',
  token: '',
  adapter_id: null as number | null // 明确类型
});

const initialConfig = ref({ name: '', token: '', adapter_id: null as number | null });

const serverStatus = ref<ServerWithStatus | null>(null);
const saving = ref(false);

// Bot 实例选项
const botOptions = ref<{ label: string; value: number }[]>([]);

// 获取 Bot 实例标签
function getBotLabel(adapter: AdapterUnionType): string {
  if (isOnebotAdapter(adapter)) {
    return `OneBot ${adapter.detail?.botId || adapter.id}`;
  }
  if (isWebSocketAdapter(adapter)) {
    return `WebSocket ${adapter.detail?.url || adapter.id}`;
  }
  return `${adapter.type} ${adapter.id}`;
}

// 获取 Bot 实例列表
const fetchBotOptions = () => {
  useRequest(adapterApi.getAdapters()).onSuccess(({ data }) => {
    if (data.success && data.data) {
      botOptions.value = data.data.map((adapter) => ({
        label: getBotLabel(adapter),
        value: adapter.id
      }));
    }
  });
};

// Bot 实例变更时的处理
const onAdapterChange = () => {
  // 延迟更新 Bot 实例状态，给后端时间处理
  setTimeout(() => {
    fetchAdapterStatus();
  }, 500);
};

const fetchGeneralConfig = () => {
  useRequest(serverApi.getServer(props.serverId))
    .onSuccess(({ data }) => {
      if (data.success && data.data) {
        generalConfig.value = {
          name: data.data.name || '',
          token: data.data.token || '',
          adapter_id: data.data.adapter_id ?? null
        };
        // 记录初始数据用于未保存检测
        initialConfig.value = { ...generalConfig.value };
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

const isDirty = computed(() => {
  // 只比较可编辑字段
  return (
    generalConfig.value.name !== initialConfig.value.name ||
    generalConfig.value.adapter_id !== initialConfig.value.adapter_id
  );
});

const saveGeneralConfig = async () => {
  saving.value = true;
  return new Promise<void>((resolve, reject) => {
    useRequest(
      serverApi.updateServer(props.serverId, {
        name: generalConfig.value.name,
        adapter_id: generalConfig.value.adapter_id
      })
    )
      .onSuccess(({ data }) => {
        if (data.success) {
          message.success('基本配置保存成功');
          // 更新初始配置
          initialConfig.value = { ...generalConfig.value };
          // 保存成功后刷新 Bot 实例状态
          fetchAdapterStatus();
          resolve();
        } else {
          message.error(data.message || '保存基本配置失败');
          reject(new Error(data.message || '保存基本配置失败'));
        }
      })
      .onError((error) => {
        message.error('保存基本配置失败');
        console.error('保存基本配置失败:', error);
        reject(error);
      })
      .onComplete(() => {
        saving.value = false;
      });
  });
};

// 注册页面状态到 layout
onMounted(() => {
  if (registerPageState) {
    registerPageState({
      isDirty: () => isDirty.value,
      save: saveGeneralConfig
    });
  }
  fetchGeneralConfig();
  fetchBotOptions();
  fetchAdapterStatus();
});

// 组件卸载时清理状态
onUnmounted(() => {
  if (clearPageState) {
    clearPageState();
  }
});
</script>

<style scoped lang="less">
.general-config {
  .n-card {
    margin-bottom: 16px;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .general-config {
    .n-card {
      margin-bottom: 12px;

      :deep(.n-card__content) {
        padding: 12px;
      }

      .n-form-item {
        margin-bottom: 16px;

        :deep(.n-form-item__label) {
          font-size: 14px;
          margin-bottom: 8px;
        }

        :deep(.n-form-item__feedback) {
          font-size: 12px;
          line-height: 1.4;
        }
      }
    }

    .n-space {
      gap: 12px;
    }
  }
}

@media (max-width: 480px) {
  .general-config {
    .n-card {
      :deep(.n-card__content) {
        padding: 8px;
      }

      .n-form-item {
        margin-bottom: 12px;

        :deep(.n-form-item__label) {
          font-size: 13px;
        }

        :deep(.n-form-item__feedback) {
          font-size: 11px;
        }
      }
    }
  }
}
</style>
