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
            <n-layout-sider
                v-if="showSider"
                bordered
                show-trigger
                :native-scrollbar="false"
                collapse-mode="width"
                :width="200"
            >
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
import { MenuOutline, SettingsOutline, ServerOutline, BuildOutline } from '@vicons/ionicons5';
import { useRouter, useRoute, type RouteLocationAsPathGeneric } from 'vue-router';
import { NIcon } from 'naive-ui';
import { provide } from 'vue';
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

const getCurrentServerId = () => {
    const match = route.path.match(/\/servers\/(\d+)/);
    return match ? match[1] : null;
};

const menuOptions = computed(() => {
    const serverId = getCurrentServerId();
    const menu: Array<{ label: string; key: string; icon: ReturnType<typeof renderIcon>; desc?: string }> = [];

    menu.push({
        label: '返回服务器管理',
        key: '/',
        icon: renderIcon(MenuOutline),
        desc: '返回服务器列表主页。'
    });

    if (serverId) {
        menu.push({
            label: '配置总览',
            key: `/servers/${serverId}/config`,
            icon: renderIcon(SettingsOutline),
            desc: '查看和管理服务器的所有配置项总览。'
        });

        menu.push({
            label: '基础设置',
            key: `/servers/${serverId}/general`,
            icon: renderIcon(ServerOutline),
            desc: '配置服务器的基础运行参数和常规设置。'
        });

        menu.push({
            label: '账号绑定',
            key: `/servers/${serverId}/binding`,
            icon: renderIcon(SettingsOutline),
            desc: '设置社交账号与游戏账号的绑定规则。'
        });

        menu.push({
            label: '高级配置',
            key: `/servers/${serverId}/advanced`,
            icon: renderIcon(BuildOutline),
            desc: '高级功能配置，包括性能优化、调试选项等。'
        });
    }

    return menu;
});

const selectedKey = computed(() => {
    return route.path;
});

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
    console.log('Menu selected:', key, 'Current route:', route.path); // 调试日志

    // 确保key是字符串类型
    const targetPath = String(key);
    console.log('Navigating to:', targetPath);

    // 如果是当前页面，不执行导航
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
provide('menuOptions', menuOptions);
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
