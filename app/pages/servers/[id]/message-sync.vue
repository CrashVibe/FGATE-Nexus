<template>
  <ServerPageWrapper>
    <ServerPageHeader title="消息互通" :server-name="serverName" />

    <!-- 未保存提示条 -->
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
            <n-button size="small" type="primary" :loading="loading" @click="saveConfig"> 保存更改 </n-button>
            <n-button size="small" quaternary @click="discardChanges"> 放弃更改 </n-button>
          </n-space>
        </div>
      </n-alert>
    </Transition>

    <!-- 分页标签切换 -->
    <n-tabs v-model:value="currentTab" type="segment" animated class="main-tabs">
      <n-tab-pane name="status" tab="状态监控" display-directive="show:lazy">
        <!-- 状态监控区域 -->
        <div class="status-section">
          <n-grid :cols="isMobile ? 1 : 3" :x-gap="16" :y-gap="16" responsive="screen">
            <!-- 连接状态卡片 -->
            <n-gi>
              <n-card title="连接状态" size="small" class="status-card">
                <template #header-extra>
                  <n-space size="small">
                    <n-tag size="small" :type="overallConnectionStatus" round>
                      {{ overallConnectionText }}
                    </n-tag>
                    <n-button size="small" quaternary title="点击刷新连接状态" @click="refreshConnectionStatus">
                      <template #icon>
                        <n-icon><RefreshOutline /></n-icon>
                      </template>
                    </n-button>
                  </n-space>
                </template>

                <n-space vertical size="medium">
                  <div class="connection-item">
                    <div class="connection-header">
                      <n-icon size="16" :color="connectionStatus.minecraft.connected ? '#18a058' : '#d03050'">
                        <ServerOutline />
                      </n-icon>
                      <n-text strong size="small">Minecraft</n-text>
                      <n-tag size="tiny" :type="connectionStatus.minecraft.connected ? 'success' : 'error'">
                        {{ connectionStatus.minecraft.connected ? '已连接' : '未连接' }}
                      </n-tag>
                    </div>
                    <div class="connection-details">
                      <n-text depth="3" size="small">在线: {{ connectionStatus.minecraft.playerCount }} 人</n-text>
                      <n-text depth="3" size="small">
                        最后活动:
                        {{
                          connectionStatus.minecraft.lastSeen
                            ? formatLastSeen(connectionStatus.minecraft.lastSeen)
                            : '从未连接'
                        }}
                      </n-text>
                    </div>
                  </div>

                  <div class="connection-item">
                    <div class="connection-header">
                      <n-icon size="16" :color="connectionStatus.onebot.connected ? '#18a058' : '#d03050'">
                        <ChatbubbleOutline />
                      </n-icon>
                      <n-text strong size="small">OneBot (QQ)</n-text>
                      <n-tag size="tiny" :type="connectionStatus.onebot.connected ? 'success' : 'error'">
                        {{ connectionStatus.onebot.connected ? '已连接' : '未连接' }}
                      </n-tag>
                    </div>
                    <div class="connection-details">
                      <n-text depth="3" size="small">群聊: {{ connectionStatus.onebot.groupCount }} 个</n-text>
                      <n-text depth="3" size="small">
                        最后活动:
                        {{
                          connectionStatus.onebot.lastSeen
                            ? formatLastSeen(connectionStatus.onebot.lastSeen)
                            : '从未连接'
                        }}
                      </n-text>
                    </div>
                  </div>
                </n-space>
              </n-card>
            </n-gi>

            <!-- 消息队列状态 -->
            <n-gi>
              <n-card title="消息队列" size="small" class="status-card">
                <template #header-extra>
                  <n-space size="small">
                    <n-tag size="small" :type="queueStatusType" round>
                      {{ queueStatusText }}
                    </n-tag>
                    <n-button size="small" quaternary @click="refreshQueueStats">
                      <template #icon>
                        <n-icon><RefreshOutline /></n-icon>
                      </template>
                    </n-button>
                  </n-space>
                </template>

                <n-space vertical size="medium">
                  <div class="queue-stat-row">
                    <n-statistic label="待处理" :value="queueStats.pending" class="mini-stat">
                      <template #suffix><n-text depth="3" size="small">条</n-text></template>
                    </n-statistic>
                    <n-statistic label="成功" :value="queueStats.success || 0" class="mini-stat">
                      <template #suffix><n-text depth="3" size="small">条</n-text></template>
                    </n-statistic>
                    <n-statistic label="失败" :value="queueStats.failed" class="mini-stat">
                      <template #suffix><n-text depth="3" size="small">条</n-text></template>
                    </n-statistic>
                  </div>

                  <n-button
                    type="primary"
                    size="small"
                    block
                    :disabled="queueStats.pending === 0"
                    :loading="processingQueue"
                    @click="processQueue"
                  >
                    <template #icon>
                      <n-icon><PlayOutline /></n-icon>
                    </template>
                    处理队列 ({{ queueStats.pending }})
                  </n-button>
                </n-space>
              </n-card>
            </n-gi>

            <!-- 配置概览 -->
            <n-gi>
              <n-card title="配置概览" size="small" class="status-card">
                <template #header-extra>
                  <n-tag size="small" :type="form?.enabled ? 'success' : 'default'" round>
                    {{ form?.enabled ? '已启用' : '未启用' }}
                  </n-tag>
                </template>

                <n-space vertical size="medium">
                  <div class="config-overview-item">
                    <n-space justify="space-between" align="center">
                      <n-text size="small">MC → QQ</n-text>
                      <n-tag size="tiny" :type="form?.mcToQq && form?.enabled ? 'success' : 'default'">
                        {{ form?.mcToQq && form?.enabled ? '开启' : '关闭' }}
                      </n-tag>
                    </n-space>
                  </div>
                  <div class="config-overview-item">
                    <n-space justify="space-between" align="center">
                      <n-text size="small">QQ → MC</n-text>
                      <n-tag size="tiny" :type="form?.qqToMc && form?.enabled ? 'success' : 'default'">
                        {{ form?.qqToMc && form?.enabled ? '开启' : '关闭' }}
                      </n-tag>
                    </n-space>
                  </div>
                  <div class="config-overview-item">
                    <n-space justify="space-between" align="center">
                      <n-text size="small">目标群聊</n-text>
                      <n-text depth="3" size="small">{{ form?.groupIds?.length || 0 }} 个</n-text>
                    </n-space>
                  </div>
                  <div class="config-overview-item">
                    <n-space justify="space-between" align="center">
                      <n-text size="small">过滤规则</n-text>
                      <n-text depth="3" size="small">{{ form?.filterRules?.length || 0 }} 条</n-text>
                    </n-space>
                  </div>
                </n-space>
              </n-card>
            </n-gi>
          </n-grid>
        </div>
      </n-tab-pane>

      <n-tab-pane name="config" tab="配置设置" display-directive="show:lazy">
        <!-- 配置区域 -->
        <n-grid :cols="isMobile ? 1 : 3" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
          <!-- 基础设置卡片 -->
          <n-gi>
            <n-card title="基础设置" size="small" class="config-card">
              <template #header-extra>
                <n-tag size="small" type="primary" round>功能开关</n-tag>
              </template>
              <n-form v-if="form" :model="form" label-placement="top">
                <n-form-item label="启用消息互通">
                  <div class="switch-wrapper">
                    <n-switch v-model:value="form.enabled" />
                    <n-text depth="3" size="small">开启后消息将在 MC 和 QQ 群之间双向同步</n-text>
                  </div>
                </n-form-item>

                <n-form-item label="Minecraft → QQ 群">
                  <div class="switch-wrapper">
                    <n-switch v-model:value="form.mcToQq" :disabled="!form.enabled" />
                    <n-text depth="3" size="small">MC 聊天消息同步到 QQ 群</n-text>
                  </div>
                </n-form-item>

                <n-form-item label="QQ 群 → Minecraft">
                  <div class="switch-wrapper">
                    <n-switch v-model:value="form.qqToMc" :disabled="!form.enabled" />
                    <n-text depth="3" size="small">QQ 群消息同步到 MC 聊天</n-text>
                  </div>
                </n-form-item>
              </n-form>
            </n-card>
          </n-gi>

          <!-- 目标群聊卡片 -->
          <n-gi>
            <n-card title="目标群聊" size="small" class="config-card">
              <template #header-extra>
                <n-space size="small">
                  <n-tag size="small" type="success" round>{{ form?.groupIds?.length || 0 }} 个群聊</n-tag>
                  <n-button size="small" type="primary" @click="addGroupId">
                    <template #icon>
                      <n-icon><AddOutline /></n-icon>
                    </template>
                    添加
                  </n-button>
                </n-space>
              </template>

              <div class="group-list">
                <n-space v-if="form && form.groupIds.length > 0" vertical size="small">
                  <div v-for="(groupId, index) in form.groupIds" :key="index" class="group-item">
                    <n-input-group>
                      <n-input
                        v-model:value="form.groupIds[index]"
                        placeholder="请输入 QQ 群号"
                        :maxlength="20"
                        clearable
                        @blur="validateGroupId(index)"
                      />
                      <n-button type="error" quaternary @click="removeGroupId(index)">
                        <template #icon>
                          <n-icon><TrashOutline /></n-icon>
                        </template>
                      </n-button>
                    </n-input-group>
                  </div>
                </n-space>
                <n-empty v-else description="暂无配置群聊" size="small">
                  <template #icon>
                    <n-icon size="32">
                      <ChatbubbleOutline />
                    </n-icon>
                  </template>
                  <template #extra>
                    <n-button size="small" @click="addGroupId">添加第一个群聊</n-button>
                  </template>
                </n-empty>
              </div>
            </n-card>
          </n-gi>

          <!-- 快速操作卡片 -->
          <n-gi>
            <n-card title="快速操作" size="small" class="config-card">
              <template #header-extra>
                <n-tag size="small" type="info" round>便捷工具</n-tag>
              </template>

              <n-space vertical size="medium">
                <n-button type="primary" size="large" block :loading="loading" :disabled="!isDirty" @click="saveConfig">
                  <template #icon>
                    <n-icon><SaveOutline /></n-icon>
                  </template>
                  {{ loading ? '保存中...' : '保存配置' }}
                </n-button>

                <n-button quaternary block :disabled="!isDirty" @click="discardChanges">
                  <template #icon>
                    <n-icon><RefreshOutline /></n-icon>
                  </template>
                  放弃更改
                </n-button>

                <n-divider style="margin: 8px 0" />

                <div class="quick-stats">
                  <n-space justify="space-between">
                    <n-text depth="3" size="small">配置状态</n-text>
                    <n-tag size="small" :type="form?.enabled ? 'success' : 'default'">
                      {{ form?.enabled ? '已启用' : '未启用' }}
                    </n-tag>
                  </n-space>

                  <n-space justify="space-between">
                    <n-text depth="3" size="small">目标群聊</n-text>
                    <n-text size="small">{{ form?.groupIds?.length || 0 }} 个</n-text>
                  </n-space>

                  <n-space justify="space-between">
                    <n-text depth="3" size="small">过滤规则</n-text>
                    <n-text size="small">{{ form?.filterRules?.length || 0 }} 条</n-text>
                  </n-space>
                </div>
              </n-space>
            </n-card>
          </n-gi>

          <!-- 消息模版配置 -->
          <n-gi :span="isMobile ? 1 : 3">
            <n-card title="消息模版" size="small" class="config-card">
              <template #header-extra>
                <n-tag size="small" type="info" round>模版配置</n-tag>
              </template>
              <n-grid :cols="isMobile ? 1 : 2" :x-gap="16" :y-gap="16">
                <n-gi>
                  <n-form v-if="form" :model="form" label-placement="top">
                    <n-form-item label="MC → QQ 模版">
                      <n-input
                        v-model:value="form.mcToQqTemplate"
                        type="textarea"
                        :rows="3"
                        placeholder="MC 消息发送到 QQ 群的格式模版"
                        :maxlength="200"
                        show-count
                      />
                      <template #feedback>
                        <div class="template-help">
                          <n-space size="small" class="placeholder-tags">
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('mcToQqTemplate', '{player}')"
                              >{player}</n-tag
                            >
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('mcToQqTemplate', '{message}')"
                              >{message}</n-tag
                            >
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('mcToQqTemplate', '{server}')"
                              >{server}</n-tag
                            >
                            <n-tag
                              size="tiny"
                              type="default"
                              @click="insertPlaceholder('mcToQqTemplate', '{time:time}')"
                              >{time:time}</n-tag
                            >
                            <n-tag
                              size="tiny"
                              type="default"
                              @click="insertPlaceholder('mcToQqTemplate', '{playerCount}')"
                              >{playerCount}</n-tag
                            >
                            <n-tag
                              size="tiny"
                              type="default"
                              @click="insertPlaceholder('mcToQqTemplate', '{message:truncate:50}')"
                              >{message:truncate}</n-tag
                            >
                          </n-space>
                          <div class="template-preview-inline">
                            <n-text depth="3" size="small">预览: </n-text>
                            <n-text type="primary" size="small">{{ mcToQqPreview }}</n-text>
                          </div>
                        </div>
                      </template>
                    </n-form-item>
                  </n-form>
                </n-gi>

                <n-gi>
                  <n-form v-if="form" :model="form" label-placement="top">
                    <n-form-item label="QQ → MC 模版">
                      <n-input
                        v-model:value="form.qqToMcTemplate"
                        type="textarea"
                        :rows="3"
                        placeholder="QQ 群消息发送到 MC 的格式模版"
                        :maxlength="200"
                        show-count
                      />
                      <template #feedback>
                        <div class="template-help">
                          <n-space size="small" class="placeholder-tags">
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('qqToMcTemplate', '{nickname}')"
                              >{nickname}</n-tag
                            >
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('qqToMcTemplate', '{player}')"
                              >{player}</n-tag
                            >
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('qqToMcTemplate', '{message}')"
                              >{message}</n-tag
                            >
                            <n-tag size="tiny" type="default" @click="insertPlaceholder('qqToMcTemplate', '{group}')"
                              >{group}</n-tag
                            >
                            <n-tag
                              size="tiny"
                              type="default"
                              @click="insertPlaceholder('qqToMcTemplate', '{time:time}')"
                              >{time:time}</n-tag
                            >
                            <n-tag
                              size="tiny"
                              type="default"
                              @click="insertPlaceholder('qqToMcTemplate', '{message:escape}')"
                              >{message:escape}</n-tag
                            >
                          </n-space>
                          <div class="template-preview-inline">
                            <n-text depth="3" size="small">预览: </n-text>
                            <n-text type="success" size="small">{{ qqToMcPreview }}</n-text>
                          </div>
                        </div>
                      </template>
                    </n-form-item>
                  </n-form>
                </n-gi>
              </n-grid>
            </n-card>
          </n-gi>

          <!-- 过滤规则配置 -->
          <n-gi :span="isMobile ? 1 : 3">
            <n-card title="关键词过滤规则" size="small" class="config-card filter-rules-card">
              <template #header-extra>
                <n-space size="small">
                  <n-tag size="small" type="warning" round>{{ form?.filterRules?.length || 0 }} 条规则</n-tag>
                  <n-button size="small" type="primary" @click="addFilterRule">
                    <template #icon>
                      <n-icon><AddOutline /></n-icon>
                    </template>
                    添加规则
                  </n-button>
                </n-space>
              </template>

              <div class="filter-rules-content">
                <n-space v-if="form && form.filterRules.length > 0" vertical size="medium">
                  <div v-for="(rule, index) in form.filterRules" :key="index" class="filter-rule-item">
                    <n-card size="small" class="rule-card">
                      <template #header>
                        <div class="rule-header">
                          <n-space align="center">
                            <n-switch v-model:value="rule.enabled" size="small" />
                            <n-text strong>规则 {{ index + 1 }}</n-text>
                            <n-tag v-if="rule.direction === 'both'" size="small" type="primary" round> 双向 </n-tag>
                            <n-tag v-else-if="rule.direction === 'mcToQq'" size="small" type="info" round>
                              MC→QQ
                            </n-tag>
                            <n-tag v-else size="small" type="success" round> QQ→MC </n-tag>
                          </n-space>
                        </div>
                      </template>
                      <template #header-extra>
                        <n-button size="small" type="error" quaternary @click="removeFilterRule(index)">
                          <template #icon>
                            <n-icon><TrashOutline /></n-icon>
                          </template>
                        </n-button>
                      </template>

                      <n-grid :cols="isMobile ? 1 : 2" :x-gap="12" :y-gap="12">
                        <n-gi>
                          <n-form-item label="关键词" size="small">
                            <n-input
                              v-model:value="rule.keyword"
                              placeholder="要匹配的关键词"
                              :maxlength="50"
                              clearable
                            />
                          </n-form-item>
                        </n-gi>
                        <n-gi>
                          <n-form-item label="替换文本" size="small">
                            <n-input
                              v-model:value="rule.replacement"
                              placeholder="留空则屏蔽该消息"
                              :maxlength="100"
                              clearable
                            />
                          </n-form-item>
                        </n-gi>
                        <n-gi>
                          <n-form-item label="应用方向" size="small">
                            <n-select
                              v-model:value="rule.direction"
                              :options="directionOptions"
                              placeholder="选择应用方向"
                            />
                          </n-form-item>
                        </n-gi>
                        <n-gi>
                          <n-form-item label="匹配模式" size="small">
                            <n-select
                              v-model:value="rule.matchMode"
                              :options="matchModeOptions"
                              placeholder="选择匹配模式"
                            />
                          </n-form-item>
                        </n-gi>
                      </n-grid>
                    </n-card>
                  </div>
                </n-space>
                <n-empty v-else description="暂无过滤规则" size="small">
                  <template #icon>
                    <n-icon size="40">
                      <FilterOutline />
                    </n-icon>
                  </template>
                  <template #extra>
                    <n-button size="small" @click="addFilterRule">添加第一条规则</n-button>
                  </template>
                </n-empty>
              </div>
            </n-card>
          </n-gi>

          <!-- 调试测试区域 (开发模式) -->
          <n-gi v-if="isDevelopment" :span="isMobile ? 1 : 3" class="debug-section-wrapper">
            <n-card title="调试测试" size="small" class="config-card debug-card">
              <template #header-extra>
                <n-tag size="small" type="warning" round>开发模式</n-tag>
              </template>

              <n-space vertical>
                <n-form>
                  <n-grid :cols="isMobile ? 1 : 2" :x-gap="16" :y-gap="16">
                    <n-gi>
                      <n-form-item label="测试消息内容">
                        <n-input v-model:value="testMessage" placeholder="输入测试消息" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="发送者">
                        <n-input v-model:value="testSender" placeholder="输入发送者名称" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="消息来源">
                        <n-select v-model:value="testSource" :options="testSourceOptions" />
                      </n-form-item>
                    </n-gi>
                    <n-gi>
                      <n-form-item label="QQ群号 (可选)">
                        <n-input v-model:value="testGroupId" placeholder="QQ群号" />
                      </n-form-item>
                    </n-gi>
                  </n-grid>

                  <n-space>
                    <n-button
                      type="primary"
                      :loading="testingMessage"
                      :disabled="!testMessage || !testSender"
                      @click="sendTestMessage"
                    >
                      发送测试消息
                    </n-button>
                    <n-button @click="simulateConnections">模拟连接状态</n-button>
                  </n-space>
                </n-form>
              </n-space>
            </n-card>
          </n-gi>
        </n-grid>
      </n-tab-pane>
    </n-tabs>
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, inject, onUnmounted } from 'vue';
import { useBreakpoint, useMemo } from 'vooks';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/app/composables/useServerData';
import { useMessageSync } from '~/app/composables/useMessageSync';
import type { MessageSyncConfig } from '~/server/shared/types/messageSync';
import { frontendTemplateProcessor } from '~/utils/templateProcessor';
import {
  HelpCircleOutline,
  AddOutline,
  TrashOutline,
  ChatbubbleOutline,
  FilterOutline,
  SaveOutline,
  RefreshOutline,
  ServerOutline,
  PlayOutline
} from '@vicons/ionicons5';

