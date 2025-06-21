<script setup lang="ts">
import { AddCircleOutline, RefreshOutline } from '@vicons/ionicons5';
import { v4 as uuidv4 } from 'uuid';
import ServerCard from '~/components/Card/ServerCard.vue';
import type { ServerWithStatus } from '~/server/shared/types/server/api';
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
const { serverApi } = useApi();

interface FormData {
  servername: string;
  token: string;
}

const showModal = ref(false);
const submitting = ref(false);
const formRef = ref<HTMLFormElement | null>(null);
const message = useMessage();

const formData = ref<FormData>({
  servername: '',
  token: ''
});

const rules = {
  servername: [
    { required: true, message: '请输入服务器名字', trigger: 'blur' },
    { min: 2, max: 24, message: '长度在 3 到 12 个字符', trigger: 'blur' }
  ],
  token: [
    { required: true, message: '请输入邮箱', trigger: 'blur' },
    { message: '邮箱格式不正确', trigger: 'blur' }
  ]
};

watch(showModal, (newVal) => {
  if (newVal) {
    formData.value = {
      servername: '',
      token: ''
    };
    setTimeout(() => formRef.value?.restoreValidation(), 0);
  }
});

const handleSubmit = (e: Event) => {
  e.preventDefault();
  submitting.value = true;
  useRequest(
    serverApi.addServer({
      name: formData.value.servername,
      token: formData.value.token
    })
  )
    .onSuccess(({ data }) => {
      if (data.success) {
        message.success(data.message);
        handleClose();
        getServerList();
      } else {
        message.error(data.message || '添加服务器失败');
      }
    })
    .onError(() => {
      message.error('添加服务器失败');
    })
    .onComplete(() => {
      submitting.value = false;
    });
};

const handleClose = () => {
  showModal.value = false;
};
const generateToken = () => {
  formData.value.token = uuidv4();
  message.info('已生成随机Token');
};

const refreshing = ref(false);
const handleRefresh = () => {
  refreshing.value = true;
  useRequest(serverApi.getServerList())
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

const serverList = ref<ServerWithStatus[]>([]);
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const lastUpdateTime = ref<string>('');

function getServerList() {
  useRequest(serverApi.getServerList())
    .onSuccess(({ data }) => {
      if (data.success && data.data) {
        serverList.value = data.data as ServerWithStatus[];
        lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
        console.log('服务器列表:', data.data);
      } else {
        message.error(data.message || '获取服务器列表失败');
      }
    })
    .onError(() => {
      message.error('获取服务器列表失败');
    });
}

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
</script>

<template>
  <div class="page-container">
    <transition name="content-transition" appear>
      <div class="server-list">
        <div class="head">
          <div class="head-text" :class="{ 'mobile-layout': isMobile }">
            <div class="title-section">
              <n-text strong>
                <h1>服务器列表</h1>
                <p>管理您的服务器，点击进入详细配置。</p>
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
                    <n-icon>
                      <RefreshOutline />
                    </n-icon>
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
                    <n-icon>
                      <AddCircleOutline />
                    </n-icon>
                  </template>
                  添加服务器
                </n-button>
              </n-space>
            </div>
          </div>
        </div>
        <n-empty v-if="!serverList.length" description="您还没有任何服务器">
          <template #extra>
            <n-button type="primary" :size="isMobile ? 'medium' : 'small'" :block="isMobile" @click="showModal = true">
              <template #icon>
                <n-icon>
                  <AddCircleOutline />
                </n-icon>
              </template>
              创建新服务器
            </n-button>
          </template>
        </n-empty>
        <n-modal
          v-model:show="showModal"
          title="新建服务器"
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
            :rules="rules"
            :label-placement="isMobile ? 'top' : 'left'"
            :label-width="isMobile ? undefined : 'auto'"
          >
            <n-form-item label="服务器名字" path="servername">
              <n-input
                v-model:value="formData.servername"
                placeholder="请输入你服务器绚丽の名字"
                :size="isMobile ? 'medium' : 'large'"
              />
            </n-form-item>

            <n-form-item label="Token" path="token">
              <n-tooltip trigger="focus" show-arrow>
                <template #trigger>
                  <n-input
                    v-model:value="formData.token"
                    placeholder="请输入服务器の秘密 Token"
                    :size="isMobile ? 'medium' : 'large'"
                  >
                    <template #suffix>
                      <n-button :size="isMobile ? 'tiny' : 'small'" @click="generateToken">
                        {{ isMobile ? '生成' : '随机生成' }}
                      </n-button>
                    </template>
                  </n-input>
                </template>
                这是用于区分不同服务器的密钥，用来识别和验证服务器身份。
                <br />
                请妥善保管，不要泄露给他人。
                <br />
                <n-text delete size="small"> 泄漏服务器就等着艾草吧（逃 </n-text>
              </n-tooltip>
            </n-form-item>
          </n-form>

          <template #action>
            <n-space justify="end" :vertical="isMobile" :size="isMobile ? 'small' : 'medium'">
              <n-button :size="isMobile ? 'medium' : 'large'" :block="isMobile" @click="handleClose"> 取消 </n-button>
              <n-button
                type="primary"
                :loading="submitting"
                :disabled="submitting"
                :size="isMobile ? 'medium' : 'large'"
                :block="isMobile"
                @click="handleSubmit"
              >
                提交
              </n-button>
            </n-space>
          </template>
        </n-modal>
        <n-grid :cols="isMobile ? 1 : '600:2 1100:3'" x-gap="16" y-gap="16">
          <n-gi
            v-for="(server, index) in serverList || []"
            :key="serverList.indexOf(server)"
            :class="{ 'server-offline': !server.isOnline }"
          >
            <transition name="card-appear" appear :css="false" @enter="onCardEnter" @before-enter="onBeforeCardEnter">
              <ServerCard :server="server" :data-index="index" />
            </transition>
          </n-gi>
        </n-grid>
      </div>
    </transition>
  </div>
</template>

<style lang="less" scoped>
.server-list {
  .head {
    margin-bottom: 24px;

    .head-text {
      display: flex;
      flex-direction: row;
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
}

.server-offline {
  transition: all 0.3s ease;
  opacity: 0.85;

  &:hover {
    opacity: 0.95;
  }

  /* 添加次级弱化效果 */
  position: relative;

  &::after {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    pointer-events: none;
    background: var(--body-color, rgba(0, 0, 0, 0.03));
    border-radius: 8px;
    z-index: 1;
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
    gap: 12px;
  }
}
</style>
