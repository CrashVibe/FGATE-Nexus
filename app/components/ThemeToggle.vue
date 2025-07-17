<template>
  <n-dropdown :options="themeOptions" trigger="click" @select="handleThemeSelect">
    <button
      style="
        border: none;
        background: transparent;
        padding: 0;
        position: relative;
        overflow: hidden;
        border-radius: 50%;
      "
    >
      <n-button quaternary circle style="pointer-events: none">
        <template #icon>
          <n-icon :component="currentThemeIcon" />
        </template>
      </n-button>
    </button>
  </n-dropdown>
  <transition name="theme-fade">
    <div
      v-if="isFading"
      class="theme-fade-overlay"
      :style="{
        background: fadeColor,
        opacity: fadeOpacity,
        transition: `opacity ${fadeDuration}ms cubic-bezier(0.4,0,0.2,1)`
      }"
    />
  </transition>
</template>

<script setup lang="ts">
import { useDark } from '@vueuse/core';
import { SunnyOutline, MoonOutline, PhonePortraitOutline } from '@vicons/ionicons5';
import { NButton, NDropdown, NIcon } from 'naive-ui';

const isDark = useDark({
  storageKey: 'vueuse-color-scheme',
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light'
});

const themeMode = ref<'light' | 'dark' | 'auto'>('auto');
const isFading = ref(false);
const fadeColor = ref('#fff');
const fadeDuration = ref(400); // ms
const fadeOpacity = ref(0);

const getTargetIsDark = (key: string) => {
  if (key === 'auto') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  }
  return key === 'dark';
};

const handleThemeSelect = (key: string) => {
  const currentIsDark = isDark.value;
  const targetIsDark = getTargetIsDark(key);
  fadeColor.value =
    currentIsDark && !targetIsDark
      ? 'rgba(245,245,250,1)'
      : !currentIsDark && targetIsDark
        ? 'rgba(19,19,22,1)'
        : currentIsDark
          ? 'rgba(19,19,22,1)'
          : 'rgba(245,245,250,1)';
  fadeDuration.value = 400;
  fadeOpacity.value = 0;
  isFading.value = true;
  // 先渐现
  setTimeout(() => {
    fadeOpacity.value = 1;
    // 渐现完成后切换主题
    setTimeout(() => {
      themeMode.value = key as 'light' | 'dark' | 'auto';
      localStorage.setItem('theme-mode', key);
      applyTheme(themeMode.value);
      // 再渐隐
      setTimeout(() => {
        fadeOpacity.value = 0;
        setTimeout(() => {
          isFading.value = false;
        }, fadeDuration.value);
      }, 100);
    }, fadeDuration.value);
  }, 10);
};

// 从 localStorage 读取主题设置
onMounted(() => {
  const stored = localStorage.getItem('theme-mode');
  if (stored && ['light', 'dark', 'auto'].includes(stored)) {
    themeMode.value = stored as 'light' | 'dark' | 'auto';
    applyTheme(themeMode.value);
  }
});

const currentThemeIcon = computed(() => {
  switch (themeMode.value) {
    case 'light':
      return SunnyOutline;
    case 'dark':
      return MoonOutline;
    default:
      return PhonePortraitOutline;
  }
});

const themeOptions = computed(() => [
  {
    label: '浅色模式',
    key: 'light',
    icon: () => h(NIcon, { component: SunnyOutline })
  },
  {
    label: '深色模式',
    key: 'dark',
    icon: () => h(NIcon, { component: MoonOutline })
  },
  {
    label: '跟随系统',
    key: 'auto',
    icon: () => h(NIcon, { component: PhonePortraitOutline })
  }
]);

const applyTheme = (mode: 'light' | 'dark' | 'auto') => {
  if (mode === 'auto') {
    // 跟随系统主题
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    isDark.value = mediaQuery.matches;

    // 监听系统主题变化
    const handleChange = (e: MediaQueryListEvent) => {
      if (themeMode.value === 'auto') {
        const currentIsDark = isDark.value;
        if (currentIsDark !== e.matches) {
          applyTheme('auto');
        }
      }
    };

    mediaQuery.addEventListener('change', handleChange);

    // 清理监听器
    onUnmounted(() => {
      mediaQuery.removeEventListener('change', handleChange);
    });
  } else {
    isDark.value = mode === 'dark';
  }
};
</script>

<style scoped>
.theme-fade-overlay {
  position: fixed;
  left: 0;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 99999;
  pointer-events: none;
  opacity: 0;
}
</style>
