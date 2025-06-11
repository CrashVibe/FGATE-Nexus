<script setup lang="ts">
import type { Player } from '~/server/shared/types/player/player';
import { useRequest } from 'alova/client';
import { useMessage } from 'naive-ui';

const { playerApi } = useApi();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const players = ref<Player[]>([]);
const loading = ref(true);
const message = useMessage();

useRequest(playerApi.getPlayers())
    .onSuccess(({ data }) => {
        if (data.success && data.data) players.value = data.data;
        else players.value = [];
        if (!data.success) message.error(data.message || '获取玩家列表失败');
    })
    .onError((event) => {
        // @ts-expect-error alova event.data 结构类型推断不全
        message.error(event.data?.message || '获取玩家列表失败');
        players.value = [];
    })
    .onComplete(() => {
        loading.value = false;
    });

const pageSizeOptions = [5, 10, 20, 50].map((n) => ({ label: `${n}/页`, value: n }));

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return players.value;
    return players.value.filter((p) => p.name.toLowerCase().includes(q) || p.uuid.toLowerCase().includes(q));
});

const paginated = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filtered.value.slice(start, start + pageSize.value);
});

watch([search, pageSize], () => {
    page.value = 1;
});

const columns = [
    { title: '玩家名', key: 'name' },
    { title: 'UUID', key: 'uuid' },
    { title: 'IP', key: 'ip' },
    { title: '社交账号', key: 'socialAccounts' },
    { title: '所在服务器', key: 'servers' },
    { title: '更新时间', key: 'updatedAt' }
];
</script>

<template>
    <div class="page-container">
        <n-space align="center" justify="space-between" style="margin-bottom: 16px">
            <n-input v-model:value="search" placeholder="搜索玩家名或UUID" style="width: 300px" />
            <n-select v-model:value="pageSize" :options="pageSizeOptions" style="width: 100px" />
        </n-space>
        <n-data-table :columns="columns" :data="paginated" :pagination="false" />
        <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(filtered.length / pageSize)"
            :page-size="pageSize"
            style="margin-top: 16px"
        />
    </div>
</template>
