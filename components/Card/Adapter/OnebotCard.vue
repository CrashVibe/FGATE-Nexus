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
                        <n-tag :bordered="false" :type="adapter.enabled ? 'success' : 'error'" size="small">
                            {{ adapter.enabled ? '启用' : '禁用' }}
                        </n-tag>
                    </div>

                    <div class="info-item">
                        <n-text depth="2">机器人ID：</n-text>
                        <n-text>{{ adapter.botId }}</n-text>
                    </div>

                    <div class="info-item">
                        <n-text depth="2">响应超时：</n-text>
                        <n-text>{{ (adapter.responseTimeout / 1000).toFixed(1) }} 秒</n-text>
                    </div>

                    <div class="info-item">
                        <n-text depth="2">验证令牌:</n-text>
                        <n-text class="token-text" style="cursor: pointer" @click.stop="showToken = !showToken">
                            {{
                                adapter.accessToken
                                    ? showToken
                                        ? adapter.accessToken
                                        : '***'.repeat(16 / 3)
                                    : '无密钥'
                            }}
                            <n-icon
                                v-if="adapter.accessToken"
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
                </div>
            </transition>
        </div>
    </n-card>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useMessage, useDialog } from 'naive-ui';
import type { onebot_adapters } from '@/server/shared/types/adapters/adapter';
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
    adapter: onebot_adapters;
}>();

const message = useMessage();
const dialog = useDialog();

const showToken = ref(false);
const isEditing = ref(false);
const loading = ref(false);

// 这里保持和接口一致，enabled而非switch
const editForm = ref({
    adapter_type: 'onebot',
    accessToken: props.adapter.accessToken || '',
    botId: props.adapter.botId,
    responseTimeout: props.adapter.responseTimeout,
    enabled: props.adapter.enabled
});

watch(
    () => props.adapter,
    (newVal) => {
        // 如果正在编辑，不更新表单数据
        if (isEditing.value) return;

        editForm.value = {
            adapter_type: 'onebot',
            accessToken: newVal.accessToken || '',
            botId: newVal.botId,
            responseTimeout: newVal.responseTimeout,
            enabled: newVal.enabled
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
    (e: 'update', data: onebot_adapters): void;
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
    showToken.value = false;
    // 回退到 props 状态
    editForm.value = {
        adapter_type: 'onebot',
        accessToken: props.adapter.accessToken || '',
        botId: props.adapter.botId,
        responseTimeout: props.adapter.responseTimeout,
        enabled: props.adapter.enabled
    };
}

function deleteAdapter() {
    dialog.error({
        title: '确认删除',
        content: `确定要删除适配器 "${props.adapter.botId}" 吗？此操作不可撤销。`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
            loading.value = true;
            useRequest(
                $serverAPI.Delete(`/adapters/${props.adapter.id}`, {
                    adapter_type: 'onebot'
                })
            )
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
}
.adapter-card:hover {
    transform: translateY(-4px);
    box-shadow:
        0 12px 16px rgba(0, 0, 0, 0.1),
        0 4px 6px rgba(0, 0, 0, 0.05);
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
    margin-top: 8px;
    font-size: 14px;
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

    &.mobile-layout {
        flex-direction: column;
        gap: 8px;

        .n-button {
            width: 100%;
            justify-content: center;
        }
    }
}

/* 移动端优化 */
@media (max-width: 768px) {
    .adapter-card {
        &:hover {
            transform: translateY(-2px);
        }
    }

    .card-content {
        padding: 12px;
        gap: 10px;
    }

    .adapter-name {
        font-size: 16px;
    }

    .info-item {
        font-size: 13px;
    }
}

@media (max-width: 480px) {
    .card-content {
        padding: 10px;
        gap: 8px;
    }

    .adapter-name {
        font-size: 15px;
    }

    .header {
        gap: 6px;
    }

    .info-item {
        font-size: 12px;
        gap: 6px;
    }
}
</style>
