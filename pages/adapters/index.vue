<script setup lang="ts">
import { AddCircleOutline, RefreshOutline } from '@vicons/ionicons5';
import AdapterOnebotCard from '~/components/Card/Adapter/OnebotCard.vue';
import type { onebot_adapters } from '@/server/shared/types/adapters/adapter';

import type { AdapterFormData, AdapterPayload } from '../../utils/adapters/forms';
import { onebotRules } from '../../utils/adapters/rules';
import Common from '~/components/Card/Adapter/Common.vue';
import { useRequest } from 'alova/client';
import { useBreakpoint, useMemo } from 'vooks';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();
const { adapterApi } = useApi();

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref<HTMLFormElement | null>(null);
const adapters = ref<onebot_adapters[]>([]);
const message = useMessage();
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const lastUpdateTime = ref<string>('');
const editingAdapters = ref<Set<number>>(new Set());

const defaultOneBotConfig: AdapterFormData['config']['onebot'] = {
  botId: null,
  accessToken: null,
  responseTimeout: 6000,
  enabled: true
};

const formData = ref<AdapterFormData>({
  adapter_type: 'onebot',
  config: { onebot: { ...defaultOneBotConfig } }
});

const currentRules = computed(() => {
  const baseRules = {
    adapter: { required: true, message: '请选择适配器类型', trigger: ['blur'] }
  };

  if (formData.value.adapter_type === 'onebot') {
    return {
      ...baseRules,
      'config.onebot.botId': onebotRules.botId,
      'config.onebot.responseTimeout': onebotRules.responseTimeout
    };
  }
  return baseRules;
});
function resetFormData() {
  formData.value = {
    adapter_type: '',
    config: { onebot: { ...defaultOneBotConfig } }
  };
  setTimeout(() => formRef.value?.restoreValidation(), 0);
}

watch(showModal, (val) => {
  if (val) resetFormData();
});

const handleClose = () => {
  showModal.value = false;
};

function getServerList() {
  useRequest(adapterApi.getAdapters())
    .onSuccess(({ data }) => {
      if (data.success && data.data) {
        const newAdapters = data.data.map((newAdapter: onebot_adapters) => {
          if (editingAdapters.value.has(newAdapter.id)) {
            const existingAdapter = adapters.value.find((a: onebot_adapters) => a.id === newAdapter.id);
            return existingAdapter || newAdapter;
          }
          return newAdapter;
        });
        adapters.value = newAdapters;
        lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else {
        message.error(data.message || '获取适配器失败');
      }
    })
    .onError(() => {
      message.error('获取适配器列表失败');
    });
}

const refreshing = ref(false);
const handleRefresh = () => {
  refreshing.value = true;
  useRequest(adapterApi.getAdapters())
    .onSuccess(() => {
      getServerList();
      message.success('刷新成功');
    })
    .onError(() => {
      message.error('刷新失败');
    })
    .onComplete(() => {
      refreshing.value = false;
    });
};

onMounted(() => {
  getServerList();
  refreshTimer.value = setInterval(() => {
    getServerList();
  }, 1000);
});

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
});

const handleSubmit = (e: Event) => {
  e.preventDefault();
  submitting.value = true;
  formRef.value?.validate().then(() => {
    const { adapter_type: adapter, config } = formData.value;
    const payload: AdapterPayload = { adapter_type: adapter };
    if (adapter === 'onebot') {
      const data = config.onebot;
      payload.config = {
        ...data,
        botId: data.botId,
        accessToken: data.accessToken?.trim() || null,
        responseTimeout: data.responseTimeout || 6000,
        enabled: data.enabled ?? true
      };
    }
    useRequest(adapterApi.addAdapter(payload))
      .onSuccess(({ data }) => {
        if (data.success) {
          message.success('适配器创建成功');
          handleClose();
          getServerList();
        } else {
          message.error(data.message || '提交适配器失败');
        }
      })
      .onError(() => {
        message.error('提交适配器失败');
      })
      .onComplete(() => {
        submitting.value = false;
      });
  });
};

