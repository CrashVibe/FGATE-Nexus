<template>
  <div class="header">
    <n-space
      :justify="isMobile ? 'center' : 'space-between'"
      :align="isMobile ? 'stretch' : 'center'"
      :vertical="isMobile"
      :size="isMobile ? 'small' : 'medium'"
    >
      <div class="title-section" :class="{ 'mobile-center': isMobile }">
        <n-text tag="h1" :style="{ fontSize: isMobile ? '20px' : '24px', margin: 0 }">{{ title }}</n-text>
        <n-text depth="3" :size="isMobile ? 'small' : 'medium'">{{ serverName }}</n-text>
      </div>
      <n-button quaternary :size="isMobile ? 'medium' : 'large'" :block="isMobile" @click="goBack">
        <template #icon>
          <n-icon :component="ArrowBackOutline" />
        </template>
        {{ isMobile ? '返回' : backButtonText || '返回配置总览' }}
      </n-button>
    </n-space>
  </div>
</template>

<script setup lang="ts">
import { ArrowBackOutline } from '@vicons/ionicons5';
import { useRouter } from 'vue-router';
import { useBreakpoint, useMemo } from 'vooks';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

interface Props {
  title: string;
  serverName?: string;
  backButtonText?: string;
  backPath?: string;
}

const props = withDefaults(defineProps<Props>(), {
  serverName: '',
  backButtonText: '返回配置总览',
  backPath: '/servers/[id]/config'
});

const router = useRouter();

const goBack = () => {
  // 如果 backPath 包含 [id]，则使用当前路由的 id 参数替换
  if (props.backPath.includes('[id]')) {
    const currentRoute = router.currentRoute.value;
    const serverId = currentRoute.params.id;
    const targetPath = props.backPath.replace('[id]', serverId as string);
    router.push(targetPath);
  } else {
    router.push(props.backPath);
  }
};
</script>

<style scoped lang="less">
.header {
  margin-bottom: 24px;
}

.title-section {
  &.mobile-center {
    text-align: center;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .header {
    margin-bottom: 16px;
  }
}

@media (max-width: 480px) {
  .header {
    margin-bottom: 12px;
  }
}
</style>
