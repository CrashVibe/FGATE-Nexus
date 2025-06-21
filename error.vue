<template>
  <n-config-provider :theme="theme">
    <div class="error-page">
      <!-- Canvas 动态背景 -->
      <canvas ref="canvasRef" class="background-canvas" />

      <div class="error-container">
        <!-- 404 动画图标 -->
        <div class="error-icon">
          <n-icon size="120" :color="themeVars.primaryColor">
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"
              />
            </svg>
          </n-icon>
          <n-text class="error-code">404</n-text>
        </div>

        <!-- 错误信息 -->
        <div class="error-content">
          <div style="display: flex; flex-direction: column; align-items: center; justify-content: center">
            <n-text strong class="error-title">给我干哪来了</n-text>
            <n-text class="error-description">这里！什么也没有...一片虚无，去别处转转吧</n-text>
          </div>

          <!-- 建议操作 -->
          <div class="error-suggestions">
            <n-space vertical size="medium">
              <n-button type="primary" size="large" :loading="navigating" @click="handleGoHome">
                <template #icon>
                  <n-icon :component="HomeOutline" />
                </template>
                返回首页
              </n-button>

              <n-button quaternary size="medium" @click="handleGoBack">
                <template #icon>
                  <n-icon :component="ArrowBackOutline" />
                </template>
                返回上一页
              </n-button>
            </n-space>
          </div>
        </div>
      </div>
    </div>
  </n-config-provider>
</template>

<script setup lang="ts">
import { HomeOutline, ArrowBackOutline } from '@vicons/ionicons5';
import { darkTheme, lightTheme, useThemeVars } from 'naive-ui';
import { useDark } from '@vueuse/core';

// 设置错误页面属性
interface Props {
  error: {
    statusCode: number;
    statusMessage: string;
  };
}

const _props = defineProps<Props>();
const navigating = ref(false);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// 主题相关
const isDark = useDark({
  storageKey: 'vueuse-color-scheme',
  selector: 'html',
  attribute: 'class',
  valueDark: 'dark',
  valueLight: 'light'
});

const theme = computed(() => {
  return isDark.value ? darkTheme : lightTheme;
});
const themeVars = useThemeVars();

// Canvas 动画相关
interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  color: string;
}

let animationId: number | null = null;
const particles: Particle[] = [];

// 页面标题
useHead({
  title: '404 - 页面未找到 | FGate'
});

// 返回首页
const handleGoHome = async () => {
  navigating.value = true;
  try {
    await navigateTo('/');
  } finally {
    navigating.value = false;
  }
};

// 返回上一页
const handleGoBack = () => {
  if (typeof window !== 'undefined' && window.history.length > 1) {
    window.history.back();
  } else {
    navigateTo('/');
  }
};

// 初始化Canvas动画
const initCanvas = () => {
  const canvas = canvasRef.value;
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  // 设置Canvas尺寸
  const resizeCanvas = () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // 创建粒子
  const createParticles = () => {
    particles.length = 0;
    const particleCount = Math.min(50, Math.floor((canvas.width * canvas.height) / 15000));

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.5,
        vy: (Math.random() - 0.5) * 0.5,
        size: Math.random() * 3 + 1,
        opacity: Math.random() * 0.5 + 0.1,
        color: isDark.value ? '#18a058' : '#36ad6a'
      });
    }
  };

  createParticles();

  // 动画循环
  const animate = () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新和绘制粒子
    particles.forEach((particle, index) => {
      // 更新位置
      particle.x += particle.vx;
      particle.y += particle.vy;

      // 边界检查
      if (particle.x < 0 || particle.x > canvas.width) particle.vx *= -1;
      if (particle.y < 0 || particle.y > canvas.height) particle.vy *= -1;

      // 确保粒子在画布内
      particle.x = Math.max(0, Math.min(canvas.width, particle.x));
      particle.y = Math.max(0, Math.min(canvas.height, particle.y));

      // 绘制粒子
      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // 绘制连线
      particles.forEach((otherParticle, otherIndex) => {
        if (index >= otherIndex) return;

        const dx = particle.x - otherParticle.x;
        const dy = particle.y - otherParticle.y;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance < 100) {
          ctx.save();
          ctx.globalAlpha = (1 - distance / 100) * 0.2;
          ctx.strokeStyle = particle.color;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(particle.x, particle.y);
          ctx.lineTo(otherParticle.x, otherParticle.y);
          ctx.stroke();
          ctx.restore();
        }
      });
    });

    animationId = requestAnimationFrame(animate);
  };

  animate();

  // 监听主题变化，更新粒子颜色
  watch(
    () => isDark.value,
    () => {
      particles.forEach((particle) => {
        particle.color = isDark.value ? '#18a058' : '#36ad6a';
      });
    }
  );

  // 清理函数
  return () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
    }
    window.removeEventListener('resize', resizeCanvas);
  };
};

// 页面进入动画
onMounted(() => {
  const errorContainer = document.querySelector('.error-container');
  if (errorContainer) {
    errorContainer.classList.add('animate-in');
  }

  // 初始化Canvas动画
  nextTick(() => {
    initCanvas();
  });
});

// 清理动画
onUnmounted(() => {
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
});
</script>

<style scoped lang="less">
.error-page {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  overflow: hidden;
}

.background-canvas {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  z-index: 1;
  pointer-events: none;
}

.error-container {
  text-align: center;
  max-width: 600px;
  width: 100%;
  z-index: 2;
  position: relative;
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);

  &.animate-in {
    opacity: 1;
    transform: translateY(0);
  }
}

.error-icon {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 2rem;

  .error-code {
    font-size: 4rem;
    font-weight: 700;
    color: var(--n-text-color);
    margin-top: 1rem;
    line-height: 1;
    letter-spacing: -0.02em;

    // 数字闪烁动画
    animation: pulse 2s ease-in-out infinite;
  }
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.error-content {
  .error-title {
    font-size: 2rem;
    font-weight: 600;
    margin: 0 0 1rem 0;
    line-height: 1.2;
  }

  .error-description {
    font-size: 1.1rem;
    margin: 0 0 2rem 0;
    line-height: 1.5;
  }
}

.error-suggestions {
  margin: 2rem 0;
}

.quick-nav {
  margin-top: 2rem;

  :deep(.n-divider) {
    margin: 1.5rem 0 1rem 0;
  }

  :deep(.n-button) {
    transition: all 0.2s ease;

    &:hover {
      transform: translateY(-1px);
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .error-page {
    padding: 1rem;
  }

  .error-icon {
    :deep(.n-icon) {
      font-size: 80px !important;
    }

    .error-code {
      font-size: 3rem;
    }
  }

  .error-content {
    .error-title {
      font-size: 1.5rem;
    }

    .error-description {
      font-size: 1rem;
    }
  }
}

// 按钮悬停效果增强
.error-suggestions :deep(.n-button) {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(24, 160, 88, 0.3);
  }
}

// 主题适配增强
html.dark .error-page {
  .background-canvas {
    opacity: 0.8;
  }
}

html:not(.dark) .error-page {
  .background-canvas {
    opacity: 0.6;
  }
}
</style>
