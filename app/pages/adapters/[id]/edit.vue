<template>
  <div class="adapter-edit-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-top">
        <n-button text type="primary" class="back-button" @click="goBack">
          <template #icon>
            <n-icon><ArrowBack /></n-icon>
          </template>
          返回适配器列表
        </n-button>
      </div>

      <div class="header-content">
        <div class="header-info">
          <h1 class="page-title">{{ isEdit ? '编辑' : '创建' }} Bot 实例</h1>
          <p v-if="isEdit && adapter" class="page-subtitle">
            {{ getAdapterTypeLabel(adapter.type) }} · ID: {{ adapter.id }}
          </p>
        </div>

        <div v-if="isEdit && adapter" class="header-status">
          <n-tag :type="adapter.connected ? 'success' : 'error'" size="large" round>
            {{ adapter.connected ? '已连接' : '未连接' }}
          </n-tag>
        </div>
      </div>
    </div>

    <!-- 主内容区域 -->
    <div class="main-content">
      <n-card class="form-card">
        <n-form
          ref="formRef"
          :model="formData"
          :rules="currentRules"
          :label-placement="isMobile ? 'top' : 'left'"
          :label-width="isMobile ? 'auto' : '140px'"
          require-mark-placement="right-hanging"
          size="medium"
        >
          <!-- 基础配置 -->
          <div class="form-section">
            <div class="section-header">
              <n-text class="section-title">基础配置</n-text>
            </div>

            <n-form-item label="适配器类型" path="adapter_type">
              <n-select
                v-model:value="formData.adapter_type"
                :options="adapterOptions"
                placeholder="请选择适配器类型"
                :disabled="isEdit"
                @update:value="onAdapterTypeChange"
              />
            </n-form-item>
          </div>

          <!-- OneBot 配置 -->
          <template v-if="formData.adapter_type === 'onebot'">
            <!-- 机器人配置 -->
            <div class="form-section">
              <div class="section-header">
                <n-text class="section-title">机器人配置</n-text>
                <n-text depth="3" class="section-desc">配置机器人的基本信息和连接参数</n-text>
              </div>

              <!-- 正向连接说明 -->
              <n-alert
                v-if="formData.config.onebot?.connectionType === 'forward'"
                type="info"
                title="正向连接说明"
                class="forward-info"
                :show-icon="!isMobile"
              >
                正向连接模式下，服务器将主动连接到机器人客户端。
              </n-alert>

              <div class="form-grid">
                <n-form-item label="主机地址" path="config.onebot.host">
                  <n-input v-model:value="formData.config.onebot!.host" placeholder="127.0.0.1" />
                </n-form-item>

                <n-form-item label="端口" path="config.onebot.port">
                  <n-input-number
                    v-model:value="formData.config.onebot!.port"
                    placeholder="8080"
                    :min="1"
                    :max="65535"
                    style="width: 100%"
                  />
                </n-form-item>
              </div>

              <n-form-item label="访问令牌" path="config.onebot.accessToken">
                <n-input
                  v-model:value="formData.config.onebot!.accessToken"
                  :type="showToken ? 'text' : 'password'"
                  placeholder="可选，用于验证连接安全性"
                  clearable
                >
                  <template #suffix>
                    <n-icon
                      :component="showToken ? EyeOutline : EyeOff"
                      style="cursor: pointer"
                      @click="showToken = !showToken"
                    />
                  </template>
                </n-input>
              </n-form-item>

              <n-form-item label="启用适配器" path="config.onebot.enabled">
                <n-switch v-model:value="formData.config.onebot!.enabled" />
              </n-form-item>
            </div>

            <!-- 连接配置 -->
            <div class="form-section">
              <div class="section-header">
                <n-text class="section-title">连接配置</n-text>
                <n-text depth="3" class="section-desc">配置机器人与服务器的连接方式</n-text>
              </div>

              <n-form-item label="连接类型" path="config.onebot.connectionType">
                <n-select
                  v-model:value="formData.config.onebot!.connectionType"
                  :options="connectionTypeOptions"
                  @update:value="onConnectionTypeChange"
                />
              </n-form-item>

              <!-- 连接方式说明和配置 -->
              <template v-if="formData.config.onebot?.connectionType === 'reverse'">
                <n-alert type="info" title="反向连接配置" class="connection-info" :show-icon="!isMobile">
                  <div class="info-content">
                    <p class="info-description">机器人客户端将主动连接到此服务器。</p>
                    <p class="info-instruction" :class="{ 'mobile-instruction': isMobile }">
                      请在机器人配置中设置以下 WebSocket 地址：
                    </p>
                    <div class="url-display" :class="{ 'mobile-url-display': isMobile }">
                      <n-text code class="url-text" :class="{ 'mobile-url-text': isMobile }">
                        {{ reverseWsUrl }}
                      </n-text>
                      <n-button
                        text
                        type="primary"
                        :size="isMobile ? 'medium' : 'small'"
                        class="copy-btn"
                        :class="{ 'mobile-copy-btn': isMobile }"
                        @click="copyToClipboard(reverseWsUrl)"
                      >
                        {{ isMobile ? '复制' : '复制地址' }}
                      </n-button>
                    </div>
                  </div>
                </n-alert>
              </template>

              <template v-if="formData.config.onebot?.connectionType === 'forward'">
                <!-- 正向连接在新架构中通过host:port配置，无需单独的forwardUrl字段 -->

                <n-form-item label="自动重连" path="config.onebot.autoReconnect">
                  <n-switch v-model:value="formData.config.onebot!.autoReconnect" />
                  <template #feedback>启用后，连接断开时会自动尝试重新连接</template>
                </n-form-item>

                <!-- 连接测试 -->
                <n-form-item v-if="isEdit && adapter" label="连接测试">
                  <div class="connection-test">
                    <n-space>
                      <n-button
                        v-if="!forwardConnectionStatus.connected"
                        type="primary"
                        :loading="testConnecting"
                        :disabled="!formData.config.onebot?.host || !formData.config.onebot?.port"
                        @click="testForwardConnection"
                      >
                        测试连接
                      </n-button>

                      <n-button v-else type="warning" :loading="testDisconnecting" @click="disconnectForward">
                        断开连接
                      </n-button>

                      <n-button secondary @click="refreshConnectionStatus"> 刷新状态 </n-button>
                    </n-space>

                    <div class="connection-status">
                      <n-tag :type="forwardConnectionStatus.connected ? 'success' : 'error'" size="small">
                        {{ forwardConnectionStatus.connected ? '正向连接已建立' : '正向连接未建立' }}
                      </n-tag>
                    </div>
                  </div>
                </n-form-item>
              </template>
            </div>
          </template>

          <!-- 操作按钮 -->
          <div class="form-actions">
            <n-space justify="center" size="large">
              <n-button type="primary" size="large" :loading="submitting" :disabled="!canSubmit" @click="handleSubmit">
                {{ isEdit ? '保存更改' : '创建适配器' }}
              </n-button>

              <n-button size="large" @click="goBack"> 取消 </n-button>

              <n-button v-if="isEdit" type="error" size="large" :loading="deleting" @click="handleDelete">
                删除适配器
              </n-button>
            </n-space>
          </div>
        </n-form>
      </n-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useMessage, useDialog } from 'naive-ui';
