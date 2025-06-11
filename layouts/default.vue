<template>
    <n-layout class="layout" bordered>
        <!-- 顶部导航栏 -->
        <n-layout-header bordered>
            <n-space justify="space-between" align="center" style="height: 100%">
                <n-text strong>服务器管理系统</n-text>
                <n-popover v-if="isMobile" trigger="click" placement="bottom-end">
                    <template #trigger>
                        <n-icon :component="MenuOutline" />
                    </template>
                    <n-menu
                        :key="selectedKey"
                        :options="menuOptions"
                        :value="selectedKey"
                        @update:value="handleMenuSelect"
                    />
                </n-popover>
            </n-space>
        </n-layout-header>
        <n-layout has-sider bordered class="sec_layout">
            <!-- 侧边栏 -->
            <n-layout-sider v-if="showSider" bordered show-trigger :native-scrollbar="false" collapse-mode="width">
                <n-menu
                    :key="selectedKey"
                    :options="menuOptions"
                    :value="selectedKey"
                    @update:value="handleMenuSelect"
                />
            </n-layout-sider>
            <!-- 页面内容 -->
            <n-layout-content :native-scrollbar="false">
                <div class="content-wrapper">
                    <slot />
                </div>
            </n-layout-content>
        </n-layout>
    </n-layout>
</template>

<script setup lang="ts">
import { useBreakpoint, useMemo } from 'vooks';
import { MenuOutline, LinkOutline, PeopleOutline } from '@vicons/ionicons5';
import { useRouter, useRoute, type RouteLocationAsPathGeneric } from 'vue-router';
import { NLayout, NLayoutHeader, NLayoutSider, NLayoutContent, NMenu, NIcon } from 'naive-ui';
function useIsMobile() {
    const breakpointRef = useBreakpoint();
    return useMemo(() => {
        return breakpointRef.value === 'xs';
    });
}
const router = useRouter();
const route = useRoute();
function renderIcon(icon: Component) {
    return () => h(NIcon, null, { default: () => h(icon) });
}
// 菜单配置
const menuOptions = [
    { label: '服务器管理', key: '/', icon: renderIcon(MenuOutline) },
    { label: '适配器', key: '/adapters', icon: renderIcon(LinkOutline) },
    { label: '玩家列表', key: '/players', icon: renderIcon(PeopleOutline) }
];

const selectedKey = computed(() => route.path);

// 监听路由变化，确保菜单状态同步
watch(
    () => route.path,
    (newPath) => {
        nextTick(() => {
            /* route change handled */
        });
    }
);

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
    const targetPath = String(key);

    // 如果是当前页面，不执行导航
    if (targetPath === route.path) {
        return;
    }

    router.push(targetPath).catch((err) => {
        console.error('Navigation error:', err);
    });
};
const isMobile = useIsMobile();
const showSider = useMemo(() => !isMobile.value);
</script>

<style lang="less" scoped>
.layout {
    .n-layout-header {
        padding: 20px;
        height: 64px;
    }
    .n-layout {
        width: 100%;
        height: calc(100vh - 64px);
    }
}

.content-wrapper {
    padding: 20px;
    min-height: 100%;
    transition: all 0.3s ease;
}

/* 内容区域的过渡动画 */
:deep(.nuxt-page) {
    transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
    transform-origin: center center;
}

.content-wrapper > * {
    transition:
        transform 0.3s ease,
        opacity 0.3s ease;
}

/* 响应式设计 */
@media (max-width: 768px) {
    .content-wrapper {
        padding: 15px;
    }
}
</style>
