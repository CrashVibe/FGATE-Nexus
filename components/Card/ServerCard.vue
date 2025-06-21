<template>
  <transition name="card-appear" appear>
    <n-card
      hoverable
      :bordered="true"
      class="server-card"
      :class="{ offline: !server.isOnline }"
      @mouseenter="hover = true"
      @mouseleave="hover = false"
      @click="goToServerConfig"
    >
      <div class="card-content" :class="{ 'mobile-layout': isMobile }">
        <div class="header">
          <div class="name-with-status">
            <n-text strong class="server-name">{{ server.name }}</n-text>
            <n-tag
              :type="server.isOnline ? 'success' : 'error'"
              :bordered="false"
              :size="isMobile ? 'tiny' : 'small'"
              class="status-tag"
            >
              {{ server.isOnline ? '在线' : '离线' }}
            </n-tag>
          </div>
          <n-tag
            v-if="!isMobile"
            :bordered="false"
            :size="'small'"
            class="version-tag"
            :type="server.isOnline ? 'default' : 'warning'"
          >
            {{ getVersion(server.version) }}
          </n-tag>
        </div>

        <!-- 移动端合并 version-tag 到 software-info -->
        <div class="software-info" :class="{ 'depth-3': !server.isOnline, 'with-version': isMobile }">
          <n-image
            preview-disabled
            :src="getSoftwareIcon(server.software) as string"
            :style="{ width: isMobile ? '16px' : '20px', height: isMobile ? '16px' : '20px' }"
          />
          <n-text :depth="server.isOnline ? 3 : 3" class="software-text">
            {{ server.software || '未知服务器端' }}
          </n-text>
          <n-tag
            v-if="isMobile"
            :bordered="false"
            :size="'tiny'"
            class="version-tag"
            :type="server.isOnline ? 'default' : 'warning'"
            style="margin-left: 6px"
          >
            {{ getVersion(server.version) }}
          </n-tag>
        </div>

        <div class="token-section">
          <div class="token-label">
            <n-text :depth="3" :style="{ fontSize: isMobile ? '12px' : '14px' }">Token:</n-text>
            <n-tooltip trigger="hover" placement="top">
              <template #trigger>
                <n-icon :size="isMobile ? '14' : '16'" :depth="3" class="info-icon">
                  <InformationCircleOutline />
                </n-icon>
              </template>
              {{ isMobile ? '点击复制' : '双击令牌或点击复制按钮进行复制' }}
            </n-tooltip>
          </div>

          <div class="token-display">
            <n-input-group>
              <n-input
                :value="showToken ? server.token : '•'.repeat(isMobile ? 12 : 16)"
                readonly
                :depth="showToken ? 3 : 2"
                :size="isMobile ? 'small' : 'medium'"
                class="token-input"
                @click="copyTokenToClipboard"
              />
              <n-button
                tertiary
                type="primary"
                :size="isMobile ? 'small' : 'medium'"
                @click.stop="copyTokenToClipboard"
              >
                <template #icon>
                  <n-icon>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="1em" height="1em">
                      <path
                        fill="currentColor"
                        d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"
                      />
                    </svg>
                  </n-icon>
                </template>
              </n-button>
            </n-input-group>
          </div>
        </div>
        <!-- 新增底部提示 -->
        <div class="card-footer-tip">
          <n-text depth="3" style="font-size: 12px; opacity: 0.7; user-select: none"> 点击卡片查看更多信息 </n-text>
        </div>
      </div>
    </n-card>
  </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ServerWithStatus } from '~/server/shared/types/server/api';
import { InformationCircleOutline } from '@vicons/ionicons5';
import MinecraftDefaultIcon from '@/assets/icon/software/minecraft.svg';
import { useBreakpoint, useMemo } from 'vooks';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

const props = defineProps<{
  server: ServerWithStatus;
}>();

const message = useMessage();
const router = useRouter();
const showToken = ref(false);
const hover = ref(false);

const isCopying = ref(false);

const goToServerConfig = () => {
  router.push(`/servers/${props.server.id}/config`);
};

function getVersion(original: string | null): string {
  if (!original) {
    return '未知版本';
  }

  const regex = /^([\d.]+-\d+-[a-f0-9]+)\s+\(MC:\s*([^)]+)\)/;
  const match = original.match(regex);

  if (match) {
    const mcVersion = match[2];
    return 'v' + mcVersion;
  }
  return original;
}

function copyTokenToClipboard(e?: Event) {
  if (e) {
    e.stopPropagation();
  }

  if (isCopying.value) {
    message.warning('我**，这么快干什么!');
    return;
  }

  isCopying.value = true;

  navigator.clipboard
    .writeText(props.server.token)
    .then(() => {
      message.success('Token 被剪贴板带跑啦，3 秒后消失~');
      showToken.value = true;
      setTimeout(() => {
        showToken.value = false;
        isCopying.value = false;
      }, 3000);
    })
    .catch(() => {
      message.error('复制失败，小 clipboard 罢工了!');
      isCopying.value = false;
    });
}

const getSoftwareIcon = (software: string | null) => {
  switch (software) {
    case 'Paper':
      return 'https://assets.papermc.io/brand/papermc_logo.min.svg';
    case 'Leaf':
      return 'https://www.leafmc.one/logo.svg';
    case 'Leaves':
      return 'https://leavesmc.org/favicon.ico';
    case 'Purpur':
      return 'https://purpurmc.org/favicon.ico';
    case 'Spigot':
      return 'https://static.spigotmc.org/img/spigot.png';
    case 'Bukkit':
      return 'https://bukkit.org/favicon.ico';
    case 'Fabric':
      return 'https://fabricmc.net/assets/logo.png';
    case 'Canvas':
      return 'https://canvasmc.io/favicon.ico';
    case 'Velocity':
      return 'https://assets.papermc.io/brand/velocity_logo_blue.min.svg';
    default:
      return MinecraftDefaultIcon;
  }
};
</script>

<style scoped lang="less">
.server-card {
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s ease;

  &.offline {
    filter: grayscale(0.3);
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 6px 24px rgba(0, 0, 0, 0.13);
  }
}

.card-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
}

.name-with-status {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
}

.server-name {
  font-size: 18px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.software-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.card-footer-tip {
  margin-top: 8px;
  text-align: right;
}

/* 移动端优化 */
@media (max-width: 768px) {
  .card-content {
    gap: 8px;
  }

  .header {
    flex-direction: column;
    gap: 6px;
  }

  .name-with-status {
    justify-content: space-between;
  }

  .server-name {
    font-size: 16px;
  }

  .software-info {
    gap: 6px;
    margin-bottom: 12px;
  }
}

/* 卡片动画 */
.card-appear-enter-active {
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.card-appear-enter-from {
  opacity: 0;
  transform: scale(0.8) translateY(20px);
}

.card-appear-enter-to {
  opacity: 1;
  transform: scale(1) translateY(0);
}
</style>
