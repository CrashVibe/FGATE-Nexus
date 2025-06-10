import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: 'latest',
    devtools: { enabled: true },
    ssr: false,
    runtimeConfig: {
        public: {
            commitHash: process.env.NUXT_PUBLIC_COMMIT_HASH || undefined
        }
    },
    devServer: {
        host: '0.0.0.0',
        port: 3000
    },
    modules: ['nuxtjs-naive-ui'],
    vite: {
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
        externals: {
            inline: ['vue', '@vue/shared', '@vue/runtime-dom']
        },
        alias: {
            '@vue/runtime-dom': require.resolve('@vue/runtime-dom'),
            '@vue/shared': require.resolve('@vue/shared')
        }
    },
    build: {
        transpile: [
            '@vue/compiler-dom' // 确保模块被正确转译
        ]
    }
});
