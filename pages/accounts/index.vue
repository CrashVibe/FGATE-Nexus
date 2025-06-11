<script setup lang="ts">
import type { SocialAccount } from '~/server/shared/types/account/account';
const { accountApi } = useApi();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const accounts = ref<SocialAccount[]>([]);
const pageSizeOptions = [5, 10, 20, 50].map((n) => ({ label: `${n}/页`, value: n }));

async function fetchList() {
    const res = await accountApi.getAccounts();
    if (res.success) accounts.value = res.data;
}

onMounted(fetchList);

const filtered = computed(() => {
    const q = search.value.trim().toLowerCase();
    if (!q) return accounts.value;
    return accounts.value.filter((a) =>
        a.name.toLowerCase().includes(q) || a.uiuid.toLowerCase().includes(q)
    );
});

const paginated = computed(() => {
    const start = (page.value - 1) * pageSize.value;
    return filtered.value.slice(start, start + pageSize.value);
});

watch([search, pageSize], () => {
    page.value = 1;
});

const columns = [
    { title: '适配器类型', key: 'adapterType' },
    { title: '名称', key: 'name' },
    { title: 'UIUID', key: 'uiuid' },
    { title: '创建时间', key: 'createdAt' },
    { title: '更新时间', key: 'updatedAt' }
];
</script>

<template>
    <div class="page-container">
        <n-space align="center" justify="space-between" style="margin-bottom:16px">
            <n-input v-model:value="search" placeholder="搜索名称或UIUID" style="width:300px" />
            <n-select v-model:value="pageSize" :options="pageSizeOptions" style="width:100px" />
        </n-space>
        <n-data-table :columns="columns" :data="paginated" :pagination="false" />
        <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(filtered.length / pageSize)"
            :page-size="pageSize"
            style="margin-top:16px"
        />
    </div>
</template>