const handleEditingChange = (adapterId: number, isEditing: boolean) => {
  if (isEditing) {
    editingAdapters.value.add(adapterId);
  } else {
    editingAdapters.value.delete(adapterId);
  }
};

const onBeforeCardEnter = (el: Element) => {
  (el as HTMLElement).style.opacity = '0';
  (el as HTMLElement).style.transform = 'scale(0.8) translateY(20px)';
};

const onCardEnter = (el: Element, done: () => void) => {
  const index = parseInt((el as HTMLElement).dataset.index || '0');
  const delay = index * 100;

  setTimeout(() => {
    (el as HTMLElement).style.transition = 'all 0.6s cubic-bezier(0.23, 1, 0.32, 1)';
    (el as HTMLElement).style.opacity = '1';
    (el as HTMLElement).style.transform = 'scale(1) translateY(0)';

    setTimeout(done, 600);
  }, delay);
};

const adapterOptions = [{ label: 'OneBotV11', value: 'onebot' }];
</script>

<template>
  <div class="page-container">
    <transition name="content-transition" appear>
      <div class="server-list">
        <div class="head">
          <div class="head-text" :class="{ 'mobile-layout': isMobile }">
            <div class="title-section">
              <n-text strong>
                <h1>适配器列表</h1>
                <p>管理多个适配器，点击进入详细配置。</p>
                <p v-if="lastUpdateTime" class="last-update">最后更新: {{ lastUpdateTime }}</p>
              </n-text>
            </div>
            <div class="action-section">
              <n-space
                :vertical="isMobile"
                :size="isMobile ? 'small' : 'medium'"
                :wrap="!isMobile"
                :justify="isMobile ? 'center' : 'end'"
              >
                <n-button
                  noborder
                  :size="isMobile ? 'medium' : 'medium'"
                  :loading="refreshing"
                  :block="isMobile"
                  @click="handleRefresh"
                >
                  <template #icon>
                    <n-icon><RefreshOutline /></n-icon>
                  </template>
                  刷新列表
                </n-button>
                <n-button
                  type="primary"
                  :size="isMobile ? 'medium' : 'medium'"
                  :block="isMobile"
                  @click="showModal = true"
                >
                  <template #icon>
                    <n-icon><AddCircleOutline /></n-icon>
                  </template>
                  添加适配器
                </n-button>
              </n-space>
            </div>
          </div>
        </div>

        <n-empty v-if="!adapters.length" description="您还没有任何适配器">
          <template #extra>
            <n-button type="primary" :size="isMobile ? 'medium' : 'small'" :block="isMobile" @click="showModal = true">
              <template #icon>
                <n-icon><AddCircleOutline /></n-icon>
              </template>
              创建新适配器
            </n-button>
          </template>
        </n-empty>

        <n-modal
          v-model:show="showModal"
          title="新建适配器"
          preset="dialog"
          :show-icon="false"
          :style="{
            width: isMobile ? '90vw' : '600px',
            maxWidth: isMobile ? '90vw' : '600px'
          }"
        >
          <n-divider />
          <n-form
            ref="formRef"
            :model="formData"
            :rules="currentRules"
            :label-placement="isMobile ? 'top' : 'left'"
            :label-width="isMobile ? undefined : '90px'"
          >
            <n-form-item label="选择适配器" :show-feedback="false">
              <n-select
                v-model:value="formData.adapter_type"
                :options="adapterOptions"
                placeholder="请选择适配器类型"
                style="width: 100%"
              />
            </n-form-item>

            <n-divider />
            <!-- OneBot 适配器表单 -->
            <template v-if="formData.adapter_type === 'onebot'">
              <div class="adapter-modal">
                <n-form-item label="Bot ID" path="config.onebot.botId">
                  <n-input-number
                    v-model:value="formData.config.onebot.botId"
                    placeholder="请输入Bot ID"
                    style="width: 100%"
                  />
                </n-form-item>
                <n-form-item label="访问令牌" path="config.onebot.accessToken">
                  <n-input
                    v-model:value="formData.config.onebot.accessToken"
                    placeholder="请输入访问令牌（可选）"
                    type="password"
                    show-password-on="click"
                    style="width: 100%"
                  />
                </n-form-item>
                <n-form-item label="响应超时" path="config.onebot.responseTimeout">
                  <n-input-number
                    v-model:value="formData.config.onebot.responseTimeout"
                    placeholder="超时时间（毫秒）"
                    :min="1000"
                    :step="1000"
                    style="width: 100%"
                  >
                    <template #suffix>毫秒</template>
                  </n-input-number>
                </n-form-item>
                <n-form-item label="启用适配器" path="config.onebot.enabled">
                  <n-switch v-model:value="formData.config.onebot.enabled" />
                </n-form-item>
              </div>
            </template>
          </n-form>

          <template #action>
            <n-space
              :justify="isMobile ? 'space-between' : 'end'"
              :vertical="isMobile"
              :size="isMobile ? 'small' : 'medium'"
            >
              <n-button :size="isMobile ? 'medium' : 'large'" :block="isMobile" @click="handleClose"> 取消 </n-button>
              <n-button
                type="primary"
                :loading="submitting"
                :disabled="submitting || !formData.adapter_type"
                :size="isMobile ? 'medium' : 'large'"
                :block="isMobile"
                @click="handleSubmit"
              >
                {{ submitting ? '创建中...' : '创建适配器' }}
              </n-button>
            </n-space>
          </template>
        </n-modal>
        <n-grid :cols="isMobile ? 1 : '600:2 1100:3'" x-gap="16" y-gap="16" :item-responsive="true">
          <n-gi v-for="(adapter, index) in adapters" :key="adapter.id">
            <transition name="card-appear" appear :css="false" @enter="onCardEnter" @before-enter="onBeforeCardEnter">
              <component
                :is="adapter.adapterType === 'onebot' ? AdapterOnebotCard : Common"
                :adapter="adapter"
                :data-index="index"
                @update="getServerList"
                @delete="getServerList"
                @editing-change="handleEditingChange"
              />
            </transition>
          </n-gi>
        </n-grid>
      </div>
    </transition>
  </div>