import { useRequest } from 'alova/client';
import { ArrowBack, EyeOutline, EyeOff } from '@vicons/ionicons5';
import type { AdapterUnionType, OnebotAdapterUnion } from '~/server/shared/types/adapters/adapter';
import type { AdapterFormData, AdapterPayload } from '~/utils/adapters/forms';
import { definePageMeta } from '#imports';

definePageMeta({
  title: '编辑 Bot 实例'
});

const route = useRoute();
const router = useRouter();
const message = useMessage();
const dialog = useDialog();
const { adapterApi } = useApi();

// 响应式检测
const isMobile = ref(false);

const updateIsMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

onMounted(() => {
  updateIsMobile();
  window.addEventListener('resize', updateIsMobile);
});

// 在组件卸载时清理事件监听器
onUnmounted(() => {
  window.removeEventListener('resize', updateIsMobile);
});

// 页面状态
const isEdit = computed(() => !!route.params.id);
const adapterId = computed(() => (route.params.id ? parseInt(route.params.id as string) : null));
const adapter = ref<AdapterUnionType | null>(null);

// 表单状态
const formRef = ref();
const submitting = ref(false);
const deleting = ref(false);
const showToken = ref(false);

// 正向连接测试状态
const testConnecting = ref(false);
const testDisconnecting = ref(false);
const forwardConnectionStatus = ref({
  connected: false,
  readyState: null as number | null
});

