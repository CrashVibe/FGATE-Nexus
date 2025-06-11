<script setup lang="ts">
import { PeopleOutline } from '@vicons/ionicons5';
import type { PlayerWithAccounts } from '~/server/shared/types/player/api';

const { playerApi } = useApi();
const message = useMessage();

const loading = ref(false);
const players = ref<PlayerWithAccounts[]>([]);

async function fetchPlayers() {
    loading.value = true;
    try {
        const res = await playerApi.getPlayers();
        if (res.success) {
            players.value = res.data;
        } else {
            message.error(res.message);
        }
    } catch (err) {
        message.error('获取玩家失败');
    } finally {
        loading.value = false;
    }
}

const accounts = computed(() =>
    players.value.flatMap((p) =>
        p.socialAccounts.map((a) => ({
            playerName: p.name,
            ...a
        }))
    )
);

onMounted(fetchPlayers);
</script>

<template>
    <div class="page-container">
        <n-text strong>
            <h1>玩家列表</h1>
        </n-text>
        <n-table :bordered="false" :single-line="false" style="margin-bottom: 24px">
            <thead>
                <tr>
                    <th>名称</th>
                    <th>UUID</th>
                    <th>IP</th>
                    <th>社交账号数量</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="player in players" :key="player.id">
                    <td>{{ player.name }}</td>
                    <td>{{ player.uuid }}</td>
                    <td>{{ player.ip }}</td>
                    <td>{{ player.socialAccounts.length }}</td>
                </tr>
            </tbody>
        </n-table>

        <n-text strong>
            <h1>社交账号列表</h1>
        </n-text>
        <n-table :bordered="false" :single-line="false">
            <thead>
                <tr>
                    <th>玩家</th>
                    <th>适配器类型</th>
                    <th>名称</th>
                    <th>UIUID</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="acc in accounts" :key="acc.id">
                    <td>{{ acc.playerName }}</td>
                    <td>{{ acc.adapterType }}</td>
                    <td>{{ acc.name }}</td>
                    <td>{{ acc.uiuid }}</td>
                </tr>
            </tbody>
        </n-table>
    </div>
</template>

<style scoped lang="less">
.page-container {
    padding: 20px;
}
</style>