const route = useRoute();

interface QueueStats {
  pending: number;
  failed: number;
  success: number;
  total: number;
}

interface ConnectionStatus {
  minecraft: {
    connected: boolean;
    lastSeen: Date | string | null;
    playerCount: number;
  };
  onebot: {
    connected: boolean;
    lastSeen: Date | string | null;
    groupCount: number;
  };
}

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();
const message = useMessage();

definePageMeta({
  layout: 'servere-edit'
});

const { serverId, serverName } = useServerData();
const { getMessageSyncConfig, updateMessageSyncConfig } = useMessageSync(serverId.value);

// 当前标签页
const currentTab = ref<'status' | 'config'>('status');

// 从 layout 注入页面状态管理函数
const registerPageState = inject<(state: PageState) => void>('registerPageState');
const clearPageState = inject<() => void>('clearPageState');

const form = ref<MessageSyncConfig>({
  enabled: false,
  mcToQq: true,
  qqToMc: true,
  groupIds: [],
  mcToQqTemplate: '[{server}] {player}: {message}',
  qqToMcTemplate: '[QQ] {nickname}: {message}',
  filterRules: []
});

const initialForm = ref<MessageSyncConfig>();
const loading = ref(false);

// 消息队列状态
const queueStats = ref<QueueStats>({
  pending: 0,
  failed: 0,
  success: 0,
  total: 0
});