// 默认配置
const defaultOneBotConfig = {
  host: '127.0.0.1',
  port: 8080,
  accessToken: '',
  enabled: true,
  connectionType: 'reverse' as 'reverse' | 'forward',
  autoReconnect: true
};

// 表单数据
const formData = ref<AdapterFormData>({
  adapter_type: 'onebot',
  config: {
    onebot: { ...defaultOneBotConfig }
  }
});

// 适配器类型选项
const adapterOptions = [{ label: 'OneBot V11', value: 'onebot' }];

// 连接类型选项
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

const canSubmit = computed(() => {
  if (formData.value.adapter_type === 'onebot') {
    const config = formData.value.config.onebot;
    if (!config) return false;

    return config.host && config.port && config.connectionType;
  }
  return false;
});

const currentRules = computed(() => {
  const baseRules = {
    adapter_type: { required: true, message: '请选择适配器类型', trigger: ['blur'] }
  };

  if (formData.value.adapter_type === 'onebot' && formData.value.config.onebot) {
    return {
      ...baseRules,
      'config.onebot.host': { required: true, message: '请填写主机地址', trigger: ['blur'] },
      'config.onebot.port': { required: true, message: '请填写端口', trigger: ['blur'] }
    };
  }
  return baseRules;
});

// 方法
function goBack() {
  router.push('/adapters');
}

function getAdapterTypeLabel(type: string) {
  const option = adapterOptions.find((opt) => opt.value === type);
  return option?.label || type;
}

function onAdapterTypeChange(type: string) {
  if (type === 'onebot') {
    formData.value.config.onebot = { ...defaultOneBotConfig };
  }
}

function onConnectionTypeChange(type: 'reverse' | 'forward') {
  // 正向连接模式下，确保host和port有默认值
  if (type === 'forward' && formData.value.config.onebot) {
    if (!formData.value.config.onebot.host) {
      formData.value.config.onebot.host = '127.0.0.1';
    }
    if (!formData.value.config.onebot.port) {
      formData.value.config.onebot.port = 5700;
    }
  }
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('地址已复制到剪贴板');
  } catch {
    message.error('复制失败');
  }
}

async function loadAdapter() {
  if (!adapterId.value) return;

  try {
    useRequest(adapterApi.getAdapter(adapterId.value))
      .onSuccess(({ data }) => {
        if (data.success && data.data) {
          adapter.value = data.data;

          // 填充表单数据
          if (data.data.type === 'onebot') {
            const onebotAdapter = data.data as OnebotAdapterUnion;
            if (onebotAdapter.detail) {
              formData.value = {
                adapter_type: 'onebot',
                config: {
                  onebot: {
                    host: onebotAdapter.detail.host || '127.0.0.1',
                    port: onebotAdapter.detail.port || 8080,
                    accessToken: onebotAdapter.detail.accessToken || '',
                    enabled: onebotAdapter.detail.enabled ?? true,
                    connectionType: onebotAdapter.detail.connectionType || 'reverse',
                    autoReconnect: onebotAdapter.detail.autoReconnect ?? true
                  }
                }
              };

              // 如果是正向连接，刷新连接状态
              if (onebotAdapter.detail?.connectionType === 'forward') {
                refreshConnectionStatus();
              }
            }
          }
        } else {
          message.error('加载适配器失败');
          goBack();
        }
      })
      .onError(() => {
        message.error('加载适配器失败');
        goBack();
      });
  } catch {
    message.error('加载适配器失败');
    goBack();
  }
}

