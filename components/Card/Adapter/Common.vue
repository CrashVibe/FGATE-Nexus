<template>
  <n-card hoverable bordered class="adapter-card">
    <div class="card-content">
      <div key="view">
        <div class="header">
          <n-text strong class="adapter-name">{{ getDisplayName(adapter) }}</n-text>
          <n-tag :bordered="false" :type="getStatusType(adapter)" size="small">
            {{ getStatusText(adapter) }}
          </n-tag>
        </div>
        <div class="info-section">
          <div class="info-item">
            <span>适配器 ID:</span>
            <span>{{ adapter.id }}</span>
          </div>
          <div class="info-item">
            <span>类型:</span>
            <span>{{ adapter.type || '未知' }}</span>
          </div>
          <div v-if="adapter.detail" class="detail-section">
            <n-text class="detail-title">详细信息:</n-text>
            <div class="detail-content">
              <pre>{{ JSON.stringify(adapter.detail, null, 2) }}</pre>
            </div>
          </div>
        </div>
        <div class="button-row">
          <n-button type="error" size="small" @click="handleDelete"> 删除 </n-button>
        </div>
        <!-- 新增底部提示 -->
        <div class="card-footer-tip">
          <n-text depth="3" style="font-size: 12px; opacity: 0.7; user-select: none"> 点击卡片查看更多信息 </n-text>
        </div>
      </div>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import type { AdapterUnionType } from '~/server/shared/types/adapters/adapter';
import { getAdapterTypeDisplayName, isOnebotAdapter, isWebSocketAdapter } from '~/utils/adapters/componentMap';

interface Props {
  adapter: AdapterUnionType;
}

defineProps<Props>();

const emit = defineEmits<{
  delete: [];
  update: [];
}>();

// 获取显示名称
function getDisplayName(adapter: AdapterUnionType): string {
  return getAdapterTypeDisplayName(adapter.type) || adapter.type || '未知适配器';
}

// 获取状态类型
function getStatusType(adapter: AdapterUnionType): 'success' | 'error' | 'default' {
  if (adapter.connected !== undefined) {
    return adapter.connected ? 'success' : 'error';
  }

  // 使用类型守卫检查具体类型
  if (isOnebotAdapter(adapter) || isWebSocketAdapter(adapter)) {
    return adapter.detail?.enabled ? 'success' : 'error';
  }

  return 'default';
}

// 获取状态文本
function getStatusText(adapter: AdapterUnionType): string {
  if (adapter.connected !== undefined) {
    return adapter.connected ? '已连接' : '未连接';
  }

  // 使用类型守卫检查具体类型
  if (isOnebotAdapter(adapter) || isWebSocketAdapter(adapter)) {
    return adapter.detail?.enabled ? '启用' : '禁用';
  }

  return '未知状态';
}

// 处理删除
function handleDelete() {
  emit('delete');
}
</script>

<style scoped lang="less">
.fade-slide-zoom-enter-active,
.fade-slide-zoom-leave-active {
  transition: all 0.3s ease;
}

.fade-slide-zoom-enter-from,
.fade-slide-zoom-leave-to {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}
.adapter-card {
  border-radius: 8px;
  transition: all 0.3s ease;
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 1px 3px rgba(0, 0, 0, 0.1);
  transform: translateY(0);
  cursor: pointer;
  &:hover {
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.13);
    border-color: #409eff;
    background: rgba(64, 158, 255, 0.04);
  }
}
.clickable-icon {
  color: #409eff;
  opacity: 0.7;
  transition: opacity 0.2s;
  vertical-align: middle;
}
.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  .n-input-number,
  .n-input {
    width: 100%;
  }
}
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}
.adapter-name {
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 70%;
}
.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.info-section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-section {
  margin-top: 12px;
  padding: 8px;
  background-color: var(--n-color-target);
  border-radius: 4px;
}

.detail-title {
  font-size: 12px;
  font-weight: 600;
  margin-bottom: 8px;
  display: block;
}

.detail-content {
  pre {
    font-size: 10px;
    margin: 0;
    white-space: pre-wrap;
    word-break: break-all;
    max-height: 100px;
    overflow-y: auto;
  }
}

.token-text {
  display: flex;
  align-items: center;
  user-select: text;
}
.button-row {
  display: flex;
  gap: 12px;
  margin-top: 12px;
  flex-direction: row-reverse;
}
.card-footer-tip {
  margin-top: 8px;
  text-align: right;
}
</style>