// 连接状态
const connectionStatus = ref<ConnectionStatus>({
  minecraft: {
    connected: false,
    lastSeen: null,
    playerCount: 0
  },
  onebot: {
    connected: false,
    lastSeen: null,
    groupCount: 0
  }
});

// 处理队列状态
const processingQueue = ref(false);

// 开发模式标识
const isDevelopment = ref(process.env.NODE_ENV === 'development');

// 测试数据
const testMessage = ref('');
const testSender = ref('TestPlayer');
const testSource = ref<'minecraft' | 'qq'>('minecraft');
const testGroupId = ref('');
const testingMessage = ref(false);

// 测试选项
const testSourceOptions = [
  { label: 'Minecraft', value: 'minecraft' },
  { label: 'QQ群', value: 'qq' }
];

// 计算属性
const overallConnectionStatus = computed(() => {
  if (connectionStatus.value.minecraft.connected && connectionStatus.value.onebot.connected) {
    return 'success';
  } else if (connectionStatus.value.minecraft.connected || connectionStatus.value.onebot.connected) {
    return 'warning';
  } else {
    return 'error';
  }
});

const overallConnectionText = computed(() => {
  if (connectionStatus.value.minecraft.connected && connectionStatus.value.onebot.connected) {
    return '全部已连接';
  } else if (connectionStatus.value.minecraft.connected || connectionStatus.value.onebot.connected) {
    return '部分连接';
  } else {
    return '未连接';
  }
});

