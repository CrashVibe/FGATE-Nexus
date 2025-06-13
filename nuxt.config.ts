import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineNuxtConfig({
    compatibilityDate: 'latest',
    devtools: { enabled: true },
    ssr: false,

    // 全局样式配置
    css: ['~/assets/css/index.less', '~/assets/css/server-pages.less'],

    runtimeConfig: {
        public: {
            commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH || undefined
        }
    },
    experimental: {
        asyncEntry: true,
        writeEarlyHints: true
    },
    devServer: {
        host: '0.0.0.0',
        port: 3000
    },
    modules: ['nuxtjs-naive-ui', '@nuxt/eslint'],
    vite: {
        cacheDir: 'node_modules/.vite_cache',
        optimizeDeps: {
            include: ['naive-ui', 'vue', 'vue-router'],
            esbuildOptions: {
                target: 'esnext',
                keepNames: true
            }
        },
        build: {
            rollupOptions: {
                external: ['bun:sqlite']
            },
            target: 'esnext',
            minify: 'terser',
            terserOptions: {
                compress: {
                    drop_console: true,
                    drop_debugger: true,
                    pure_funcs: ['console.log']
                },
                format: {
                    comments: false
                }
            },
            cssCodeSplit: true,
            sourcemap: true
        },
        esbuild: {
            target: 'esnext'
        },
        plugins: [
            AutoImport({
                imports: [
                    {
                        'naive-ui': ['useDialog', 'useMessage', 'useNotification', 'useLoadingBar']
                    }
                ]
            }),
            Components({
                resolvers: [NaiveUiResolver()]
            })
        ]
    },
    watchers: {
        chokidar: {
            usePolling: true
        }
    },
    app: {
        pageTransition: {
            name: 'page',
            mode: 'out-in'
        },
        layoutTransition: {
            name: 'layout',
            mode: 'out-in'
        }
    },
    nitro: {
        experimental: {
            websocket: true
        },
        preset: 'bun',
        serveStatic: 'inline',
        minify: true,
        compressPublicAssets: true,
        inlineDynamicImports: true,
        watchOptions: {
            usePolling: true
        },
        node: true,
        externals: {
            inline: ['vue', '@vue/shared', '@vue/runtime-dom']
        },
        alias: {
            '@vue/runtime-dom': require.resolve('@vue/runtime-dom'),
            '@vue/shared': require.resolve('@vue/shared')
        },
        esbuild: {
            options: {
                target: 'esnext'
            }
        }
    },
    build: {
        transpile: ['@vue/compiler-dom']
    }
});
