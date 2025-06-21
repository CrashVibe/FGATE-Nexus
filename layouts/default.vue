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

    <n-drawer v-model:show="showMobileMenu" :width="280" placement="left">
      <n-drawer-content title="导航菜单" closable>
        <n-menu :options="menuOptions" :value="selectedKey" @update:value="handleMobileMenuSelect" />
      </n-drawer-content>
    </n-drawer>

    <n-layout has-sider bordered class="sec_layout">
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

const showMobileMenu = ref(false);

function renderIcon(icon: Component) {
  return () => h(NIcon, null, { default: () => h(icon) });
}
const menuOptions = computed(() => {
  const menu: Array<{ label: string; key: string; icon: ReturnType<typeof renderIcon>; desc?: string }> = [];

  menu.push({ label: '服务器管理', key: '/', icon: renderIcon(MenuOutline) });
  menu.push({ label: 'Bot 实例', key: '/adapters', icon: renderIcon(LinkOutline) });
  menu.push({ label: '玩家列表', key: '/players', icon: renderIcon(PeopleOutline) });
  menu.push({ label: '社交账号', key: '/accounts', icon: renderIcon(PersonCircleOutline) });

  return menu;
});

const selectedKey = computed(() => {
  console.log('[ROUTE] Default layout - Route changed to:', route.path);
  return route.path;
});

watch(
  () => route.path,
  (newPath) => {
    console.log('[ROUTE] Default layout - Route path changed:', newPath);
    nextTick(() => {
      console.log('[ROUTE] Default layout - Menu should be updated with:', newPath);
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

// 移动端菜单选择处理
const handleMobileMenuSelect = (key: RouteLocationAsPathGeneric) => {
  // 关闭移动端菜单
  showMobileMenu.value = false;
  // 执行导航
  handleMenuSelect(key);
};

const isMobile = useIsMobile();
const showSider = useMemo(() => {
  return !isMobile.value && !isMobile.value;
});
</script>

<style lang="less" scoped>
@import '/assets/css/layouts.less';
</style>