</template>

<style scoped lang="less">
.server-list {
  .head {
    margin-bottom: 24px;

    .head-text {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 16px;

      &.mobile-layout {
        flex-direction: column;
        align-items: stretch;
        gap: 12px;

        .title-section {
          text-align: center;
        }

        .action-section {
          width: 100%;

          :deep(.n-space) {
            width: 100%;

            &.n-space--vertical {
              .n-space-item {
                width: 100%;

                .n-button {
                  width: 100%;
                  justify-content: center;
                }
              }
            }

            &:not(.n-space--vertical) {
              justify-content: center;

              .n-space-item {
                flex: 1;

                .n-button {
                  width: 100%;
                }
              }
            }
          }
        }
      }

      h1 {
        margin: 0;
      }
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .last-update {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
  }

  .adapter-modal {
    .n-form-item {
      margin-bottom: 18px;
      .n-form-item-blank {
        flex: 1;
      }
    }
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .server-list {
    .head {
      margin-bottom: 16px;

      .head-text {
        h1 {
          font-size: 20px;
        }

        p {
          font-size: 13px;
        }

        .last-update {
          font-size: 11px;
        }
      }
    }
  }

  /* 模态框内容优化 */
  :deep(.n-modal) {
    .n-card {
      margin: 16px;

      .n-form {
        .n-form-item {
          margin-bottom: 16px;
        }
      }
    }
  }
}

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .server-list {
    .head {
      .head-text {
        .action-section {
          :deep(.n-space-item) {
            .n-button {
              min-height: 36px;
              font-size: 13px;
            }
          }
        }
      }
    }
  }

  /* 网格间距优化 */
  :deep(.n-grid) {
    --n-gap: 12px;
  }
}
</style>
