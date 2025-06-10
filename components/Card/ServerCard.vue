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
            <div class="card-content">
                <div class="header">
                    <div class="name-with-status">
                        <n-text strong class="server-name">{{ server.name }}</n-text>
                        <n-tag
                            :type="server.isOnline ? 'success' : 'error'"
                            :bordered="false"
                            size="small"
                            class="status-tag"
                        >
                            {{ server.isOnline ? '在线' : '离线' }}
                        </n-tag>
                    </div>
                    <n-tag
                        :bordered="false"
                        size="small"
                        class="version-tag"
                        :type="server.isOnline ? 'default' : 'warning'"
                    >
                        {{ getVersion(server.version) }}
                    </n-tag>
                </div>

                <div class="software-info" :class="{ 'depth-3': !server.isOnline }">
                    <n-image :src="getSoftwareIcon(server.software) as string" style="width: 20px; height: 20px" />
                    <n-text :depth="server.isOnline ? 3 : 3" class="software-text">
                        {{ server.software || 'Unknown software' }}
                    </n-text>
                </div>

                <div class="token-section">
                    <div class="token-label">
                        <n-text depth="3">Token:</n-text>
                        <n-tooltip trigger="hover" placement="top">
                            <template #trigger>
                                <n-icon size="16" :depth="3" class="info-icon">
                                    <InformationCircleOutline />
                                </n-icon>
                            </template>
                            双击令牌或点击复制按钮进行复制
                        </n-tooltip>
                    </div>

                    <div class="token-display">
                        <n-input-group>
                            <n-input
                                :value="showToken ? server.token : '•'.repeat(16)"
                                readonly
                                :depth="showToken ? 3 : 2"
                                class="token-input"
                                @click="copyTokenToClipboard"
                            />
                            <n-button tertiary type="primary" @click.stop="copyTokenToClipboard">
                                <template #icon>
                                    <n-icon>
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            viewBox="0 0 24 24"
                                            width="1em"
                                            height="1em"
                                        >
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
            </div>
        </n-card>
    </transition>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { ServerWithStatus } from '~/server/shared/types/server/api';
import { InformationCircleOutline } from '@vicons/ionicons5';
import MinecraftDefaultIcon from '@/assets/icon/software/minecraft.svg';

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
        return 'Unknown version';
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
    // 不要把图标放到 assets 目录下，尽量使用 CDN 或者在线图标
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
.token-input {
    min-width: 120px;
}

.server-card {
    border-radius: 8px;
    transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);

    &.offline {
        filter: grayscale(0.3);
    }
}

.server-card:hover {
    transform: translateY(-4px);
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
    flex-direction: row;
    gap: 6px;
    flex: 1;
    min-width: 0;
    align-items: center;
}

.server-name {
    font-size: 18px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.status-tag {
    font-size: 12px;
}

.version-tag {
    font-family: monospace;
    flex-shrink: 0;
}

.software-info {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 16px;
    transition: opacity 0.3s ease;
}

.token-label {
    display: flex;
    align-items: center;
    gap: 4px;
    margin-bottom: 8px;
}

.info-icon {
    cursor: help;
}

.depth-3 {
    opacity: 0.7;
}

.token-display {
    cursor: pointer;
}

/* Card appear transition effects */
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
