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
import {
  MenuOutline,
  SettingsOutline,
  LinkOutline,
  BuildOutline,
  ArrowBackOutline,
  ChatbubbleOutline
} from '@vicons/ionicons5';
import { useRouter, useRoute, type RouteLocationAsPathGeneric } from 'vue-router';
import { ref, computed, h, provide, onUnmounted, onMounted } from 'vue';
import { useDialog, NIcon } from 'naive-ui';
import { usePageStateProvider } from '../app/composables/usePageState';

function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs';
  });
}

const router = useRouter();
const route = useRoute();
const dialog = useDialog();

// 页面状态管理
const { setPageState, clearPageState, isPageDirty, savePage } = usePageStateProvider();

// 提供页面状态注册函数给子组件
provide('registerPageState', setPageState);
provide('clearPageState', clearPageState);

// 移动端菜单状态
const showMobileMenu = ref(false);

// 路由离开时清理状态
onUnmounted(() => {
  clearPageState();
});

function needIntercept(path: string | undefined) {
  return path && /\/servers\/\d+\/(general|binding)$/.test(path);
}

const handleMenuSelect = (key: RouteLocationAsPathGeneric) => {
  const targetPath = String(key);
  if (!targetPath || targetPath === 'undefined' || targetPath === route.path) return;

  if (needIntercept(route.path) && isPageDirty()) {
    dialog.warning({
      title: '有未保存的更改',
      content: '切换页面前请保存更改，或放弃未保存内容。',
      positiveText: '保存并切换',
      negativeText: '放弃更改',
      onPositiveClick: async () => {
        await savePage();
        router.push(targetPath).catch(() => {});
      },
      onNegativeClick: () => {
        router.push(targetPath).catch(() => {});
      }
    });
    return;
  }
  router.push(targetPath).catch(() => {});
};

// 移动端菜单选择处理
const handleMobileMenuSelect = (key: RouteLocationAsPathGeneric) => {
  showMobileMenu.value = false;
  handleMenuSelect(key);
};

const isMobile = useIsMobile();
const showSider = useMemo(() => {
  return !isMobile.value;
});

// 菜单选项和选中项
const getCurrentServerId = () => {
  if (!route.path) return null;
  const match = route.path.match(/\/servers\/(\d+)/);
  return match ? match[1] : null;
};

const menuOptions = computed(() => {
  const serverId = getCurrentServerId();
  const menu = [];
  menu.push({
    label: '返回服务器管理',
    key: '/',
    icon: () => h(NIcon, null, { default: () => h(ArrowBackOutline) }),
    desc: '返回服务器列表主页。'
  });
  if (serverId) {
    menu.push({
      label: '配置概览',
      key: `/servers/${serverId}/config`,
      icon: () => h(NIcon, null, { default: () => h(MenuOutline) }),
      desc: '查看所有可用的配置选项。'
    });
    menu.push({
      label: '基础设置',
      key: `/servers/${serverId}/general`,
      icon: () => h(NIcon, null, { default: () => h(SettingsOutline) }),
      desc: '配置服务器的基础运行参数和常规设置。'
    });
    menu.push({
      label: '账号绑定',
      key: `/servers/${serverId}/binding`,
      icon: () => h(NIcon, null, { default: () => h(LinkOutline) }),
      desc: '设置社交账号与游戏账号的绑定规则。'
    });
    menu.push({
      label: '消息互通',
      key: `/servers/${serverId}/message-sync`,
      icon: () => h(NIcon, null, { default: () => h(ChatbubbleOutline) }),
      desc: 'Minecraft 与 QQ 群消息双向同步配置。'
    });
    menu.push({
      label: '高级配置',
      key: `/servers/${serverId}/advanced`,
      icon: () => h(NIcon, null, { default: () => h(BuildOutline) }),
      desc: '高级功能配置，包括性能优化、调试选项等。'
    });
  }
  return menu;
});

const selectedKey = computed(() => route.path || '');

// 提供菜单选项给子组件
provide('menuOptions', menuOptions);

// 添加未保存更改的关闭/刷新提示
onMounted(() => {
  const beforeUnloadHandler = (e: BeforeUnloadEvent) => {
    if (needIntercept(route.path) && isPageDirty()) {
      e.preventDefault();
      e.returnValue = '有未保存的更改，确定要离开吗？';
      return '有未保存的更改，确定要离开吗？';
    }
  };
  window.addEventListener('beforeunload', beforeUnloadHandler);

  // 组件卸载时移除事件
  onUnmounted(() => {
    window.removeEventListener('beforeunload', beforeUnloadHandler);
    clearPageState();
  });
});
</script>

<style lang="less" scoped>
@import '/assets/css/layouts.less';
</style>
