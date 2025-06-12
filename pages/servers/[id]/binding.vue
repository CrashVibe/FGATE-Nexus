<template>
  <ServerPageWrapper>
    <!-- 页面标题 -->
    <ServerPageHeader title="账号绑定" :server-name="serverName" />

    <!-- 绑定配置内容 -->
    <n-card size="small" class="binding-config-card">
      <n-tabs v-model:value="activeTab" type="line" animated>
        <n-tab-pane name="basic" tab="基础设置">
          <div class="form-grid">
            <n-form :model="form" label-placement="top" class="form-section">
              <n-grid :cols="isMobile ? 1 : '1 s:2 m:3 l:3'" responsive="screen" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            绑定数量
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        每个社交账号最多可以绑定的游戏账号数量
                      </n-tooltip>
                    </template>
                    <n-input-number v-model:value="form.maxBindCount" min="1" max="10" class="number-input" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            验证码长度
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        生成的验证码字符数量，影响验证码复杂度
                      </n-tooltip>
                    </template>
                    <n-input-number v-model:value="form.codeLength" min="4" max="12" class="number-input" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            有效时间
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        验证码的有效时间，单位为分钟，超时后需重新生成
                      </n-tooltip>
                    </template>
                    <n-input-number v-model:value="form.codeExpire" min="1" max="60" class="number-input">
                      <template #suffix>分钟</template>
                    </n-input-number>
                  </n-form-item>
                </n-gi>
              </n-grid>

              <!-- 验证码生成模式和前缀设置 -->
              <n-grid :cols="isMobile ? 1 : '1 s:1 m:2 l:2'" responsive="screen" :x-gap="16" :y-gap="16">
                <n-gi span="1 s:1 m:2 l:2">
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            生成模式
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        验证码的字符组成方式，决定验证码的字符类型和复杂度
                      </n-tooltip>
                    </template>
                    <n-input-group style="flex: 1">
                      <n-select
                        v-model:value="form.codeMode"
                        :options="codeModeOptions"
                        style="flex: 1"
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
                </n-gi>
              </n-grid>

              <!-- 通用前缀和开关设置 -->
              <n-grid :cols="isMobile ? 1 : '1 s:2 m:2 l:2'" responsive="screen" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form-item label="通用前缀">
                    <n-input v-model:value="form.prefix" placeholder="如：/" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            允许解绑
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        是否允许用户主动解除账号绑定关系
                      </n-tooltip>
                    </template>
                    <div class="switch-wrapper">
                      <n-switch v-model:value="form.allowUnbind" />
                    </div>
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
          </div>
          <n-divider class="section-divider" />
          <div class="examples-section">
            <n-card size="small" class="examples-card">
              <template #header>
                <div class="examples-header">
                  <n-icon size="18" class="examples-icon">
                    <SearchOutline />
                  </n-icon>
                  <span>指令示例预览</span>
                </div>
              </template>

              <div class="examples-grid">
                <!-- 绑定指令示例 -->
                <div class="example-item">
                  <div class="example-label">
                    <n-tag type="primary" size="small" round>绑定指令</n-tag>
                  </div>
                  <div class="command-demo">
                    <n-code :code="bindCommandExample" language="text" class="command-code" />
                    <n-button
                      class="copy-btn"
                      size="tiny"
                      quaternary
                      circle
                      @click="copyToClipboard(bindCommandExample)"
                    >
                      <template #icon>
                        <n-icon>
                          <CopyOutline />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                  <div class="example-desc">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-text depth="3" size="small" class="desc-with-tooltip">
                          群聊绑定指令
                          <n-icon size="12">
                            <HelpCircleOutline />
                          </n-icon>
                        </n-text>
                      </template>
                      用户在QQ群或其他社交平台聊天中发送此指令来绑定游戏账号
                    </n-tooltip>
                  </div>
                </div>

                <!-- 解绑指令示例 -->
                <div v-if="form.allowUnbind" class="example-item">
                  <div class="example-label">
                    <n-tag type="warning" size="small" round>解绑指令</n-tag>
                  </div>
                  <div class="command-demo">
                    <n-code :code="unbindCommandExample" language="text" class="command-code" />
                    <n-button
                      class="copy-btn"
                      size="tiny"
                      quaternary
                      circle
                      @click="copyToClipboard(unbindCommandExample)"
                    >
                      <template #icon>
                        <n-icon>
                          <CopyOutline />
                        </n-icon>
                      </template>
                    </n-button>
                  </div>
                  <div class="example-desc">
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <n-text depth="3" size="small" class="desc-with-tooltip">
                          群聊解绑指令
                          <n-icon size="12">
                            <HelpCircleOutline />
                          </n-icon>
                        </n-text>
                      </template>
                      用户在QQ群或其他社交平台聊天中发送此指令来解除已绑定的游戏账号
                    </n-tooltip>
                  </div>
                </div>

                <!-- 成功反馈示例 -->
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
            </n-card>
          </div>
        </n-tab-pane>
        <n-tab-pane name="advanced" tab="高级设置">
          <div class="form-grid">
            <n-form :model="form" label-placement="top" class="form-section">
              <!-- 强制绑定开关 -->
              <n-grid cols="1" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form-item>
                    <template #label>
                      <n-tooltip trigger="hover">
                        <template #trigger>
                          <span class="label-with-tooltip">
                            强制绑定
                            <n-icon size="14" class="help-icon">
                              <HelpCircleOutline />
                            </n-icon>
                          </span>
                        </template>
                        开启后，未绑定社交账号的玩家将被踢出服务器
                      </n-tooltip>
                    </template>
                    <div class="switch-wrapper">
                      <n-switch v-model:value="form.forceBind" />
                    </div>
                  </n-form-item>
                </n-gi>
              </n-grid>

              <!-- 踢出消息设置 -->
              <n-space vertical size="large">
                <n-form-item>
                  <template #label>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <span class="label-with-tooltip">
                          未绑定踢出消息
                          <n-icon size="14" class="help-icon">
                            <HelpCircleOutline />
                          </n-icon>
                        </span>
                      </template>
                      当玩家未绑定社交账号时显示的踢出消息（支持颜色代码）
                    </n-tooltip>
                  </template>
                  <n-input v-model:value="form.kickMsg" type="textarea" :rows="5" />
                </n-form-item>

                <n-form-item>
                  <template #label>
                    <n-tooltip trigger="hover">
                      <template #trigger>
                        <span class="label-with-tooltip">
                          解绑踢出消息
                          <n-icon size="14" class="help-icon">
                            <HelpCircleOutline />
                          </n-icon>
                        </span>
                      </template>
                      当玩家的社交账号被解绑时显示的踢出消息
                    </n-tooltip>
                  </template>
                  <n-input v-model:value="form.unbindKickMsg" type="textarea" :rows="3" />
                </n-form-item>
              </n-space>
            </n-form>
          </div>
        </n-tab-pane>
        <n-tab-pane name="messages" tab="反馈消息配置">
          <div class="form-grid">
            <n-form :model="form" label-placement="top" class="form-section">
              <!-- 绑定相关消息 -->
              <n-grid :cols="isMobile ? 1 : '1 s:2 m:2 l:2'" responsive="screen" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form-item label="绑定成功">
                    <n-input v-model:value="form.bindSuccessMsg" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="绑定失败">
                    <n-input v-model:value="form.bindFailMsg" />
                  </n-form-item>
                </n-gi>
              </n-grid>

              <!-- 解绑相关消息 -->
              <n-grid cols="1 s:2 m:2 l:2" responsive="screen" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form-item label="解绑成功">
                    <n-input v-model:value="form.unbindSuccessMsg" />
                  </n-form-item>
                </n-gi>
                <n-gi>
                  <n-form-item label="解绑失败">
                    <n-input v-model:value="form.unbindFailMsg" />
                  </n-form-item>
                </n-gi>
              </n-grid>
            </n-form>
          </div>
        </n-tab-pane>
      </n-tabs>

      <!-- 保存按钮 -->
      <n-divider />
      <div class="save-section">
        <n-space justify="end">
          <n-button type="primary" size="medium" @click="saveBinding"> 保存配置 </n-button>
        </n-space>
      </div>
    </n-card>
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { CopyOutline, HelpCircleOutline, SearchOutline, CheckmarkCircleOutline } from '@vicons/ionicons5';
import { useBreakpoint, useMemo } from 'vooks';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/composables/useServerData';
import { useBindingConfig } from '~/composables/useBindingConfig';

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
const { config, fetchConfig, saveConfig } = useBindingConfig(serverId.value);

