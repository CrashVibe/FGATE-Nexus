<template>
  <n-layout class="layout" bordered>
    <!-- 顶部导航栏 -->
    <n-layout-header bordered>
      <n-space justify="space-between" align="start" style="height: 100%">
        <n-space align="start" style="gap: 8px">
          <n-image
            width="24"
            height="24"
            :src="'/favicon.ico'"
            preview-disabled
            style="border-radius: 50%; vertical-align: middle; display: inline-block"
          />
          <n-text strong style="vertical-align: middle; display: inline-block; line-height: 24px">FGate</n-text>
        </n-space>

        <n-space align="center">
          <!-- 主题切换按钮 -->
          <ThemeToggle />

          <!-- 手机端菜单按钮 -->
          <n-button v-if="isMobile" quaternary class="mobile-menu-button" @click="showMobileMenu = true">
            <template #icon>
              <n-icon :component="MenuOutline" />
            </template>
            菜单
          </n-button>
        </n-space>
      </n-space>
    </n-layout-header>

    <!-- 移动端抽屉菜单 -->
    <n-drawer v-model:show="showMobileMenu" :width="280" placement="left">
      <n-drawer-content title="导航菜单" closable>
        <n-menu :options="menuOptions" :value="selectedKey" @update:value="handleMobileMenuSelect" />
      </n-drawer-content>
    </n-drawer>

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
        <n-menu :key="selectedKey" :options="menuOptions" :value="selectedKey" @update:value="handleMenuSelect" />
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
import { provide, ref } from 'vue';

function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs';
  });
}

const router = useRouter();
const route = useRoute();

// 移动端菜单状态
const showMobileMenu = ref(false);

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

// 移动端菜单选择处理
const handleMobileMenuSelect = (key: RouteLocationAsPathGeneric) => {
  // 关闭移动端菜单
  showMobileMenu.value = false;
  // 执行导航
  handleMenuSelect(key);
};

const isMobile = useIsMobile();
const showSider = useMemo(() => {
  return !isMobile.value;
});

provide('menuOptions', menuOptions);
</script>

<style lang="less" scoped>
@import '/assets/css/layouts.less';
</style>
