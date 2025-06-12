<template>
    <div class="page-container">
        <transition name="content-transition" appear>
            <div class="server-page">
                <n-space vertical size="large">
                    <slot />
                </n-space>
            </div>
        </transition>
    </div>
</template>

<script setup lang="ts">
// 页面包装器组件，提供统一的布局和动画
</script>

<style scoped lang="less">
.server-page {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
}
</style>