const form = ref({
  maxBindCount: 4,
  codeLength: 6,
  codeMode: 'mix',
  codeExpire: 5,
  allowUnbind: true,
  prefix: '/',
  forceBind: false,
  kickMsg: `&l&k123456&6&l未绑定社交帐号 | #name&f&l&k123456\n&f&a进入服务器需要绑定您的社交帐号\n&f请先加群&e956076046\n&f发送内容:&a绑定 #code\n&f发送后方可进入服务器\n&7请在#time前完成验证\n&7&l【&c&l!&7&l】请不要将验证码发送给其他人\n&7&l【&c&l!&7&l】验证超时后需重新进入服务器`,
  trustKickMsg: `&l&k123456&6&l未绑定社交帐号 | #name&f&l&k123456\n&f&a进入服务器需要绑定您的社交帐号\n&f请先加群&e956076046\n&f发送内容:&a绑定 #name\n&f发送后方可进入服务器\n&7&l【&c&l!&7&l】请注意名称大小写`,
  unbindKickMsg: `&l&k123456&a&l社交帐号被解绑&f&l&k123456\n您的社交账号&c<#social_account>&f已在社交平台解绑。`,
  bindSuccessMsg: '绑定#user成功! 你可以进入服务器了!',
  bindFailMsg: '绑定#user失败! #why',
  unbindSuccessMsg: '解除绑定#user成功!',
  unbindFailMsg: '解除fdsafasfy'
});