const queueStatusType = computed(() => {
  if (queueStats.value.failed > 0) {
    return 'error';
  } else if (queueStats.value.pending > 0) {
    return 'warning';
  } else {
    return 'success';
  }
});

const queueStatusText = computed(() => {
  if (queueStats.value.failed > 0) {
    return '有失败消息';
  } else if (queueStats.value.pending > 0) {
    return '等待处理';
  } else {
    return '队列空闲';
  }
});

// 选项配置
const directionOptions = [
  { label: '双向过滤', value: 'both' },
  { label: '仅 MC → QQ', value: 'mcToQq' },
  { label: '仅 QQ → MC', value: 'qqToMc' }
];

const matchModeOptions = [
  { label: '精确匹配', value: 'exact' },
  { label: '包含匹配', value: 'contains' },
  { label: '正则表达式', value: 'regex' }
];

// 是否有未保存的更改
const isDirty = computed(() => {
  if (!initialForm.value || !form.value) return false;

  const formJson = JSON.stringify(form.value, null, 0);
  const initialJson = JSON.stringify(initialForm.value, null, 0);

  const result = formJson !== initialJson;
  console.log('isDirty check:', {
    result,
    formGroupIds: form.value.groupIds,
    initialGroupIds: initialForm.value.groupIds,
    formGroupIdsLength: form.value.groupIds.length,
    initialGroupIdsLength: initialForm.value.groupIds.length
  });

  return result;
});

