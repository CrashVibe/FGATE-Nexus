<template>
  <div class="general-config">
    <!-- 未保存提示条 -->
    <Transition name="alert-slide" mode="out-in">
      <n-alert v-if="isDirty" type="warning" class="unsaved-alert" closable show-icon>
        <template #icon>
          <n-icon>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path
                fill-rule="evenodd"
                d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                clip-rule="evenodd"
              />
            </svg>
          </n-icon>
        </template>
        <div class="unsaved-content">
          <div class="unsaved-text">您有未保存的更改</div>
          <n-space size="small">
            <n-button size="small" type="primary" :loading="saving" @click="saveGeneralConfig"> 保存更改 </n-button>
            <n-button size="small" quaternary @click="discardChanges"> 放弃更改 </n-button>
          </n-space>
        </div>
      </n-alert>
    </Transition>

    <!-- 使用统一的Grid响应式布局 -->
    <n-grid :cols="isMobile ? 1 : 2" :x-gap="20" :y-gap="20" responsive="screen">
      <!-- 基本信息卡片 -->
      <n-grid-item>
        <n-card title="基本信息" size="small" class="config-card">
          <template #header-extra>
            <n-tag size="small" type="primary" round>必填信息</n-tag>
          </template>
          <n-form :model="generalConfig" label-placement="top" :label-width="isMobile ? undefined : '120px'">
            <n-form-item label="服务器名称" :show-feedback="false">
              <n-input v-model:value="generalConfig.name" placeholder="输入服务器名称" maxlength="50" show-count />
            </n-form-item>
            <n-divider dashed />
            <n-form-item label="服务器Token">
              <n-input
                v-model:value="generalConfig.token"
                placeholder="服务器访问令牌"
                readonly
                type="password"
                show-password-on="click"
              />
              <template #feedback>
                <n-text depth="3">
                  <n-icon size="14" style="margin-right: 4px">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </n-icon>
                  Token用于服务器认证，不可修改
                </n-text>
              </template>
            </n-form-item>
          </n-form>
        </n-card>
      </n-grid-item>

      <!-- 服务器状态卡片 -->
      <n-grid-item>
        <n-card title="服务器状态" size="small" class="config-card status-card" style="margin-bottom: 20px">
          <template #header-extra>
            <n-tag :type="serverStatus?.isOnline ? 'success' : 'error'" size="small" round>
              {{ serverStatus?.isOnline ? '在线' : '离线' }}
            </n-tag>
          </template>
          <n-space vertical size="medium">
            <div class="status-grid">
              <div class="status-item">
                <div class="status-label">
                  <n-icon size="16" color="#18a058">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"
                      />
                    </svg>
                  </n-icon>
                  <n-text>连接状态</n-text>
                </div>
                <n-tag :type="serverStatus?.isOnline ? 'success' : 'error'" size="small">
                  {{ serverStatus?.isOnline ? '在线' : '离线' }}
                </n-tag>
              </div>

              <n-divider dashed style="margin: 12px 0" />

              <div v-if="serverStatus?.software" class="status-item">
                <div class="status-label">
                  <n-icon size="16" color="#2080f0">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5zm3 1h6v4H5V6zm6 6H5v2h6v-2z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </n-icon>
                  <n-text>服务端</n-text>
                </div>
                <n-tag type="info" size="small">{{ serverStatus.software }}</n-tag>
              </div>

              <div v-if="serverStatus?.version" class="status-item">
                <div class="status-label">
                  <n-icon size="16" color="#f0a020">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        fill-rule="evenodd"
                        d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  </n-icon>
                  <n-text>版本</n-text>
                </div>
                <n-tag type="warning" size="small">{{ serverStatus.version }}</n-tag>
              </div>

              <div v-if="serverStatus?.isOnline && serverStatus?.playerCount !== undefined" class="status-item">
                <div class="status-label">
                  <n-icon size="16" color="#722ed1">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                      <path
                        d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z"
                      />
                    </svg>
                  </n-icon>
                  <n-text>在线玩家</n-text>
                </div>
                <n-tag type="primary" size="small">{{ serverStatus.playerCount }} 人</n-tag>
              </div>
            </div>
          </n-space>
        </n-card>
        <!-- Bot 实例绑定卡片 -->
        <n-card title="Bot 实例绑定" size="small" class="config-card bot-card">
          <template #header-extra>
            <n-tag
              v-if="adapterStatus"
              :type="!adapterStatus.hasAdapter ? 'default' : !adapterStatus.adapterConnected ? 'warning' : 'success'"
              size="small"
              round
            >
              {{ !adapterStatus.hasAdapter ? '未配置' : !adapterStatus.adapterConnected ? '未连接' : '已连接' }}
            </n-tag>
          </template>
          <n-space vertical size="medium">
            <!-- 状态提示区域 -->
            <div class="bot-status-section">
              <template v-if="adapterStatus">
                <n-alert v-if="!adapterStatus.hasAdapter" type="info" size="small" class="status-alert">
                  <template #icon>
                    <n-icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </n-icon>
                  </template>
                  <div class="alert-content">
                    <n-text strong>未配置 Bot 实例</n-text>
                    <n-text depth="3">某些功能（如账号绑定）将无法使用</n-text>
                  </div>
                </n-alert>
                <n-alert v-else-if="!adapterStatus.adapterConnected" type="warning" size="small" class="status-alert">
                  <template #icon>
                    <n-icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </n-icon>
                  </template>
                  <div class="alert-content">
                    <n-text strong>Bot 实例未连接</n-text>
                    <n-text depth="3">已配置但未连接 ({{ adapterStatus.adapterInfo?.type }})</n-text>
                  </div>
                </n-alert>
                <n-alert v-else type="success" size="small" class="status-alert">
                  <template #icon>
                    <n-icon>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </n-icon>
                  </template>
                  <div class="alert-content">
                    <n-text strong>Bot 实例已连接</n-text>
                    <n-text depth="3">类型：{{ adapterStatus.adapterInfo?.type }}</n-text>
                  </div>
                </n-alert>
              </template>
            </div>

            <n-divider dashed />

            <!-- 配置表单 -->
            <n-form :model="generalConfig" label-placement="top" :label-width="isMobile ? undefined : '120px'">
              <n-form-item label="Bot 实例">
                <n-select
                  v-model:value="generalConfig.adapter_id"
                  :options="botOptions"
                  placeholder="请选择要绑定的 Bot 实例"
                  clearable
                  @update:value="onAdapterChange"
                />
                <template #feedback>
                  <n-text depth="3">
                    <n-icon size="14" style="margin-right: 4px">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fill-rule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                          clip-rule="evenodd"
                        />
                      </svg>
                    </n-icon>
                    Bot 实例用于连接外部平台（如QQ机器人），实现账号绑定等功能
                  </n-text>
                </template>
              </n-form-item>
            </n-form>
          </n-space>
        </n-card>
      </n-grid-item>

      <!-- 保存按钮区域 - 跨列显示 -->
      <n-grid-item :span="isMobile ? 1 : 2">
        <n-divider />
        <div class="save-section">
          <n-button
            type="primary"
            size="large"
            class="save-button"
            :loading="saving"
            :block="isMobile"
            :disabled="!isDirty"
            @click="saveGeneralConfig"
          >
            <template #icon>
              <n-icon>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    d="M7.707 10.293a1 1 0 10-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L11 11.586V6h5a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V8a2 2 0 012-2h5v5.586l-1.293-1.293zM9 4a1 1 0 012 0v2H9V4z"
                  />
                </svg>
              </n-icon>
            </template>
            {{ saving ? '保存中...' : '保存基本配置' }}
          </n-button>
        </div>
      </n-grid-item>
    </n-grid>
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
import { useAdapterStatus } from '~/app/composables/useAdapterStatus';

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