const activeTab = ref('basic');

const codeModeOptions = [
  { label: '大小写单词和数字', value: 'mix' },
  { label: '纯数字', value: 'number' },
  { label: '纯单词(大小写)', value: 'word' },
  { label: '纯单词(大写)', value: 'upper' },
  { label: '纯单词(小写)', value: 'lower' }
];
const previewedCode = ref('');

// 初始化时生成一个示例验证码
onMounted(async () => {
  await fetchConfig();
  fillFormFromConfig(config.value);
  previewCode();
});

// 用于初始化和同步表单
function fillFormFromConfig(cfg: Record<string, unknown> | null) {
  if (!cfg) return;
  Object.keys(form.value).forEach((key) => {
    if (Object.prototype.hasOwnProperty.call(cfg, key) && cfg[key] !== undefined) {
      // @ts-expect-error: 动态表单字段赋值，后端返回字段类型不完全匹配前端定义
      form.value[key] = cfg[key];
    }
  });
}

// 动态生成指令示例
const bindCommandExample = computed(() => {
  const prefix = form.value.prefix || '';
  return `${prefix}绑定 ${previewedCode.value || 'ABC123'}`;
});

const unbindCommandExample = computed(() => {
  const prefix = form.value.prefix || '';
  return `${prefix}解绑 PlayerName`;
});

const successMessageExample = computed(() => {
  return form.value.bindSuccessMsg.replace('#user', 'PlayerName');
});

function previewCode() {
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

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    message.success('已复制到剪贴板');
  } catch (err) {
    console.error('复制失败:', err);
    // 降级方案：使用传统的复制方法
    const textArea = document.createElement('textarea');
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      message.success('已复制到剪贴板');
    } catch {
      message.error('复制失败');
    }
    document.body.removeChild(textArea);
  }
}

// 保存绑定配置
async function saveBinding() {
  try {
    await saveConfig({ ...form.value });
    message.success('配置保存成功');
  } catch {
    message.error('配置保存失败');
  }
}
</script>

<style scoped lang="less">
.binding-config-card {
  :deep(.n-card__content) {
    padding: 16px;
  }
}

.save-section {
  margin-top: 16px;
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
  height: 34px; // 与其他输入框高度对齐
}

.label-with-tooltip {
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

.desc-with-tooltip {
  display: flex;
  align-items: center;
  gap: 4px;
  cursor: help;
}

.section-divider {
  margin: 24px 0 16px 0;
}

.examples-section {
  .examples-card {
    .examples-header {
      display: flex;
      align-items: center;
      gap: 8px;
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

          :deep(.n-code) {
            background: transparent !important;
            padding: 0 !important;
            border-radius: 0 !important;
          }
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
        padding-left: 4px;
      }

      &.response-example {
        .response-demo {
          .response-alert {
            font-size: 13px;

            :deep(.n-alert__content) {
              font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
              font-weight: 500;
            }
          }
        }
      }
    }
  }
}
</style>