// 模版预览
const mcToQqPreview = computed(() => {
  if (!form.value) return '';

  const context = frontendTemplateProcessor.createMessageSyncPreviewContext({
    source: 'minecraft',
    serverName: serverName.value || 'MyServer',
    serverId: parseInt(route.params.id as string)
  });

  return frontendTemplateProcessor.processTemplate(form.value.mcToQqTemplate, context);
});

const qqToMcPreview = computed(() => {
  if (!form.value) return '';

  const context = frontendTemplateProcessor.createMessageSyncPreviewContext({
    source: 'qq'
  });

  return frontendTemplateProcessor.processTemplate(form.value.qqToMcTemplate, context);
});

// 格式化最后活动时间
function formatLastSeen(date: Date | string | null): string {
  if (!date) {
    return '从未连接';
  }

  const lastSeenDate = typeof date === 'string' ? new Date(date) : date;

  // 检查日期是否有效
  if (isNaN(lastSeenDate.getTime())) {
    return '从未连接';
  }

  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - lastSeenDate.getTime()) / 1000);

  if (diffInSeconds < 60) {
    return '刚刚';
  } else if (diffInSeconds < 3600) {
    return `${Math.floor(diffInSeconds / 60)} 分钟前`;
  } else if (diffInSeconds < 86400) {
    return `${Math.floor(diffInSeconds / 3600)} 小时前`;
  } else {
    return `${Math.floor(diffInSeconds / 86400)} 天前`;
  }
}