async function handleSubmit() {
  submitting.value = true;

  try {
    const valid = await formRef.value?.validate();
    if (!valid) return;

    const { adapter_type, config } = formData.value;

    if (adapter_type === 'onebot') {
      const onebotConfig = config.onebot;
      if (!onebotConfig) return;

      // 验证必填字段
      if (!onebotConfig.host || !onebotConfig.port) {
        message.error('请填写完整的主机地址和端口');
        return;
      }
    }

    if (isEdit.value) {
      // 更新使用 AdapterPayload
      const updatePayload: AdapterPayload = {
        adapter_type,
        config: config.onebot
      };

      useRequest(adapterApi.updateAdapter(adapterId.value!, updatePayload))
        .onSuccess(({ data }) => {
          if (data.success) {
            message.success('更新成功');
            goBack();
          } else {
            message.error(data.message || '更新失败');
          }
        })
        .onError(() => {
          message.error('更新失败');
        })
        .onComplete(() => {
          submitting.value = false;
        });
    } else {
      // 创建时需要展开结构以匹配后端期望
      const onebotConfig = config.onebot;
      if (!onebotConfig) return;

      const createPayload: AdapterFormData = {
        adapter_type,
        config: {
          onebot: {
            host: onebotConfig.host,
            port: onebotConfig.port,
            accessToken: onebotConfig.accessToken,
            enabled: onebotConfig.enabled,
            connectionType: onebotConfig.connectionType,
            autoReconnect: onebotConfig.autoReconnect
          }
        }
      };

      useRequest(adapterApi.addAdapter(createPayload))
        .onSuccess(({ data }) => {
          if (data.success) {
            message.success('创建成功');
            goBack();
          } else {
            message.error(data.message || '创建失败');
          }
        })
        .onError(() => {
          message.error('创建失败');
        })
        .onComplete(() => {
          submitting.value = false;
        });
    }
  } catch {
    message.error('操作失败');
    submitting.value = false;
  }
}

async function handleDelete() {
  if (!adapterId.value) return;

  dialog.warning({
    title: '确认删除',
    content: '确定要删除这个适配器吗？此操作无法撤销。',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      deleting.value = true;

      useRequest(adapterApi.deleteAdapter(adapterId.value!))
        .onSuccess(({ data }) => {
          if (data && data.success) {
            message.success('删除成功');
            goBack();
          } else {
            message.error(data?.message || '删除失败');
          }
        })
        .onError(() => {
          message.error('删除失败');
        })
        .onComplete(() => {
          deleting.value = false;
        });
    }
  });
}

// 正向连接测试方法
async function testForwardConnection() {
  if (!adapterId.value || !formData.value.config.onebot?.host || !formData.value.config.onebot?.port) return;

  testConnecting.value = true;

  try {
    const { data } = await $fetch(`/api/adapters/${adapterId.value}/forward`, {
      method: 'POST',
      body: {
        url: `ws://${formData.value.config.onebot.host}:${formData.value.config.onebot.port}`,
        accessToken: formData.value.config.onebot.accessToken || undefined,
        autoReconnect: formData.value.config.onebot.autoReconnect
      }
    });

      const response = data
    
    if (response.success) {
      message.success('连接建立成功');
      await refreshConnectionStatus();
    } else {
      message.error(response.message || '连接失败');
    }
  } catch {
    message.error('连接失败');
  } finally {
    testConnecting.value = false;
  }
}

async function disconnectForward() {
  if (!adapterId.value) return;

  testDisconnecting.value = true;

  try {
    const { data } = await $fetch(`/api/adapters/${adapterId.value}/forward`, {
      method: 'DELETE'
    });

    const response = data as unknown as { success: boolean; message: string };

    if (response.success) {
      message.success('连接已断开');
      forwardConnectionStatus.value.connected = false;
      forwardConnectionStatus.value.readyState = null;
    } else {
      message.error(response.message || '断开失败');
    }
  } catch {
    message.error('断开失败');
  } finally {
    testDisconnecting.value = false;
  }
}

async function refreshConnectionStatus() {
  if (!adapterId.value) return;

  try {
    const { data } = await $fetch(`/api/adapters/${adapterId.value}/forward`);

    const response = data as unknown as {
      success: boolean;
      data: { connected: boolean; readyState: number | null };
    };

    if (response.success) {
      forwardConnectionStatus.value.connected = response.data.connected;
      forwardConnectionStatus.value.readyState = response.data.readyState;
    }
  } catch (error) {
    console.error('获取连接状态失败:', error);
  }
}

