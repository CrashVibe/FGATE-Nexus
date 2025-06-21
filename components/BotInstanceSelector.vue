<template>
  <div class="bot-instance-selector">
    <n-space vertical size="medium">
      <!-- 头部 -->
      <div class="header-section">
        <n-text strong>创建 Bot 实例</n-text>
        <n-text depth="3">选择适配器类型并配置 Bot 实例</n-text>
      </div>

      <!-- 适配器类型选择 -->
      <n-form :model="formData" :rules="formRules" label-placement="left" label-width="120px">
        <n-form-item label="适配器类型" path="adapterType">
          <n-select
            v-model:value="formData.adapterType"
            :options="adapterOptions"
            placeholder="请选择Bot适配器类型"
            @update:value="handleAdapterTypeChange"
          />
        </n-form-item>

        <!-- OneBot V11 配置 -->
        <template v-if="formData.adapterType === 'onebot'">
          <n-divider />

          <n-form-item label="连接类型" path="connectionType" :show-feedback="false">
            <n-select
              v-model:value="formData.connectionType"
              :options="connectionTypeOptions"
              placeholder="请选择连接类型"
              @update:value="handleConnectionTypeChange"
            />
          </n-form-item>

          <!-- 反向连接需要 botId -->
          <n-form-item v-if="formData.connectionType === 'reverse'" label="机器人 ID" path="botId">
            <n-input-number
              v-model:value="formData.botId"
              placeholder="请输入机器人 QQ 号"
              :min="10000"
              style="width: 100%"
            />
          </n-form-item>

          <!-- 正向连接说明 -->
          <n-alert
            v-if="formData.connectionType === 'forward'"
            type="info"
            title="正向连接说明"
            class="connection-info"
          >
            正向连接模式下，Bot ID 将在连接建立后自动获取，无需预先配置。
          </n-alert>

          <n-form-item label="显示名称" path="displayName">
            <n-input v-model:value="formData.displayName" placeholder="可选，用于识别不同的机器人实例" />
          </n-form-item>
        </template>
      </n-form>
    </n-space>
  </div>
</template>

<script setup lang="ts">
interface BotInstanceData {
  adapterType: string;
  botId: number | null;
  displayName: string;
  connectionType: 'reverse' | 'forward';
}

const props = defineProps<{
  modelValue: BotInstanceData;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: BotInstanceData];
}>();

// 适配器选项
const adapterOptions = [
  {
    label: 'OneBot V11 (QQ机器人)',
    value: 'onebot'
  }
];

// 连接类型选项
const connectionTypeOptions = [
  { label: '反向连接（机器人连接到服务器）', value: 'reverse' },
  { label: '正向连接（服务器连接到机器人）', value: 'forward' }
];

// 使用计算属性同步数据
const formData = computed({
  get: () => props.modelValue,
  set: (value) => {
    emit('update:modelValue', value);
  }
});

// 表单验证规则
const formRules = computed(() => {
  const baseRules = {
    adapterType: [
      {
        required: true,
        message: '请选择适配器类型',
        trigger: ['blur', 'change']
      }
    ],
    connectionType: [
      {
        required: true,
        message: '请选择连接类型',
        trigger: ['blur', 'change']
      }
    ]
  };

  // 仅反向连接时需要 botId
  if (formData.value.connectionType === 'reverse') {
    return {
      ...baseRules,
      botId: [
        {
          required: true,
          type: 'number' as const,
          message: '请输入有效的机器人 ID',
          trigger: ['blur', 'input']
        }
      ]
    };
  }

  return baseRules;
});

// 处理适配器类型变化
function handleAdapterTypeChange(value: string) {
  const newData = {
    adapterType: value,
    botId: null,
    displayName: '',
    connectionType: 'reverse' as 'reverse' | 'forward'
  };
  emit('update:modelValue', newData);
}

// 处理连接类型变化
function handleConnectionTypeChange(value: 'reverse' | 'forward') {
  const newData = {
    ...formData.value,
    connectionType: value,
    // 正向连接时清空 botId
    botId: value === 'forward' ? null : formData.value.botId
  };
  emit('update:modelValue', newData);
}
</script>

<style scoped lang="less">
.bot-instance-selector {
  .header-section {
    text-align: center;
    margin-bottom: 20px;

    :deep(.n-text:first-child) {
      font-size: 18px;
      margin-bottom: 4px;
      display: block;
    }

    :deep(.n-text:last-child) {
      font-size: 13px;
      opacity: 0.7;
      display: block;
    }
  }

  .connection-info {
    margin: 16px 0;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .bot-instance-selector .header-section {
    margin-bottom: 16px;

    :deep(.n-text:first-child) {
      font-size: 16px;
    }

    :deep(.n-text:last-child) {
      font-size: 12px;
    }
  }
}
</style>