// 设置默认连接状态
function setDefaultConnectionStatus() {
  connectionStatus.value = {
    minecraft: {
      connected: false,
      lastSeen: null, // 设置为 null 表示从未连接
      playerCount: 0
    },
    onebot: {
      connected: false,
      lastSeen: null, // 设置为 null 表示从未连接
      groupCount: 0
    }
  };
  // 保存默认状态到 localStorage
  localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));
  console.log('Set default connection status:', connectionStatus.value);
}

// 刷新队列统计
async function refreshQueueStats() {
  try {
    const response = (await $fetch(`/api/servers/${serverId.value}/message-queue-stats`)) as {
      success: boolean;
      data?: QueueStats;
    };
    if (response.success && response.data) {
      queueStats.value = response.data;
    }
  } catch (error) {
    console.error('Failed to refresh queue stats:', error);
  }
}

// 刷新连接状态
async function refreshConnectionStatus() {
  try {
    const response = (await $fetch(`/api/servers/${serverId.value}/connection-status`)) as {
      success: boolean;
      data?: ConnectionStatus;
      message?: string;
    };

    console.log('Backend connection status response:', response);

    if (response.success && response.data) {
      // 检查后端是否有真实的连接数据（连接状态为 true，或者有最近的 lastSeen 时间）
      const hasMinecraftConnection =
        response.data.minecraft.connected ||
        (response.data.minecraft.lastSeen && response.data.minecraft.lastSeen !== null);
      const hasOnebotConnection =
        response.data.onebot.connected || (response.data.onebot.lastSeen && response.data.onebot.lastSeen !== null);

      if (hasMinecraftConnection || hasOnebotConnection) {
        // 后端有真实连接数据，使用后端数据
        connectionStatus.value = response.data;
        localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));
        console.log('Updated connection status from backend (has real data):', response.data);
      } else {
        // 后端只有默认数据，优先使用本地缓存
        const savedConnectionStatus = localStorage.getItem(`connection-status-${serverId.value}`);
        if (savedConnectionStatus) {
          try {
            const parsed = JSON.parse(savedConnectionStatus);
            connectionStatus.value = parsed;
            console.log('Kept local connection status (backend has no real data):', parsed);
            return;
          } catch {
            console.warn('Failed to parse saved connection status');
          }
        }

        // 如果本地也没有数据，使用后端的默认数据
        connectionStatus.value = response.data;
        localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));
        console.log('Using backend default connection status:', response.data);
      }
    } else {
      console.warn('Failed to get connection status from backend:', response.message);
      setDefaultConnectionStatus();
    }
  } catch (error) {
    console.error('Failed to refresh connection status:', error);
    // 尝试从本地恢复状态
    const savedConnectionStatus = localStorage.getItem(`connection-status-${serverId.value}`);
    if (savedConnectionStatus) {
      try {
        const parsed = JSON.parse(savedConnectionStatus);
        connectionStatus.value = parsed;
        console.log('Restored connection status from localStorage (backend error):', parsed);
        return;
      } catch {
        console.warn('Failed to parse saved connection status during error recovery');
      }
    }

    // 最后的备用方案
    setDefaultConnectionStatus();
  }
}

// 处理消息队列
async function processQueue() {
  if (processingQueue.value) return;

  processingQueue.value = true;
  try {
    const response = (await $fetch(`/api/servers/${serverId.value}/process-message-queue`, {
      method: 'POST'
    })) as { success: boolean; message: string };

    if (response.success) {
      message.success(response.message);
      await refreshQueueStats();
    } else {
      message.error(response.message);
    }
  } catch (error) {
    console.error('Failed to process queue:', error);
    message.error('处理消息队列失败');
  } finally {
    processingQueue.value = false;
  }
}

// 发送测试消息
async function sendTestMessage() {
  if (!testMessage.value || !testSender.value) return;

  testingMessage.value = true;
  try {
    const response = (await $fetch(`/api/servers/${serverId.value}/send-message`, {
      method: 'POST',
      body: {
        content: testMessage.value,
        sender: testSender.value,
        source: testSource.value,
        groupId: testGroupId.value || undefined
      }
    })) as { success: boolean; message: string };

    if (response.success) {
      message.success(response.message);
      await refreshQueueStats();
    } else {
      message.error(response.message);
    }
  } catch (error) {
    console.error('Failed to send test message:', error);
    message.error('发送测试消息失败');
  } finally {
    testingMessage.value = false;
  }
}

