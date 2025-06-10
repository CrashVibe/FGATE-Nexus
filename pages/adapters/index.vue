<script setup lang="ts">
import { AddCircleOutline, RefreshOutline } from '@vicons/ionicons5';
import AdapterOnebotCard from '~/components/Card/Adapter/OnebotCard.vue';
import type { onebot_adapters } from '@/server/shared/types/adapters/adapter';
import type { AdapterListResponse, AdapterActionResponse } from '@/server/shared/types/adapters/api';

import type { AdapterFormData, AdapterPayload } from '../../utils/adapters/forms';
import { onebotRules } from '../../utils/adapters/rules';
import Common from '~/components/Card/Adapter/Common.vue';

// 获取 API 实例
const { adapterApi } = useApi();

// 状态与引用
const showModal = ref(false);
const submitting = ref(false);
const formRef = ref<any>(null);
const adapters = ref<onebot_adapters[]>([]);
const message = useMessage();
// 添加定时器和最后更新时间
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const lastUpdateTime = ref<string>('');
// 添加编辑状态跟踪
const editingAdapters = ref<Set<number>>(new Set());

// 默认表单数据
const defaultOneBotConfig: AdapterFormData['config']['onebot'] = {
    botId: null,
    accessToken: null,
    listenPath: '/onebot/v11/ws',
    responseTimeout: 6000,
    enabled: true
};

const formData = ref<AdapterFormData>({
    adapter_type: 'onebot',
    config: { onebot: { ...defaultOneBotConfig } }
});

// 校验规则
const currentRules = computed(() => {
    const baseRules = {
        adapter: { required: true, message: '请选择适配器类型', trigger: ['blur'] }
    };

    if (formData.value.adapter_type === 'onebot') {
        return {
            ...baseRules,
            'config.onebot.botId': onebotRules.botId,
            'config.onebot.listenPath': onebotRules.listenPath,
            'config.onebot.responseTimeout': onebotRules.responseTimeout
        };
    }
    return baseRules;
});
// 重置表单
function resetFormData() {
    formData.value = {
        adapter_type: '',
        config: { onebot: { ...defaultOneBotConfig } }
    };
    setTimeout(() => formRef.value?.restoreValidation(), 0);
}

// 监听对话框打开自动重置
watch(showModal, (val) => {
    if (val) resetFormData();
});

// 关闭对话框
const handleClose = () => {
    showModal.value = false;
};

// 获取列表
async function getServerList() {
    try {
        const data = await adapterApi.getAdapters();
        if (data.success && data.data) {
            // 只更新非编辑状态的适配器
            const newAdapters = data.data.map((newAdapter: any) => {
                if (editingAdapters.value.has(newAdapter.id)) {
                    // 保持原有数据，不更新正在编辑的适配器
                    const existingAdapter = adapters.value.find((a: any) => a.id === newAdapter.id);
                    return existingAdapter || newAdapter;
                }
                return newAdapter;
            });
            adapters.value = newAdapters;
            // 更新最后更新时间
            lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
        } else {
            message.error('获取适配器失败：' + data.message || '未知错误');
        }
    } catch (error) {
        console.error('获取适配器列表失败:', error);
        message.error('获取适配器列表失败');
    }
}

// 刷新列表
const refreshing = ref(false);
const handleRefresh = async () => {
    refreshing.value = true;
    try {
        await getServerList();
        message.success('刷新成功');
    } catch {
        message.error('刷新失败');
    } finally {
        refreshing.value = false;
    }
};

// 初始化
onMounted(() => {
    getServerList();
    // 启动定时器，每秒刷新一次适配器列表
    refreshTimer.value = setInterval(() => {
        getServerList();
    }, 1000);
});

// 清理定时器
onUnmounted(() => {
    if (refreshTimer.value) {
        clearInterval(refreshTimer.value);
        refreshTimer.value = null;
    }
});

// 提交表单
const handleSubmit = async (e: Event) => {
    e.preventDefault();
    submitting.value = true;

    try {
        await formRef.value?.validate();

        const { adapter_type: adapter, config } = formData.value;
        const payload: AdapterPayload = { adapter_type: adapter };

        if (adapter === 'onebot') {
            const data = config.onebot;
            payload.config = {
                ...data,
                botId: data.botId,
                listenPath: data.listenPath?.trim(),
                accessToken: data.accessToken?.trim() || null,
                responseTimeout: data.responseTimeout || 6000,
                enabled: data.enabled ?? true
            };
        }

        // 使用 alova 替代 $fetch
        const response = await adapterApi.addAdapter(payload);

        if (response.success) {
            message.success('适配器创建成功');
            handleClose();
            getServerList();
        } else {
            message.error(response.message || '提交适配器失败');
        }
    } catch (error: any) {
        message.error(`提交适配器失败：${error.message || '未知错误'}`);
    } finally {
        submitting.value = false;
    }
};

// 处理编辑状态变化
const handleEditingChange = (adapterId: number, isEditing: boolean) => {
    if (isEditing) {
        editingAdapters.value.add(adapterId);
    } else {
        editingAdapters.value.delete(adapterId);
    }
};

// 动画处理函数
const onBeforeCardEnter = (el: Element) => {
    (el as HTMLElement).style.opacity = '0';
    (el as HTMLElement).style.transform = 'scale(0.8) translateY(20px)';
};

const onCardEnter = (el: Element, done: () => void) => {
    const index = parseInt((el as HTMLElement).dataset.index || '0');
    const delay = index * 100; // 每个卡片延迟100ms

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
                    <div class="head-text">
                        <n-text strong>
                            <h1>适配器列表</h1>
                            <p>管理多个适配器，点击进入详细配置。</p>
                            <p v-if="lastUpdateTime" class="last-update">最后更新: {{ lastUpdateTime }}</p>
                        </n-text>
                        <n-space>
                            <n-button size="medium" :loading="refreshing" @click="handleRefresh">
                                <n-icon><RefreshOutline /></n-icon>
                                刷新
                            </n-button>
                            <n-button ghost size="medium" type="primary" @click="showModal = true">
                                <n-icon><AddCircleOutline /></n-icon>
                                添加适配器
                            </n-button>
                        </n-space>
                    </div>
                </div>

                <n-empty v-if="!adapters.length" description="您还没有任何适配器">
                    <template #extra>
                        <n-button size="small" @click="showModal = true">创建新适配器</n-button>
                    </template>
                </n-empty>

                <n-modal v-model:show="showModal" title="新建适配器" preset="dialog" :show-icon="false">
                    <n-divider />
                    <n-form
                        ref="formRef"
                        :model="formData"
                        :rules="currentRules"
                        label-placement="left"
                        label-width="90px"
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
                                <n-form-item label="监听路径" path="config.onebot.listenPath">
                                    <n-input
                                        v-model:value="formData.config.onebot.listenPath"
                                        placeholder="例如：/onebot"
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
                        <n-space justify="end">
                            <n-button @click="handleClose">取消</n-button>
                            <n-button
                                type="primary"
                                :loading="submitting"
                                :disabled="submitting || !formData.adapter_type"
                                @click="handleSubmit"
                            >
                                提交
                            </n-button>
                        </n-space>
                    </template>
                </n-modal>
                <n-grid cols="1 600:2 1000:3" x-gap="16" y-gap="16" :item-responsive="true">
                    <n-gi v-for="(adapter, index) in adapters" :key="adapter.id">
                        <transition
                            name="card-appear"
                            appear
                            :css="false"
                            @enter="onCardEnter"
                            @before-enter="onBeforeCardEnter"
                        >
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
</style>
