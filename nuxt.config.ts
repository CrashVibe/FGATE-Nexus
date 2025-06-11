import AutoImport from 'unplugin-auto-import/vite';
import { NaiveUiResolver } from 'unplugin-vue-components/resolvers';
import Components from 'unplugin-vue-components/vite';

export default defineNuxtConfig({
    compatibilityDate: 'latest',
    devtools: { enabled: process.env.NODE_ENV !== 'production' },
    ssr: false,
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
    modules: ['nuxtjs-naive-ui'],
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
            target: 'esnext',
            minify: process.env.NODE_ENV === 'production' ? 'esbuild' : false,
            cssCodeSplit: true,
            sourcemap: process.env.NODE_ENV !== 'production'
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
        minify: process.env.NODE_ENV === 'production',
        compressPublicAssets: process.env.NODE_ENV === 'production',
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
        transpile: ['@vue/compiler-dom']
    }
});