// 模拟连接状态
async function simulateConnections() {
  try {
    // 生成模拟连接状态
    const minecraftConnected = Math.random() > 0.2; // 80% 概率连接
    const onebotConnected = Math.random() > 0.1; // 90% 概率连接
    const now = new Date().toISOString();

    const newConnectionStatus: ConnectionStatus = {
      minecraft: {
        connected: minecraftConnected,
        playerCount: minecraftConnected ? Math.floor(Math.random() * 25) + 1 : 0,
        lastSeen: now
      },
      onebot: {
        connected: onebotConnected,
        groupCount: onebotConnected ? Math.floor(Math.random() * 5) + 1 : 0,
        lastSeen: now
      }
    };

    // 直接更新本地状态
    connectionStatus.value = newConnectionStatus;
    // 保存到 localStorage
    localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));

    // 同时更新后端状态（但不依赖其响应）
    try {
      await $fetch(`/api/servers/${serverId.value}/update-connection-status`, {
        method: 'POST',
        body: {
          type: 'minecraft',
          status: newConnectionStatus.minecraft
        }
      });

      await $fetch(`/api/servers/${serverId.value}/update-connection-status`, {
        method: 'POST',
        body: {
          type: 'onebot',
          status: newConnectionStatus.onebot
        }
      });
    } catch (error) {
      console.warn('Failed to update backend connection status:', error);
      // 不影响前端显示，仍然使用本地状态
    }

    message.success('连接状态模拟完成');
    console.log('Simulated connection status:', connectionStatus.value);
  } catch (error) {
    console.error('Failed to simulate connections:', error);
    message.error('模拟连接状态失败');
  }
}

// 添加浏览器刷新/关闭前的确认提示
const handleBeforeUnload = (e: BeforeUnloadEvent) => {
  if (isDirty.value) {
    e.preventDefault();
    e.returnValue = '您有未保存的更改，确定要离开此页面吗？';
    return '您有未保存的更改，确定要离开此页面吗？';
  }
};

onMounted(async () => {
  if (registerPageState) {
    registerPageState({
      isDirty: () => isDirty.value,
      save: saveConfig
    });
  }

  window.addEventListener('beforeunload', handleBeforeUnload);

  await loadConfig();
  await refreshQueueStats();

  // 先尝试从 localStorage 恢复连接状态
  const savedConnectionStatus = localStorage.getItem(`connection-status-${serverId.value}`);
  let hasRestoredStatus = false;

  if (savedConnectionStatus) {
    try {
      const parsed = JSON.parse(savedConnectionStatus);
      connectionStatus.value = parsed;
      hasRestoredStatus = true;
      console.log('Restored connection status from localStorage:', parsed);
    } catch {
      console.warn('Failed to parse saved connection status, will use backend data');
    }
  }

  // 然后从后端获取最新状态（可能包含真实的连接数据）
  try {
    const response = (await $fetch(`/api/servers/${serverId.value}/connection-status`)) as {
      success: boolean;
      data?: ConnectionStatus;
      message?: string;
    };

    console.log('Backend connection status response:', response);

    if (response.success && response.data) {
      // 如果后端有真实的连接数据（任何一个连接为 true），则使用后端数据
      const hasRealConnection = response.data.minecraft.connected || response.data.onebot.connected;

      if (hasRealConnection) {
        connectionStatus.value = response.data;
        localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));
        console.log('Using backend connection status (has real connections):', response.data);
      } else if (!hasRestoredStatus) {
        // 只有在没有恢复到 localStorage 状态时才使用后端的默认状态
        connectionStatus.value = response.data;
        localStorage.setItem(`connection-status-${serverId.value}`, JSON.stringify(connectionStatus.value));
        console.log('Using backend default connection status:', response.data);
      } else {
        console.log('Keeping restored localStorage status, backend has no real connections');
      }
    } else if (!hasRestoredStatus) {
      console.warn('Failed to get connection status from backend:', response.message);
      setDefaultConnectionStatus();
    }
  } catch (error) {
    console.error('Failed to fetch connection status from backend:', error);
    if (!hasRestoredStatus) {
      setDefaultConnectionStatus();
    }
  }
});

onUnmounted(() => {
  window.removeEventListener('beforeunload', handleBeforeUnload);
  if (clearPageState) {
    clearPageState();
  }
});

// 加载配置
async function loadConfig() {
  loading.value = true;
  try {
    const response = await getMessageSyncConfig();
    if (response.config) {
      form.value = { ...response.config };
      initialForm.value = { ...response.config };
    } else {
      // 如果没有配置，使用默认配置并设置 initialForm
      initialForm.value = { ...form.value };
    }
    console.log('loadConfig completed:', {
      hasConfig: !!response.config,
      formGroupIds: form.value.groupIds,
      initialFormGroupIds: initialForm.value.groupIds
    });
  } catch (error) {
    console.error('Failed to load message sync config:', error);
    message.error('加载配置失败');
    // 确保即使出错也设置 initialForm
    initialForm.value = { ...form.value };
  } finally {
    loading.value = false;
  }
}

