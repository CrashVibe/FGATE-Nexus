<template>
  <ServerPageWrapper>
    <ServerPageHeader title="账号绑定" :server-name="serverName" />

    <!-- 未保存提示条（仿 GeneralConfig.vue） -->
    <Transition name="alert-slide" mode="out-in">
      <n-alert v-if="isDirty" type="warning" class="unsaved-alert" closable show-icon>
        <template #icon>
          <n-icon>
            <HelpCircleOutline />
          </n-icon>
        </template>
        <div class="unsaved-content">
          <div class="unsaved-text">您有未保存的更改</div>
          <n-space size="small">
            <n-button size="small" type="primary" :loading="loading" @click="saveBinding"> 保存更改 </n-button>
            <n-button size="small" quaternary @click="discardChanges"> 放弃更改 </n-button>
          </n-space>
        </div>
      </n-alert>
    </Transition>

    <div class="binding-config">
      <n-grid :cols="isMobile ? 1 : 2" :x-gap="20" :y-gap="20" responsive="screen" item-responsive class="dense-grid">
        <!-- 基础设置卡片 -->
        <n-gi>
          <n-card title="基础设置" size="small" class="config-card">
            <template #header-extra>
              <n-tag size="small" type="primary" round>必填信息</n-tag>
            </template>
            <n-form
              v-if="form"
              :model="form"
              :rules="bindingFormRules"
              label-placement="top"
              :label-width="isMobile ? undefined : '120px'"
            >
              <n-form-item label="绑定数量" path="maxBindCount">
                <n-input-number
                  v-model:value="form.maxBindCount"
                  :min="BINDING_CONSTRAINTS.maxBindCount.min"
                  :max="BINDING_CONSTRAINTS.maxBindCount.max"
                  class="number-input"
                  :placeholder="`每个社交账号最多可绑定的游戏账号数量，范围${BINDING_CONSTRAINTS.maxBindCount.min}-${BINDING_CONSTRAINTS.maxBindCount.max}`"
                />
              </n-form-item>
              <n-form-item label="验证码长度" path="codeLength">
                <n-input-number
                  v-model:value="form.codeLength"
                  :min="BINDING_CONSTRAINTS.codeLength.min"
                  :max="BINDING_CONSTRAINTS.codeLength.max"
                  class="number-input"
                  :placeholder="`生成的验证码字符数量，影响验证码复杂度，${BINDING_CONSTRAINTS.codeLength.min}-${BINDING_CONSTRAINTS.codeLength.max}位`"
                  @update:value="previewCode"
                />
              </n-form-item>
              <n-form-item label="有效时间" path="codeExpire">
                <n-input-number
                  v-model:value="form.codeExpire"
                  :min="BINDING_CONSTRAINTS.codeExpire.min"
                  :max="BINDING_CONSTRAINTS.codeExpire.max"
                  class="number-input"
                  :placeholder="`验证码有效时间，超时需重新生成，${BINDING_CONSTRAINTS.codeExpire.min}-${BINDING_CONSTRAINTS.codeExpire.max}分钟`"
                >
                  <template #suffix>分钟</template>
                </n-input-number>
              </n-form-item>
              <n-form-item label="生成模式" path="codeMode">
                <n-input-group style="flex: 1">
                  <n-select
                    v-model:value="form.codeMode"
                    :options="CODE_MODE_OPTIONS"
                    style="flex: 1"
                    placeholder="选择验证码字符组成方式"
                    @update:value="previewCode"
                  />
                  <n-tooltip trigger="click" placement="top">
                    <template #trigger>
                      <n-button style="border-radius: 0 6px 6px 0" class="preview-button" @click.stop="previewCode"
                        >预览</n-button
                      >
                    </template>
                    <span style="font-size: 15px; letter-spacing: 2px">{{ previewedCode }}</span>
                  </n-tooltip>
                </n-input-group>
              </n-form-item>
              <n-form-item label="绑定前缀" path="prefix">
                <n-input
                  v-model:value="form.prefix"
                  :placeholder="`如：/绑定 ，用于绑定账号的指令前缀，最多${BINDING_CONSTRAINTS.prefix.maxLength}字符`"
                  :maxlength="BINDING_CONSTRAINTS.prefix.maxLength"
                  show-count
                  @update:value="validatePrefixes"
                />
              </n-form-item>
              <n-form-item label="解绑前缀" path="unbindPrefix">
                <n-input
                  v-model:value="form.unbindPrefix"
                  :placeholder="`如：/解绑 ，用于解绑账号的专用指令前缀，留空则用绑定前缀+玩家名，最多${BINDING_CONSTRAINTS.unbindPrefix.maxLength}字符`"
                  :maxlength="BINDING_CONSTRAINTS.unbindPrefix.maxLength"
                  show-count
                  @update:value="validatePrefixes"
                />
              </n-form-item>
              <n-form-item label="允许解绑">
                <div class="switch-wrapper">
                  <n-switch v-model:value="form.allowUnbind" />
                </div>
              </n-form-item>
              <n-alert v-if="prefixValidationError" type="error" size="small" style="margin-top: 8px">
                {{ prefixValidationError }}
              </n-alert>
            </n-form>
          </n-card>
          <n-card title="高级设置" size="small" class="config-card">
            <template #header-extra>
              <n-tag size="small" type="warning" round>可选</n-tag>
            </template>
            <n-form
              v-if="form"
              :model="form"
              :rules="bindingFormRules"
              label-placement="top"
              :label-width="isMobile ? undefined : '120px'"
            >
              <n-form-item label="强制绑定">
                <div class="switch-wrapper">
                  <n-switch v-model:value="form.forceBind" />
                </div>
              </n-form-item>
              <n-form-item label="未绑定踢出消息" path="kickMsg">
                <n-input
                  v-model:value="form.kickMsg"
                  type="textarea"
                  :rows="3"
                  :maxlength="BINDING_CONSTRAINTS.kickMsg.maxLength"
                  show-count
                  placeholder="当玩家未绑定社交账号时显示的踢出消息，支持颜色代码"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('kickMsg', '#name')">#name</n-tag>
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('kickMsg', '#cmd_prefix')"
                        >#cmd_prefix</n-tag
                      >
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('kickMsg', '#code')">#code</n-tag>
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('kickMsg', '#time')">#time</n-tag>
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="warning" size="small">{{ kickMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
              <n-form-item label="解绑踢出消息" path="unbindKickMsg">
                <n-input
                  v-model:value="form.unbindKickMsg"
                  type="textarea"
                  :rows="2"
                  :maxlength="BINDING_CONSTRAINTS.unbindKickMsg.maxLength"
                  show-count
                  placeholder="当玩家的社交账号被解绑时显示的踢出消息"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('unbindKickMsg', '#social_account')"
                        >#social_account</n-tag
                      >
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="warning" size="small">{{ unbindKickMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
            </n-form>
          </n-card>
        </n-gi>

        <!-- 反馈消息卡片 -->
        <n-gi>
          <n-card title="反馈消息配置" size="small" class="config-card">
            <n-form
              v-if="form"
              :model="form"
              :rules="bindingFormRules"
              label-placement="top"
              :label-width="isMobile ? undefined : '120px'"
            >
              <n-form-item label="绑定成功" path="bindSuccessMsg">
                <n-input
                  v-model:value="form.bindSuccessMsg"
                  :maxlength="BINDING_CONSTRAINTS.bindSuccessMsg.maxLength"
                  show-count
                  placeholder="绑定成功时的反馈消息，支持#user占位符"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('bindSuccessMsg', '#user')"
                        >#user</n-tag
                      >
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="success" size="small">{{ bindSuccessMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
              <n-form-item label="绑定失败" path="bindFailMsg">
                <n-input
                  v-model:value="form.bindFailMsg"
                  :maxlength="BINDING_CONSTRAINTS.bindFailMsg.maxLength"
                  show-count
                  placeholder="绑定失败时的反馈消息"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('bindFailMsg', '#user')">#user</n-tag>
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('bindFailMsg', '#why')">#why</n-tag>
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="error" size="small">{{ bindFailMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
              <n-form-item label="解绑成功" path="unbindSuccessMsg">
                <n-input
                  v-model:value="form.unbindSuccessMsg"
                  :maxlength="BINDING_CONSTRAINTS.unbindSuccessMsg.maxLength"
                  show-count
                  placeholder="解绑成功时的反馈消息，支持#user占位符"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('unbindSuccessMsg', '#user')"
                        >#user</n-tag
                      >
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="success" size="small">{{ unbindSuccessMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
              <n-form-item label="解绑失败" path="unbindFailMsg">
                <n-input
                  v-model:value="form.unbindFailMsg"
                  :maxlength="BINDING_CONSTRAINTS.unbindFailMsg.maxLength"
                  show-count
                  placeholder="解绑失败时的反馈消息"
                />
                <template #feedback>
                  <div class="template-help">
                    <n-space size="small" class="placeholder-tags">
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('unbindFailMsg', '#user')"
                        >#user</n-tag
                      >
                      <n-tag size="tiny" type="default" @click="insertPlaceholder('unbindFailMsg', '#why')">#why</n-tag>
                    </n-space>
                    <div class="template-preview-inline">
                      <n-text depth="3" size="small">预览: </n-text>
                      <n-text type="error" size="small">{{ unbindFailMsgPreview }}</n-text>
                    </div>
                  </div>
                </template>
              </n-form-item>
            </n-form>
          </n-card>

          <n-card title="指令与反馈示例" size="small" class="config-card">
            <div class="examples-section">
              <div class="examples-header">
                <span>指令示例预览</span>
                <n-icon size="18" class="examples-icon">
                  <SearchOutline />
                </n-icon>
              </div>
              <div class="examples-grid">
                <div class="example-item">
                  <div class="example-label">
                    <n-tag type="primary" size="small" round>绑定指令</n-tag>
                  </div>
                  <div class="command-demo">
                    <n-code :code="bindCommandExample" language="text" class="command-code" />
                  </div>
                  <div class="example-desc center-desc">
                    <n-text depth="3" size="small" class="desc-with-tooltip"> 群聊绑定指令 </n-text>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-icon size="12">
                          <HelpCircleOutline />
                        </n-icon>
                      </template>
                      用户在QQ群或其他社交平台聊天中发送此指令来绑定游戏账号
                    </n-tooltip>
                  </div>
                </div>
                <Transition name="example-slide" mode="out-in">
                  <div v-if="form && form.allowUnbind" key="unbind-example" class="example-item">
                    <div class="example-label">
                      <n-tag type="warning" size="small" round>解绑指令</n-tag>
                    </div>
                    <div class="command-demo">
                      <n-code :code="unbindCommandExample" language="text" class="command-code" />
                    </div>
                    <div class="example-desc">
                      <n-text depth="3" size="small" class="desc-with-tooltip"> 群聊解绑指令 </n-text>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <n-icon size="12">
                            <HelpCircleOutline />
                          </n-icon>
                        </template>
                        <div v-if="form && form.unbindPrefix && form.unbindPrefix.trim()">
                          使用专用解绑前缀进行解绑操作，直接输入玩家名称即可
                        </div>
                        <div v-else>使用绑定前缀+玩家名称的方式进行解绑操作</div>
                      </n-tooltip>
                    </div>
                  </div>
                </Transition>
                <div class="example-item response-example">
                  <div class="example-label">
                    <n-tag type="success" size="small" round>成功反馈</n-tag>
                  </div>
                  <div class="response-demo">
                    <n-alert type="success" size="small" class="response-alert">
                      <template #icon>
                        <n-icon>
                          <CheckmarkCircleOutline />
                        </n-icon>
                      </template>
                      {{ successMessageExample }}
                    </n-alert>
                  </div>
                </div>
              </div>
            </div>
          </n-card>
        </n-gi>

        <!-- 保存按钮区域 - 跨列显示 -->
        <n-gi :span="isMobile ? 1 : 2">
          <n-divider />
          <div class="save-section">
            <n-button
              type="primary"
              size="large"
              class="save-button"
              :loading="loading"
              :block="isMobile"
              :disabled="!canSaveConfig"
              @click="saveBinding"
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
              {{ loading ? '保存中...' : '保存配置' }}
            </n-button>
          </div>
        </n-gi>
      </n-grid>
    </div>
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, onUnmounted } from 'vue';
import { HelpCircleOutline, SearchOutline, CheckmarkCircleOutline } from '@vicons/ionicons5';
import { useBreakpoint, useMemo } from 'vooks';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/app/composables/useServerData';
import { useBindingConfig } from '~/app/composables/useBindingConfig';
import { useAdapterStatus } from '~/app/composables/useAdapterStatus';
import { bindingFormRules, validators, BINDING_CONSTRAINTS, CODE_MODE_OPTIONS } from '~/utils/validation/bindingRules';
import type { ServerBindingConfig } from '~/server/utils/config/bindingConfigManager';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

// 使用 Naive UI 的消息反馈
const message = useMessage();

definePageMeta({
  layout: 'servere-edit'
});

const { serverId, serverName } = useServerData();
const { fetchConfig, saveConfig } = useBindingConfig(serverId.value);
const { adapterStatus, fetchAdapterStatus } = useAdapterStatus(serverId.value);

// 从 layout 注入页面状态管理函数
const registerPageState = inject<(state: PageState) => void>('registerPageState');
const clearPageState = inject<() => void>('clearPageState');

const form = ref<ServerBindingConfig>();
const initialForm = ref<ServerBindingConfig | undefined>();
const loading = ref(true);

// 添加浏览器刷新/关闭前的确认提示
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '您有未保存的更改，确定要离开此页面吗？';
    return '您有未保存的更改，确定要离开此页面吗？';
  }
};

onMounted(async () => {
  // 注册页面状态到 layout
  if (registerPageState) {
    registerPageState({
      isDirty: () => isDirty.value,
      save: saveBinding
    });
  }

  // 注册浏览器关闭前的确认提示
  window.addEventListener('beforeunload', handleBeforeUnload);

  loading.value = true;
  try {
    const [configRes] = await Promise.all([fetchConfig(), fetchAdapterStatus()]);
    if (configRes && configRes.config) {
      form.value = { ...configRes.config };
      initialForm.value = { ...configRes.config };
    }
  } catch (error) {
    console.error('Failed to load page data:', error);
  } finally {
    loading.value = false;
    previewCode();
  }
});

// 组件卸载时清理状态
onUnmounted(() => {
  // 移除浏览器关闭前的确认提示
  window.removeEventListener('beforeunload', handleBeforeUnload);

  if (clearPageState) {
    clearPageState();
  }
});

const isDirty = computed(() => {
  if (!form.value || !initialForm.value) return false;
  // 只比较可编辑字段
  const keys: (keyof ServerBindingConfig)[] = [
    'maxBindCount',
    'codeLength',
    'codeExpire',
    'codeMode',
    'prefix',
    'unbindPrefix',
    'allowUnbind',
    'forceBind',
    'kickMsg',
    'unbindKickMsg',
    'bindSuccessMsg',
    'bindFailMsg',
    'unbindSuccessMsg',
    'unbindFailMsg'
  ];
  return keys.some((key) => form.value?.[key] !== initialForm.value?.[key]);
});

// 动态生成指令示例
const bindCommandExample = computed(() => {
  if (!form.value) return '';
  const prefix = form.value.prefix || '';
  return `${prefix}${previewedCode.value || 'ABC123'}`;
});

const unbindCommandExample = computed(() => {
  if (!form.value) return '';
  // 如果配置了专用的解绑前缀，使用解绑前缀
  if (form.value.unbindPrefix && form.value.unbindPrefix.trim()) {
    return `${form.value.unbindPrefix}PlayerName`;
  }
  // 否则使用绑定前缀+玩家名的方式
  const prefix = form.value.prefix || '';
  return `${prefix}PlayerName`;
});

const successMessageExample = computed(() => {
  if (!form.value) return '';
  return form.value.bindSuccessMsg?.replace('#user', 'PlayerName') || '';
});

// 是否可以保存配置
const canSaveConfig = computed(() => {
  return adapterStatus.value?.hasAdapter && !prefixValidationError.value && isDirty.value;
});

// 前缀校验
const prefixValidationError = ref('');

// 校验绑定和解绑前缀不能相同
function validatePrefixes() {
  if (!form.value) return;

  const prefix = form.value.prefix?.trim();
  const unbindPrefix = form.value.unbindPrefix?.trim();

  const conflictResult = validators.prefixConflict(prefix || '', unbindPrefix || '');
  if (!conflictResult.valid) {
    prefixValidationError.value = conflictResult.message!;
    return false;
  }

  prefixValidationError.value = '';
  return true;
}

const previewedCode = ref('');

// 用于初始化和同步表单
function previewCode() {
  if (!form.value) return;
  const { codeLength, codeMode } = form.value;
  let chars = '';
  switch (codeMode) {
    case 'mix':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      break;
    case 'number':
      chars = '0123456789';
      break;
    case 'word':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      break;
    case 'upper':
      chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      break;
    case 'lower':
      chars = 'abcdefghijklmnopqrstuvwxyz';
      break;
  }
  let code = '';
  for (let i = 0; i < codeLength; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  previewedCode.value = code;
}

// 放弃更改
function discardChanges() {
  if (!initialForm.value) return;

  message.info('已放弃未保存的更改');
  form.value = { ...initialForm.value };
  validatePrefixes();
  previewCode();
}

// 插入占位符到输入框
function insertPlaceholder(fieldName: string, placeholder: string) {
  if (!form.value) return;

  // 只允许在特定的消息模板字段中插入占位符
  const messageFields = [
    'kickMsg',
    'unbindKickMsg',
    'bindSuccessMsg',
    'bindFailMsg',
    'unbindSuccessMsg',
    'unbindFailMsg'
  ];

  if (!messageFields.includes(fieldName)) {
    message.warning('该字段不支持占位符');
    return;
  }

  const currentValue = (form.value[fieldName as keyof typeof form.value] as string) || '';

  // 简单地在末尾添加占位符（可以根据需要改进为光标位置插入）
  const newValue = currentValue + placeholder;

  // 更新表单字段 - 直接使用字段名
  switch (fieldName) {
    case 'kickMsg':
      form.value.kickMsg = newValue;
      break;
    case 'unbindKickMsg':
      form.value.unbindKickMsg = newValue;
      break;
    case 'bindSuccessMsg':
      form.value.bindSuccessMsg = newValue;
      break;
    case 'bindFailMsg':
      form.value.bindFailMsg = newValue;
      break;
    case 'unbindSuccessMsg':
      form.value.unbindSuccessMsg = newValue;
      break;
    case 'unbindFailMsg':
      form.value.unbindFailMsg = newValue;
      break;
  }

  message.success(`已插入占位符: ${placeholder}`);
}

// 消息模板预览计算属性
const kickMsgPreview = computed(() => {
  if (!form.value?.kickMsg) return '未设置踢出消息';

  return form.value.kickMsg
    .replace('#name', 'PlayerName')
    .replace('#cmd_prefix', form.value.prefix || '/绑定 ')
    .replace('#code', previewedCode.value || 'ABC123')
    .replace('#time', `${form.value.codeExpire || 5}分钟`)
    .replace(/&[0-9a-fk-or]/g, '') // 移除 Minecraft 颜色代码用于预览
    .replace(/\n/g, ' '); // 换行转为空格用于预览
});

const unbindKickMsgPreview = computed(() => {
  if (!form.value?.unbindKickMsg) return '未设置解绑踢出消息';

  return form.value.unbindKickMsg
    .replace('#social_account', '1234567890')
    .replace(/&[0-9a-fk-or]/g, '') // 移除 Minecraft 颜色代码
    .replace(/\n/g, ' ');
});

const bindSuccessMsgPreview = computed(() => {
  if (!form.value?.bindSuccessMsg) return '未设置绑定成功消息';

  return form.value.bindSuccessMsg.replace('#user', 'PlayerName');
});

const bindFailMsgPreview = computed(() => {
  if (!form.value?.bindFailMsg) return '未设置绑定失败消息';

  return form.value.bindFailMsg.replace('#user', 'PlayerName').replace('#why', '验证码已过期');
});

const unbindSuccessMsgPreview = computed(() => {
  if (!form.value?.unbindSuccessMsg) return '未设置解绑成功消息';

  return form.value.unbindSuccessMsg.replace('#user', 'PlayerName');
});

const unbindFailMsgPreview = computed(() => {
  if (!form.value?.unbindFailMsg) return '未设置解绑失败消息';

  return form.value.unbindFailMsg.replace('#user', 'PlayerName').replace('#why', '玩家不存在');
});

// 保存绑定配置
async function saveBinding(): Promise<void> {
  if (!form.value) return;

  // 检查适配器状态
  if (!adapterStatus.value?.hasAdapter) {
    message.error('请先配置绑定适配器');
    throw new Error('请先配置绑定适配器');
  }

  // 校验前缀
  if (!validatePrefixes()) {
    message.error('请修正前缀配置错误');
    throw new Error('请修正前缀配置错误');
  }

  try {
    await saveConfig({ ...form.value });
    // 更新初始表单数据
    initialForm.value = { ...form.value };
    message.success('配置保存成功');
  } catch (error: unknown) {
    // 处理后端校验错误
    if (error instanceof Error && error.message) {
      // 检查是否包含多个错误信息（用分号分隔）
      if (error.message.includes('；')) {
        const errors = error.message.split('；');
        message.error(`配置保存失败：${errors[0]}`); // 显示第一个错误
        // 可以选择显示所有错误或只显示第一个
      } else {
        message.error(`配置保存失败：${error.message}`);
      }

      // 特殊处理前缀冲突错误
      if (error.message.includes('绑定前缀和解绑前缀不能相同')) {
        prefixValidationError.value = '绑定前缀和解绑前缀不能相同';
      }
      throw error;
    } else {
      message.error('配置保存失败');
      throw error;
    }
  }
}
</script>

<style scoped lang="less">
.disabled-content {
  opacity: 0.6;
  pointer-events: none;
  filter: grayscale(20%);
}
.save-section {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  background: var(--card-color);
  border-radius: 8px;
}
.form-grid {
  max-width: 100%;
}
.number-input {
  width: 100%;
}
.switch-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 34px;
}
.label-with-tooltip,
.desc-with-tooltip {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: help;
  .help-icon {
    color: var(--text-color-3);
    opacity: 0.6;
    transition: opacity 0.2s ease;
    &:hover {
      opacity: 1;
    }
  }
}
.center-desc {
  display: flex;
  align-items: center;
  gap: 4px;
}
.section-divider {
  margin: 24px 0 16px 0;
}
.examples-section {
  .examples-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    font-weight: 500;
    .examples-icon {
      color: var(--primary-color);
    }
  }
  .examples-grid {
    display: grid;
    gap: 16px;
  }
  .example-item {
    .example-label {
      margin-bottom: 8px;
    }
    .command-demo {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      .command-code {
        flex: 1;
        font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
        background-color: var(--code-color);
        border: 1px solid var(--border-color);
        border-radius: 6px;
        padding: 8px 12px;
        font-size: 13px;
        font-weight: 500;
        letter-spacing: 0.5px;
      }
      .copy-btn {
        flex-shrink: 0;
        opacity: 0.6;
        transition: opacity 0.2s ease;
        &:hover {
          opacity: 1;
        }
      }
    }
    .example-desc {
      display: flex;
      align-items: center;
      gap: 4px;
      padding-left: 4px;
    }
    &.response-example {
      .response-demo {
        .response-alert {
          font-size: 13px;
        }
      }
    }
  }
}

/* 完善样式，采用与 GeneralConfig.vue 相同的布局风格 */
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

/* 示例项过渡动画 */
.example-slide-enter-active,
.example-slide-leave-active {
  transition: all 0.25s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.example-slide-enter-from {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}

.example-slide-leave-to {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}

.example-slide-enter-to,
.example-slide-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
  max-height: 150px;
  margin-bottom: 16px;
}

.binding-config {
  /* 网格容器优化 */
  .dense-grid {
    /* 卡片高度自适应 */
    .config-card {
      // 底部留白
      margin-bottom: 16px;
    }
  }

  .save-section {
    display: flex;
    justify-content: flex-end;
    padding: 16px 0;
    background: var(--card-color);

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

/* 占位符提示样式 */
.template-help {
  margin-top: 8px;

  .placeholder-tags {
    margin-bottom: 6px;

    .n-tag {
      cursor: pointer;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 11px;
      padding: 2px 6px;
      transition: all 0.2s ease;
      user-select: none;

      &:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(24, 160, 88, 0.2);
        background-color: var(--primary-color);
        color: white;
      }

      &:active {
        transform: translateY(0);
      }
    }
  }

  .template-preview-inline {
    background: var(--code-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 6px 8px;
    font-size: 12px;
    line-height: 1.4;

    .n-text {
      font-family: inherit;
    }
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .binding-config {
    .config-card {
      border-radius: 8px;
    }

    .save-section {
      padding: 12px;

      .save-button {
        min-width: 120px;
      }
    }

    .n-form-item {
      margin-bottom: 16px;
    }
  }
}

@media (max-width: 480px) {
  .binding-config {
    .config-card {
      border-radius: 6px;
    }

    .save-section {
      padding: 10px;

      .save-button {
        min-width: 100px;
        font-size: 13px;
      }
    }

    .n-form-item {
      margin-bottom: 12px;
    }
  }
}
</style>
