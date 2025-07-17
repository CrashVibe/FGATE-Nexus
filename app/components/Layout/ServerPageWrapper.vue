<template>
  <div class="page-container">
    <transition name="content-transition" appear>
      <div class="server-page">
        <n-space vertical :size="isMobile ? 'medium' : 'large'">
          <slot />
        </n-space>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { useBreakpoint, useMemo } from 'vooks';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();
</script>

<style scoped lang="less">
.server-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .server-page {
    padding: 12px;
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .server-page {
    padding: 8px;
  }
}
</style>
