<template>
    <n-card hoverable bordered class="adapter-card">
        <div class="card-content">
            <div key="view">
                <div class="header">
                    <n-text strong class="adapter-name">{{ adapter.adapterType || '未知' }} </n-text>
                    <n-tag :bordered="false" :type="adapter.enabled ? 'success' : 'error'" size="small">
                        {{ adapter.enabled !== undefined ? (adapter.enabled ? '启用' : '禁用') : '未知状态' }}
                    </n-tag>
                </div>
                <n-text strong>
                    <span>未知响应器类型</span>
                </n-text>
            </div>
        </div>
    </n-card>
</template>

<script setup lang="ts">
defineProps<{
    adapter: {
        adapterType?: string;
        enabled?: boolean;
    };
}>();
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
}
</style>