// 添加浏览器刷新/关闭前的确认提示
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '您有未保存的更改，确定要离开此页面吗？';
    return '您有未保存的更改，确定要离开此页面吗？';
  }
};

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

// 放弃更改
function discardChanges() {
  message.info('已放弃未保存的更改');
  generalConfig.value = { ...initialConfig.value };
}

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
  // 注册浏览器关闭前的确认提示
  window.addEventListener('beforeunload', handleBeforeUnload);

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
  // 移除浏览器关闭前的确认提示
  window.removeEventListener('beforeunload', handleBeforeUnload);

  if (clearPageState) {
    clearPageState();
  }
});
</script>

<style scoped lang="less">
.unsaved-alert {
  margin-bottom: 16px;

  .unsaved-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;

    .unsaved-text {
      font-weight: 500;
    }

    @media (max-width: 640px) {
      flex-direction: column;
      gap: 12px;
      align-items: flex-start;
    }
  }
}

/* Alert 过渡动画 */
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.alert-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}

.alert-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}

.alert-slide-enter-to,
.alert-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
  margin-bottom: 16px;
}

.general-config {
  // Grid布局样式优化
  .n-grid {
    .n-grid-item {
      .config-card {
        height: 100%;
        display: flex;
        flex-direction: column;
        margin-bottom: 0; // 移除原有的margin，由grid gap控制间距
        border-radius: 12px;
        transition: all 0.3s ease;
        border: 1px solid var(--border-color);

        &:hover {
          border-color: var(--primary-color);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
        }

        :deep(.n-card__header) {
          padding: 16px 20px 12px;
          border-bottom: 1px solid var(--divider-color);

          .n-card__header__main {
            font-size: 16px;
            font-weight: 600;
            color: var(--text-color-1);
          }
        }

        :deep(.n-card__content) {
          flex: 1;
          padding: 20px;
        }
      }
    }
  }

  // 状态卡片特殊样式
  .status-card {
    .status-grid {
      .status-item {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 8px 0;

        .status-label {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 500;
        }
      }
    }
  }

  // Bot 实例卡片特殊样式
  .bot-card {
    .bot-status-section {
      .status-alert {
        border-radius: 8px;

        .alert-content {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        :deep(.n-alert__content) {
          padding: 12px 16px;
        }
      }
    }
  }

  .save-section {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0;

    .save-button {
      min-width: 120px;
      border-radius: 3px;
      transition: all 0.3s ease;

      &:not(:disabled):hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(24, 160, 88, 0.3);
      }
    }
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .general-config {
    .n-grid {
      .n-grid-item {
        .config-card {
          border-radius: 8px;

          :deep(.n-card__header) {
            padding: 12px 16px 8px;

            .n-card__header__main {
              font-size: 15px;
            }
          }

          :deep(.n-card__content) {
            padding: 16px;
          }
        }
      }
    }

    .status-card {
      .status-grid {
        .status-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          padding: 12px;
          border-radius: 8px;
          margin-bottom: 8px;

          &:last-child {
            margin-bottom: 0;
          }

          .status-label {
            width: 100%;
          }
        }
      }
    }

    .save-section {
      padding: 12px;

      .save-hint {
        padding: 6px 10px;
        font-size: 13px;
      }

      .save-button {
        min-width: 120px;
      }
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
}

@media (max-width: 480px) {
  .general-config {
    .n-grid {
      .n-grid-item {
        .config-card {
          border-radius: 6px;

          :deep(.n-card__header) {
            padding: 10px 12px 6px;

            .n-card__header__main {
              font-size: 14px;
            }
          }

          :deep(.n-card__content) {
            padding: 12px;
          }
        }
      }
    }

    .status-card {
      .status-grid {
        .status-item {
          padding: 10px;

          .status-label {
            font-size: 13px;
          }
        }
      }
    }

    .save-section {
      padding: 10px;

      .save-hint {
        font-size: 12px;
      }

      .save-button {
        min-width: 100px;
        font-size: 13px;
      }
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
</style>
