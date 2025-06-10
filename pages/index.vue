<script setup lang="ts">
import { AddCircleOutline, RefreshOutline } from '@vicons/ionicons5';
import { v4 as uuidv4 } from 'uuid';
import ServerCard from '~/components/Card/ServerCard.vue';
import type { ServerWithStatus } from '~/server/shared/types/server/api';

// 获取 API 实例
const { serverApi } = useApi();

// 表单数据类型
interface FormData {
    servername: string;
    token: string;
}

// 对话框状态
const showModal = ref(false);
const submitting = ref(false);
const formRef = ref<any>(null);
const message = useMessage();

// 表单数据及验证规则
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

// 打开对话框时重置表单
watch(showModal, (newVal) => {
    if (newVal) {
        formData.value = {
            servername: '',
            token: ''
        };
        // 清除验证状态
        setTimeout(() => formRef.value?.restoreValidation(), 0);
    }
});

// 提交表单
const handleSubmit = async (e: Event) => {
    e.preventDefault();
    submitting.value = true;

    try {
        const addserver: any = await serverApi.addServer({
            name: formData.value.servername,
            token: formData.value.token
        });

        if (addserver.success) {
            message.success(addserver.message);
            handleClose();
            getServerList();
        } else {
            message.error(addserver.message);
        }
    } catch (error) {
        message.error('添加服务器失败');
        console.error('添加服务器失败:', error);
    }
    submitting.value = false;
};

// 关闭对话框
const handleClose = () => {
    showModal.value = false;
};
// 生成随机Token
const generateToken = () => {
    formData.value.token = uuidv4();
    message.info('已生成随机Token');
};

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

const serverList = ref<ServerWithStatus[]>([]);
const refreshTimer = ref<NodeJS.Timeout | null>(null);
// 添加最后更新时间
const lastUpdateTime = ref<string>('');

// 获取服务器列表
async function getServerList() {
    try {
        const res = await serverApi.getServerList();
        if (res.success) {
            serverList.value = res.data;
            // 更新最后更新时间
            lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            });
            console.log('服务器列表:', res.data);
        } else {
            console.error('出错了:', res.message);
        }
        return res;
    } catch (error) {
        console.error('获取服务器列表失败:', error);
        return { success: false, message: '获取服务器列表失败' };
    }
}

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
                    <div class="head-text">
                        <n-text strong>
                            <h1>服务器列表</h1>
                            <p>管理您的服务器，点击进入详细配置。</p>
                            <p v-if="lastUpdateTime" class="last-update">最后更新: {{ lastUpdateTime }}</p>
                        </n-text>
                        <n-space>
                            <n-button noborder size="medium" :loading="refreshing" @click="handleRefresh">
                                <n-icon>
                                    <RefreshOutline />
                                </n-icon>
                                刷新
                            </n-button>
                            <n-button ghost size="medium" type="primary" @click="showModal = true">
                                <n-icon>
                                    <AddCircleOutline />
                                </n-icon>
                                添加服务器
                            </n-button>
                        </n-space>
                    </div>
                </div>
                <n-empty v-if="!serverList.length" description="您还没有任何服务器">
                    <template #extra>
                        <n-button size="small" @click="showModal = true"> 创建新服务器 </n-button>
                    </template>
                </n-empty>
                <n-modal
                    v-model:show="showModal"
                    title="新建服务器"
                    preset="dialog"
                    :show-icon="false"
                    style="width: 600px"
                >
                    <n-divider />
                    <n-form ref="formRef" :model="formData" :rules="rules" label-placement="left" label-width="auto">
                        <n-form-item label="服务器名字" path="servername">
                            <n-input v-model:value="formData.servername" placeholder="请输入你服务器绚丽の名字" />
                        </n-form-item>

                        <n-form-item label="Token" path="token">
                            <n-tooltip trigger="focus" show-arrow>
                                <template #trigger>
                                    <n-input v-model:value="formData.token" placeholder="请输入服务器の秘密 Token">
                                        <template #suffix>
                                            <n-button size="small" @click="generateToken">随机生成</n-button>
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
                        <n-space justify="end">
                            <n-button @click="handleClose">取消</n-button>
                            <n-button type="primary" :loading="submitting" :disabled="submitting" @click="handleSubmit">
                                提交
                            </n-button>
                        </n-space>
                    </template>
                </n-modal>
                <n-grid cols="1 600:2 960:3" x-gap="16" y-gap="16">
                    <n-gi
                        v-for="(server, index) in serverList || []"
                        :key="serverList.indexOf(server)"
                        :class="{ 'server-offline': !server.isOnline }"
                    >
                        <transition
                            name="card-appear"
                            appear
                            :css="false"
                            @enter="onCardEnter"
                            @before-enter="onBeforeCardEnter"
                        >
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
</style>
