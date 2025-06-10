<script setup lang="ts">
import { darkTheme, lightTheme } from 'naive-ui';
import { ref, watchEffect, onMounted } from 'vue';
import './assets/css/index.less';
import { useDark } from '@vueuse/core';

const isDark = useDark();

const theme = ref(isDark.value ? darkTheme : lightTheme);

watchEffect(() => {
    theme.value = isDark.value ? darkTheme : lightTheme;
});

const themeOverrides = {
    Card: {
        borderRadius: '12px'
    },
    Button: {
        borderRadius: '8px'
    }
};

// 创建Loading Bar的ref
const loadingBarRef = ref();

// 路由监听和Loading Bar控制
onMounted(() => {
    console.log('🎯 App mounted');

    const router = useRouter();
    let isNavigating = false;

    // 等待loading bar准备好
    nextTick(() => {
        setTimeout(() => {
            // 安全调用loading bar方法
            const safeCall = (method: string) => {
                try {
                    if (loadingBarRef.value && typeof loadingBarRef.value[method] === 'function') {
                        loadingBarRef.value[method]();
                        return true;
                    }
                } catch (error) {
                    console.warn(`⚠️ Error calling loadingBar.${method}:`, error);
                }
                return false;
            };

            // 路由开始时显示Loading Bar
            router.beforeEach((to, from) => {
                if (to.path !== from.path && !isNavigating) {
                    isNavigating = true;
                    safeCall('start');
                }
                return true;
            });

            // 路由完成时隐藏Loading Bar
            router.afterEach(() => {
                if (isNavigating) {
                    // 短暂延迟确保页面渲染完成
                    setTimeout(() => {
                        safeCall('finish');
                        isNavigating = false;
                    }, 100);
                }
            });

            // 路由错误时显示错误状态
            router.onError((error) => {
                console.error('❌ Router error:', error);
                safeCall('error');
                isNavigating = false;
            });


            // 测试loading bar
            setTimeout(() => {
                if (safeCall('start')) {
                    setTimeout(() => {
                        safeCall('finish');
                    }, 1000);
                }
            }, 2000);
        }, 300);
    });
});
</script>

<template>
    <n-config-provider :theme="theme" :theme-overrides="themeOverrides">
        <n-loading-bar-provider ref="loadingBarRef">
            <n-message-provider>
                <n-dialog-provider>
                    <NuxtLayout>
                        <NuxtPage />
                    </NuxtLayout>
                </n-dialog-provider>
            </n-message-provider>
        </n-loading-bar-provider>
    </n-config-provider>
</template>
