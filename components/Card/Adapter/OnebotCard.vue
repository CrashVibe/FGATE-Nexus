<template>
  <n-card hoverable bordered class="adapter-card" @click="onCardClick">
    <div class="card-content">
      <transition name="fade-slide-zoom" mode="out-in">
        <div v-if="isEditing" key="edit">
          <n-form label-placement="left" label-width="auto" @submit.prevent>
            <n-form-item label="机器人 ID">
              <n-input-number v-model:value="editForm.botId" />
            </n-form-item>
            <n-form-item label="响应超时（毫秒）">
              <n-input-number v-model:value="editForm.responseTimeout" :min="1000" />
            </n-form-item>
            <n-form-item label="验证令牌" class="token-section">
              <n-input
                v-model:value="editForm.accessToken"
                :type="showToken ? 'text' : 'password'"
                clearable
                placeholder="请输入验证令牌"
              >
                <template #suffix>
                  <n-icon
                    :component="showToken ? EyeOutline : EyeOff"
                    style="cursor: pointer"
                    @click.stop="showToken = !showToken"
                  />
                </template>
              </n-input>
            </n-form-item>
            <n-form-item label="启用适配器" :show-feedback="false">
              <n-switch v-model:value="editForm.enabled" />
            </n-form-item>
            <div class="button-row" :class="{ 'mobile-layout': isMobile }">
              <n-button
                type="primary"
                :loading="loading"
                :size="isMobile ? 'small' : 'medium'"
                :block="isMobile"
                @click.stop="saveEdit"
              >
                保存
              </n-button>
              <n-button
                secondary
                :disabled="loading"
                :size="isMobile ? 'small' : 'medium'"
                :block="isMobile"
                @click.stop="cancelEdit"
              >
                取消
              </n-button>
              <n-button
                type="error"
                :loading="loading"
                :size="isMobile ? 'small' : 'medium'"
                :block="isMobile"
                @click.stop="deleteAdapter"
              >
                删除
              </n-button>
            </div>
          </n-form>
        </div>

        <div v-else key="view">
          <div class="header">
            <n-text strong class="adapter-name"> OneBot V11 </n-text>
            <n-tag :bordered="false" :type="adapter.detail?.enabled ? 'success' : 'error'" size="small">
              {{ adapter.detail?.enabled ? '启用' : '禁用' }}
            </n-tag>
          </div>

          <div class="info-item">
            <n-text depth="2">机器人ID：</n-text>
            <n-text>{{ adapter.detail?.botId }}</n-text>
          </div>

          <div class="info-item">
            <n-text depth="2">响应超时：</n-text>
            <n-text
              >{{
                adapter.detail?.responseTimeout != null ? (adapter.detail.responseTimeout / 1000).toFixed(1) : '-'
              }}
              秒</n-text
            >
          </div>

          <div class="info-item">
            <n-text depth="2">验证令牌：</n-text>
            <n-text @click.stop="showToken = !showToken">
              {{
                adapter.detail?.accessToken
                  ? showToken
                    ? adapter.detail?.accessToken
                    : '***'.repeat(16 / 3)
                  : '无密钥'
              }}
              <n-icon
                v-if="adapter.detail?.accessToken"
                :component="showToken ? EyeOutline : EyeOff"
                style="margin-left: 4px"
              />
            </n-text>
          </div>

          <div class="info-item">
            <n-text depth="2">连接状态：</n-text>
            <n-tag :bordered="false" :type="adapter.connected ? 'success' : 'error'" size="small">
              {{ adapter.connected ? '已连接' : '未连接' }}
            </n-tag>
          </div>

          <!-- 新增底部提示 -->
          <div class="card-footer-tip">
            <n-text depth="3" style="font-size: 12px; opacity: 0.7; user-select: none"> 点击卡片可编辑 </n-text>
          </div>
        </div>
      </transition>
    </div>
  </n-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import type { OnebotAdapterUnion } from '~/server/shared/types/adapters/adapter';
import { EyeOutline, EyeOff } from '@vicons/ionicons5';
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
const { $serverAPI } = useNuxtApp();

const props = defineProps<{
  adapter: OnebotAdapterUnion;
}>();

const message = useMessage();
const dialog = useDialog();

const showToken = ref(false);
const isEditing = ref(false);
const loading = ref(false);