// 保存配置
async function saveConfig(): Promise<void> {
  if (!form.value) return;

  loading.value = true;
  try {
    await updateMessageSyncConfig(form.value);
    initialForm.value = { ...form.value };
    message.success('配置保存成功');
  } catch (error: unknown) {
    if (error instanceof Error && error.message) {
      message.error(`配置保存失败：${error.message}`);
    } else {
      message.error('配置保存失败');
    }
    throw error;
  } finally {
    loading.value = false;
  }
}

// 放弃更改
function discardChanges() {
  if (!initialForm.value) return;
  message.info('已放弃未保存的更改');
  form.value = { ...initialForm.value };
}

// 添加群聊ID
function addGroupId() {
  if (!form.value) return;
  console.log('addGroupId called, before:', form.value.groupIds);
  // 创建新数组以确保响应式更新
  form.value.groupIds = [...form.value.groupIds, ''];
  console.log('addGroupId called, after:', form.value.groupIds);
}

// 删除群聊ID
function removeGroupId(index: number) {
  if (!form.value) return;
  // 创建新数组以确保响应式更新
  const newGroupIds = [...form.value.groupIds];
  newGroupIds.splice(index, 1);
  form.value.groupIds = newGroupIds;
}

// 验证群聊ID
function validateGroupId(index: number) {
  if (!form.value) return;
  const groupId = form.value.groupIds[index];
  if (groupId && !/^\d+$/.test(groupId)) {
    message.warning(`群号 ${index + 1} 格式不正确，应为纯数字`);
  }
}

// 插入占位符
function insertPlaceholder(field: 'mcToQqTemplate' | 'qqToMcTemplate', placeholder: string) {
  if (!form.value) return;
  const currentValue = form.value[field];
  form.value[field] = currentValue + placeholder;
}

// 添加过滤规则
function addFilterRule() {
  if (!form.value) return;
  // 创建新数组以确保响应式更新
  form.value.filterRules = [
    ...form.value.filterRules,
    {
      keyword: '',
      replacement: '',
      direction: 'both',
      matchMode: 'contains',
      enabled: true
    }
  ];
}

// 删除过滤规则
function removeFilterRule(index: number) {
  if (!form.value) return;
  // 创建新数组以确保响应式更新
  const newFilterRules = [...form.value.filterRules];
  newFilterRules.splice(index, 1);
  form.value.filterRules = newFilterRules;
}
</script>

<style scoped lang="less">
/* 主标签页样式 */
.main-tabs {
  margin-bottom: 16px;
}

/* 状态监控区域 */
.status-section {
  margin-bottom: 24px;

  .status-card {
    height: 100%;

    .connection-item {
      .connection-header {
        display: flex;
        align-items: center;
        gap: 8px;
        margin-bottom: 4px;
      }

      .connection-details {
        margin-left: 24px;

        .n-text {
          display: block;
          margin-bottom: 2px;

          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }

    .queue-stat-row {
      display: flex;
      justify-content: space-between;

      .mini-stat {
        :deep(.n-statistic__value) {
          font-size: 18px;
        }

        :deep(.n-statistic__label) {
          font-size: 11px;
        }
      }
    }

    .config-overview-item {
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
}

/* 配置区域 */
.config-card {
  height: 100%;

  .switch-wrapper {
    display: flex;
    align-items: center;
    gap: 12px;
    height: 34px;
  }

  .group-list {
    .group-item {
      margin-bottom: 8px;
    }
  }

  .quick-stats {
    .n-space {
      margin-bottom: 8px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  .template-help {
    margin-top: 8px;

    .placeholder-tags {
      margin-top: 4px;

      .n-tag {
        cursor: pointer;
        transition: all 0.2s ease;

        &:hover {
          transform: scale(1.05);
          box-shadow: 0 2px 8px rgba(24, 160, 88, 0.2);
        }
      }
    }

    .template-preview-inline {
      margin-top: 8px;
      padding: 8px 12px;
      background-color: var(--n-color-embedded);
      border: 1px solid var(--n-border-color);
      border-radius: 6px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 8px;
    }
  }
}

.filter-rules-card {
  .filter-rules-content {
    .filter-rule-item {
      .rule-card {
        border: 1px solid var(--n-border-color);
        transition: all 0.2s ease;

        &:hover {
          border-color: var(--n-color-primary);
          box-shadow: 0 2px 8px rgba(24, 160, 88, 0.1);
        }
      }

      .rule-header {
        display: flex;
        align-items: center;
        width: 100%;
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

/* 调试区域样式 */
.debug-section {
  margin-top: 24px;
}

.debug-section-wrapper {
  margin-top: 24px;
}

/* 未保存提示条样式 */
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

/* 移动端优化 */
@media (max-width: 768px) {
  .status-section {
    margin-bottom: 20px;
  }

  .config-section {
    .config-card {
      border-radius: 8px;
    }

    .save-section {
      padding: 12px;

      .save-button {
        min-width: 120px;
      }
    }
  }
}

@media (max-width: 480px) {
  .status-section {
    margin-bottom: 16px;
  }

  .config-section {
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
  }
}
</style>
