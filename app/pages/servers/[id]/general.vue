<template>
  <ServerPageWrapper>
    <!-- 页面标题 -->
    <ServerPageHeader title="基础设置" :server-name="serverName" />

    <!-- 基础设置内容 -->
    <GeneralConfig :server-id="serverId" />
  </ServerPageWrapper>
</template>

<script setup lang="ts">
import GeneralConfig from '~/components/Config/GeneralConfig.vue';
import ServerPageWrapper from '~/components/Layout/ServerPageWrapper.vue';
import ServerPageHeader from '~/components/Layout/ServerPageHeader.vue';
import { useServerData } from '~/app/composables/useServerData';

definePageMeta({
  layout: 'servere-edit'
});

const { serverId, serverName } = useServerData();
</script>