// 这里保持和接口一致，enabled而非switch
const editForm = ref({
  adapter_type: 'onebot',
  accessToken: props.adapter.detail?.accessToken || '',
  botId: props.adapter.detail?.botId,
  responseTimeout: props.adapter.detail?.responseTimeout,
  enabled: props.adapter.detail?.enabled
});

watch(
  () => props.adapter,
  (newVal) => {
    // 如果正在编辑，不更新表单数据
    if (isEditing.value) return;

    editForm.value = {
      adapter_type: 'onebot',
      accessToken: newVal.detail?.accessToken || '',
      botId: newVal.detail?.botId,
      responseTimeout: newVal.detail?.responseTimeout,
      enabled: newVal.detail?.enabled
    };
  },
  { immediate: true, deep: true }
);

function onCardClick(event: MouseEvent) {
  const target = event.target as HTMLElement;
  if (target.closest('.token-section')) return; // 点击令牌区域不进入编辑
  if (isEditing.value) return;
  isEditing.value = true;
  emit('editing-change', props.adapter.id, true);
}

const emit = defineEmits<{
  (e: 'update', data: OnebotAdapterUnion): void;
  (e: 'delete', id: number): void;
  (e: 'editing-change', adapterId: number, isEditing: boolean): void;
}>();

async function saveEdit() {
  loading.value = true;
  useRequest($serverAPI.Put(`/adapters/${props.adapter.id}`, editForm.value))
    .onSuccess((response) => {
      const data = response.data as { success: boolean; message: string };
      if (data.success) {
        message.success(data.message || '适配器更新成功');
      } else {
        message.error(data.message || '提交适配器失败');
      }
      isEditing.value = false;
      emit('editing-change', props.adapter.id, false);
      emit('update', {
        ...props.adapter,
        ...editForm.value
      });
    })
    .onError((err) => {
      message.error(`提交适配器失败：${err.error || '未知错误'}`);
    })
    .onComplete(() => {
      loading.value = false;
    });
}

function cancelEdit() {
  isEditing.value = false;
  emit('editing-change', props.adapter.id, false);
}

function deleteAdapter() {
  dialog.warning({
    title: '确认删除',
    content: '您确定要删除这个适配器吗？',
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: () => {
      loading.value = true;
      useRequest($serverAPI.Delete(`/adapters/${props.adapter.id}`))
        .onSuccess((response) => {
          const data = response.data as { success: boolean; message: string };
          if (data.success) {
            message.success(data.message || '适配器删除成功');
            emit('delete', props.adapter.id);
          } else {
            message.error(data.message || '删除适配器失败');
          }
        })
        .onError((err) => {
          message.error(`删除适配器失败：${err.error || '未知错误'}`);
        })
        .onComplete(() => {
          loading.value = false;
        });
    }
  });
}
</script>

<style scoped>
.adapter-card {
  width: 100%;
  transition: transform 0.3s;
  cursor: pointer;
  transition:
    box-shadow 0.2s,
    border-color 0.2s,
    background 0.2s;
}

.adapter-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.13);
  border-color: #409eff;
  background: rgba(64, 158, 255, 0.04);
}

.card-content {
  padding: 4px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.adapter-name {
  font-size: 18px;
  font-weight: 500;
}

.info-item {
  margin-bottom: 8px;
}

.token-section {
  cursor: pointer;
}

.token-text {
  display: inline-block;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.button-row {
  margin-top: 16px;
  display: flex;
  gap: 8px;
}

.mobile-layout {
  flex-direction: column;
}

.clickable-icon {
  color: #409eff;
  opacity: 0.7;
  transition: opacity 0.2s;
  vertical-align: middle;
}

.card-footer-tip {
  margin-top: 8px;
  text-align: right;
}

/* 卡片内容过渡动画 */
.fade-slide-zoom-enter-active,
.fade-slide-zoom-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}

.fade-slide-zoom-enter-from {
  opacity: 0;
  transform: translateY(-15px) scale(0.95);
}

.fade-slide-zoom-leave-to {
  opacity: 0;
  transform: translateY(15px) scale(0.95);
}

.fade-slide-zoom-enter-to,
.fade-slide-zoom-leave-from {
  opacity: 1;
  transform: translateY(0) scale(1);
}
</style>
