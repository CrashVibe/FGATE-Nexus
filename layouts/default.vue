<template>
    <n-layout class="layout" bordered>
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
            <n-layout-sider v-if="showSider" bordered show-trigger :native-scrollbar="false" collapse-mode="width" :width="200">
                <n-menu
                    :key="selectedKey"
                    :options="menuOptions"
                    :value="selectedKey"
                    @update:value="handleMenuSelect"
                />
            </n-layout-sider>
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
import { MenuOutline, LinkOutline, PeopleOutline, PersonCircleOutline } from '@vicons/ionicons5';
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
const menuOptions = [
    { label: '服务器管理', key: '/', icon: renderIcon(MenuOutline) },
    { label: '适配器', key: '/adapters', icon: renderIcon(LinkOutline) },
    { label: '玩家列表', key: '/players', icon: renderIcon(PeopleOutline) },
    { label: '社交账号', key: '/accounts', icon: renderIcon(PersonCircleOutline) }
];

const selectedKey = computed(() => {
    console.log('🔄 Default layout - Route changed to:', route.path);
    return route.path;
});

watch(
    () => route.path,
    (newPath) => {
        console.log('🔄 Default layout - Route path changed:', newPath);
        nextTick(() => {
            console.log('🔄 Default layout - Menu should be updated with:', newPath);
        });
    }
);

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
    console.log('Menu selected:', key, 'Current route:', route.path);

    const targetPath = String(key);
    console.log('Navigating to:', targetPath);

    if (targetPath === route.path) {
        console.log('Same route, skipping navigation');
        return;
    }

    router.push(targetPath).catch((err) => {
        console.error('Navigation error:', err);
    });
};
const isMobile = useIsMobile();
const showSider = useMemo(() => {
    return !isMobile.value && !isMobile.value;
});
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
