import { defineNuxtPlugin } from 'nuxt/app';
import { createAlova } from 'alova';
import VueHook from 'alova/vue';
import adapterFetch from 'alova/fetch';

export default defineNuxtPlugin(() => {
    const serverAPI = createAlova({
        baseURL: '/api',
        statesHook: VueHook,
        requestAdapter: adapterFetch(),
        responded: async (response) => ({
            ...(await response.json())
        }),
        cacheFor: null
    });

    return {
        provide: {
            serverAPI
        }
    };
});
