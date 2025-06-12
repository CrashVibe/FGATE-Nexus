<template>
  <ServerPageWrapper>
    <!-- 页面标题 -->
    <ServerPageHeader title="服务器配置" :server-name="serverName" back-button-text="服务器列表" back-path="/" />

    <!-- 简介卡片 -->
    <n-card v-if="desc" size="small" class="desc-card">
      <n-text depth="3">{{ desc }}</n-text>
    </n-card>

    <!-- 配置选项卡片 -->
    <n-grid :cols="isMobile ? 1 : '1 600:2 900:3'" x-gap="20" y-gap="20" :item-responsive="true">
      <n-gi v-for="menuItem in configMenuItems" :key="menuItem.key" :span="getCardSpan(menuItem.label)">
        <n-card :title="menuItem.label" hoverable class="config-card" @click="navigateToMenuItem(menuItem.key)">
          <template #header-extra>
            <n-icon :component="getIconForMenuItem(menuItem.key)" size="20" />
          </template>
          <n-text depth="3">{{ menuItem.desc }}</n-text>
        </n-card>
      </n-gi>
    </n-grid>
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import { computed, inject, h } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { SettingsOutline } from '@vicons/ionicons5';
import { useBreakpoint, useMemo } from 'vooks';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/composables/useServerData';

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
  return menuOptions.value.filter(
    (item) => item.key !== '/' && item.key.includes('/servers/') && !item.key.includes('/config')
  );
});

const navigateToMenuItem = (key: string) => {
  router.push(key);
};

const getIconForMenuItem = (key: string) => {
  const menuItem = menuOptions.value.find((item) => item.key === key);
  // 如果找到了菜单项且有 icon，返回 icon 函数，否则返回默认图标
  return menuItem?.icon || (() => h('n-icon', null, { default: () => h(SettingsOutline) }));
};

// 根据标题长度决定卡片占用的列数（span值）
const getCardSpan = (title: string) => {
  // 长标题（超过4个字符）在大屏幕上占2列，短标题占1列
  // 在窄屏幕上所有卡片都占1列（由responsive breakpoints控制）
  return title.length > 4 ? 2 : 1;
};
</script>

<style scoped lang="less">
.config-card {
  height: 100%;
  cursor: pointer;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  }

  :deep(.n-card__header) {
    .n-card__header__main {
      font-weight: 500;
      font-size: 16px;
    }
  }

  :deep(.n-card__content) {
    padding-top: 8px;
  }
}

// 简介卡片样式
.desc-card {
  margin-bottom: 20px;
}

// 响应式调整
@media (max-width: 768px) {
  .config-card {
    &:hover {
      transform: none; // 移动端禁用hover变换
    }

    :deep(.n-card__header) {
      .n-card__header__main {
        font-size: 15px;
      }

      .n-card__header__extra {
        .n-icon {
          font-size: 18px;
        }
      }
    }

    :deep(.n-card__content) {
      font-size: 13px;
      line-height: 1.4;
    }
  }

  .desc-card {
    margin-bottom: 16px;

    :deep(.n-card__content) {
      font-size: 13px;
      line-height: 1.4;
    }
  }
}

@media (max-width: 480px) {
  .config-card {
    :deep(.n-card__header) {
      .n-card__header__main {
        font-size: 14px;
      }

      .n-card__header__extra {
        .n-icon {
          font-size: 16px;
        }
      }
    }

    :deep(.n-card__content) {
      font-size: 12px;
      padding-top: 6px;
    }
  }

  .desc-card {
    margin-bottom: 12px;

    :deep(.n-card__content) {
      font-size: 12px;
    }
  }
}
</style>