// 生命周期
onMounted(() => {
  if (isEdit.value) {
    loadAdapter();
  }
});
</script>

<style scoped>
.adapter-edit-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 24px;
  min-height: 100vh;
}

/* 页面头部 */
.page-header {
  margin-bottom: 32px;
}

.header-top {
  margin-bottom: 16px;
}

.back-button {
  font-size: 14px;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 24px;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 600;
  line-height: 1.2;
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  opacity: 0.7;
  font-weight: 400;
}

.header-status {
  flex-shrink: 0;
}

/* 主内容区域 */
.main-content {
  max-width: 100%;
}

.form-card {
  border-radius: 12px;
}

/* 表单样式 */
.form-section {
  margin-bottom: 32px;
}

.form-section:last-child {
  margin-bottom: 0;
}

.section-header {
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--n-border-color);
}

.section-title {
  display: block;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 4px;
}

.section-desc {
  display: block;
  font-size: 13px;
  opacity: 0.7;
  line-height: 1.4;
}

.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

/* 连接信息样式 */
.connection-info,
.forward-info {
  margin: 16px 0;
  border-radius: 8px;
}

.info-content {
  .info-description {
    margin: 0 0 8px 0;
    line-height: 1.5;
    font-size: 14px;
  }

  .info-instruction {
    margin: 0 0 12px 0;
    line-height: 1.5;
    font-size: 14px;
    font-weight: 500;
  }
}

.url-display {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  background: var(--n-color);
  border-radius: 6px;
  margin-top: 8px;
}

.url-text {
  flex: 1;
  font-family: monospace;
  font-size: 13px;
  word-break: break-all;
}

.copy-btn {
  flex-shrink: 0;
}

/* 连接测试样式 */
.connection-test {
  width: 100%;
}

.connection-status {
  margin-top: 12px;
}

/* 操作按钮 */
.form-actions {
  margin-top: 40px;
  padding-top: 24px;
  border-top: 1px solid var(--n-border-color);
}

/* 移动端适配 */
@media (max-width: 768px) {
  .adapter-edit-page {
    padding: 16px;
  }

  .page-header {
    margin-bottom: 24px;
  }

  .page-title {
    font-size: 24px;
  }

  .header-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }

  .header-status {
    align-self: stretch;
  }

  /* 表单网格在移动端变为单列 */
  .form-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .form-section {
    margin-bottom: 24px;
  }

  .section-header {
    margin-bottom: 16px;
    padding-bottom: 8px;
  }

  .section-title {
    font-size: 15px;
  }

  .section-desc {
    font-size: 12px;
  }

  /* URL 显示区域移动端优化 */
  .url-display {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .url-text {
    text-align: center;
  }

  .copy-btn {
    align-self: center;
  }

  /* 连接测试区域移动端优化 */
  .connection-test {
    :deep(.n-space) {
      flex-direction: column;
      align-items: stretch;
    }

    :deep(.n-button) {
      width: 100%;
      justify-content: center;
    }
  }

  /* 操作按钮移动端优化 */
  .form-actions {
    margin-top: 32px;
    padding-top: 20px;

    :deep(.n-space) {
      flex-direction: column;
      align-items: stretch;
    }

    :deep(.n-button) {
      width: 100%;
      justify-content: center;
      height: 44px;
    }
  }
}

/* 小屏手机适配 */
@media (max-width: 480px) {
  .adapter-edit-page {
    padding: 12px;
  }

  .page-title {
    font-size: 22px;
    line-height: 1.3;
  }

  .page-subtitle {
    font-size: 13px;
  }

  .form-section {
    margin-bottom: 20px;
  }

  .section-title {
    font-size: 14px;
  }

  .section-desc {
    font-size: 11px;
  }

  .form-grid {
    gap: 12px;
  }

  .url-display {
    padding: 8px;
    gap: 6px;
  }

  .url-text {
    font-size: 12px;
  }

  .form-actions {
    margin-top: 24px;
    padding-top: 16px;
  }
}
</style>
