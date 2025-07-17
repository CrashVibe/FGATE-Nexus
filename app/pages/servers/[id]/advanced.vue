<template>
  <ServerPageWrapper>
    <!-- 页面标题 -->
    <ServerPageHeader title="高级配置" :server-name="serverName" />

    <!-- 高级配置内容 -->
    <AdvancedConfig :server-id="serverId" />
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import AdvancedConfig from '~/components/Config/AdvancedConfig.vue';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/app/composables/useServerData';

definePageMeta({
  layout: 'servere-edit'
});

const { serverId, serverName } = useServerData();
</script>
