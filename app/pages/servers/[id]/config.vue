<template>
  <ServerPageWrapper>
    <!-- 页面标题 -->
    <ServerPageHeader title="服务器配置" :server-name="serverName" back-button-text="服务器列表" back-path="/" />

    <!-- 简介卡片 -->
    <n-card v-if="desc" size="small" class="desc-card">
      <n-text depth="3">{{ desc }}</n-text>
    </n-card>

    <!-- 配置选项卡片 -->
    <n-grid
      v-if="configMenuItems.length > 0"
      :cols="isMobile ? 1 : '1 600:2 900:3'"
      x-gap="20"
      y-gap="20"
      :item-responsive="true"
    >
      <n-gi v-for="menuItem in configMenuItems" :key="menuItem.key" :span="getCardSpan(menuItem.label)">
        <n-card
          :title="menuItem.label"
          hoverable
          embedded
          class="config-card"
          @click="navigateToMenuItem(menuItem.key)"
        >
          <template #header-extra>
            <n-icon :component="getIconForMenuItem(menuItem.key)" size="20" />
          </template>
          <n-text depth="3">{{ menuItem.desc }}</n-text>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- 空状态提示 -->
    <n-empty v-else class="empty-state" description="暂无可用的配置选项">
      <template #extra>
        <n-button quaternary @click="$router.push('/')"> 返回服务器列表 </n-button>
      </template>
    </n-empty>
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SettingsOutline } from '@vicons/ionicons5';
import { useBreakpoint, useMemo } from 'vooks';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/app/composables/useServerData';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

definePageMeta({
  layout: 'servere-edit'
});

const route = useRoute();
const router = useRouter();
const { serverName } = useServerData();

// 定义菜单选项类型
interface MenuOption {
  label: string;
  key: string;
  desc?: string;
  icon?: () => import('vue').VNode;
}

const menuOptions = inject(
  'menuOptions',
  computed(() => [])
) as import('vue').Ref<MenuOption[]>;

const desc = computed(() => {
  const found = menuOptions.value.find((item) => item.key === route.path);
  return found?.desc || '';
});

// 过滤出配置相关的菜单项
const configMenuItems = computed(() => {
  const serverId = route.params.id;
  if (!serverId) return [];

  // 返回除了当前config页面和根目录之外的所有服务器相关页面
  return menuOptions.value.filter((item) => {
    const key = item.key;
    return key !== '/' && key.includes(`/servers/${serverId}`) && key !== route.path; // 排除当前页面
  });
});

const navigateToMenuItem = (key: string) => {
  router.push(key);
};

const getIconForMenuItem = (key: string) => {
  const menuItem = menuOptions.value.find((item) => item.key === key);
  if (menuItem?.icon && typeof menuItem.icon === 'function') {
    try {
      return menuItem.icon;
    } catch (error) {
      console.warn('Error rendering menu icon:', error);
    }
  }
  // 返回默认图标
  return SettingsOutline;
};

const getCardSpan = (title: string) => {
  return title.length > 4 ? 2 : 1;
};
</script>

<style scoped lang="less">
.desc-card {
  margin-bottom: 24px;
}

.config-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.2s var(--n-bezier);

  &:hover {
    transform: translateY(-2px);

    :deep(.n-card__header-extra .n-icon) {
      transform: scale(1.1);
      color: var(--n-primary-color-hover);
    }
  }

  &:active {
    transform: translateY(0);
  }

  :deep(.n-card__header-extra .n-icon) {
    color: var(--n-primary-color);
    transition: all 0.2s var(--n-bezier);
  }
}

.empty-state {
  margin-top: 60px;
}

@media (max-width: 768px) {
  .empty-state {
    margin-top: 40px;
  }

  .config-card:hover {
    transform: translateY(-1px);
  }
}

@media (max-width: 480px) {
  .empty-state {
    margin-top: 30px;
  }

  .config-card:hover {
    transform: none;
  }
}
</style>
