<script setup lang="ts">
import { RefreshOutline } from '@vicons/ionicons5';
import type { EnhancedPlayer } from '~/server/shared/types/player/player';
import { useRequest } from 'alova/client';
import { useMessage } from 'naive-ui';
import { useBreakpoint, useMemo } from 'vooks';

// 响应式断点检测
function useIsMobile() {
  const breakpointRef = useBreakpoint();
  return useMemo(() => {
    return breakpointRef.value === 'xs' || breakpointRef.value === 's';
  });
}

const isMobile = useIsMobile();

const { playerApi } = useApi();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const players = ref<EnhancedPlayer[]>([]);
const loading = ref(true);
const message = useMessage();
const refreshTimer = ref<NodeJS.Timeout | null>(null);
const lastUpdateTime = ref<string>('');
const refreshing = ref(false);

function getPlayerList() {
  useRequest(playerApi.getPlayers())
    .onSuccess(({ data }) => {
      if (data.success && data.data) {
        players.value = data.data;
        lastUpdateTime.value = new Date().toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      } else {
        players.value = [];
        if (!data.success) message.error(data.message || '获取玩家列表失败');
      }
    })
    .onError(() => {
      message.error('获取玩家列表失败');
      players.value = [];
    })
    .onComplete(() => {
      loading.value = false;
    });
}

const handleRefresh = () => {
  refreshing.value = true;
  useRequest(playerApi.getPlayers())
    .onSuccess(() => {
      getPlayerList();
      message.success('刷新成功');
    })
    .onError(() => {
      message.error('刷新失败');
    })
    .onComplete(() => {
      refreshing.value = false;
    });
};

onMounted(() => {
  getPlayerList();
  refreshTimer.value = setInterval(() => {
    getPlayerList();
  }, 1000);
});

onUnmounted(() => {
  if (refreshTimer.value) {
    clearInterval(refreshTimer.value);
    refreshTimer.value = null;
  }
});

const pageSizeOptions = [5, 10, 20, 50].map((n) => ({ label: `${n}/页`, value: n }));

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return players.value;
  return players.value.filter(
    (p: EnhancedPlayer) => p.name.toLowerCase().includes(q) || p.uuid.toLowerCase().includes(q)
  );
});

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

watch([search, pageSize], () => {
  page.value = 1;
});

const columns = computed(() => [
  {
    title: '玩家名',
    key: 'name',
    ellipsis: { tooltip: true },
    minWidth: isMobile.value ? undefined : 120
  },
  {
    title: 'UUID',
    key: 'uuid',
    ellipsis: { tooltip: true },
    width: isMobile.value ? undefined : 320
  },
  { title: 'IP', key: 'ip', width: isMobile.value ? undefined : 140 },
  {
    title: '社交账号',
    key: 'socialAccountDisplay',
    width: isMobile.value ? undefined : 200,
    ellipsis: { tooltip: true },
    render: (row: EnhancedPlayer) => {
      return row.socialAccountDisplay;
    }
  },
  {
    title: '所在服务器',
    key: 'serverNames',
    width: isMobile.value ? undefined : 200,
    ellipsis: { tooltip: true },
    render: (row: EnhancedPlayer) => {
      if (!row.serverNames || row.serverNames.length === 0) {
        return '无';
      }
      return row.serverNames.join(', ');
    }
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: isMobile.value ? undefined : 180,
    render: (row: EnhancedPlayer) => {
      if (!row.updatedAt) return '-';
      return new Date(row.updatedAt).toLocaleDateString('zh-CN');
    }
  }
]);
</script>

<template>
  <div class="page-container">
    <div class="players-page">
      <!-- 页面标题 -->
      <div class="page-header">
        <div class="head-text" :class="{ 'mobile-layout': isMobile }">
          <div class="title-section">
            <n-text strong>
              <h1>玩家管理</h1>
              <p>查看和管理服务器中的玩家信息。</p>
              <p v-if="lastUpdateTime" class="last-update">最后更新: {{ lastUpdateTime }}</p>
            </n-text>
          </div>
          <div class="action-section">
            <n-space
              :vertical="isMobile"
              :size="isMobile ? 'small' : 'medium'"
              :wrap="!isMobile"
              :justify="isMobile ? 'center' : 'end'"
            >
              <n-button
                noborder
                :size="isMobile ? 'medium' : 'medium'"
                :loading="refreshing"
                :block="isMobile"
                @click="handleRefresh"
              >
                <template #icon>
                  <n-icon>
                    <RefreshOutline />
                  </n-icon>
                </template>
                刷新列表
              </n-button>
            </n-space>
          </div>
        </div>
      </div>

      <!-- 搜索和筛选区域 -->
      <div class="search-controls" :class="{ 'mobile-layout': isMobile }">
        <div class="search-section">
          <n-input
            v-model:value="search"
            placeholder="搜索玩家名或UUID"
            clearable
            :style="{ width: isMobile ? '100%' : '300px' }"
          >
            <template #prefix>
              <n-icon size="16">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5A6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5S14 7.01 14 9.5S11.99 14 9.5 14z"
                  />
                </svg>
              </n-icon>
            </template>
          </n-input>
        </div>
        <div class="controls-section">
          <n-select
            v-model:value="pageSize"
            :options="pageSizeOptions"
            :style="{ width: isMobile ? '100%' : '120px' }"
          />
        </div>
      </div>

      <!-- 数据展示区域 -->
      <div class="data-section">
        <n-data-table
          :columns="columns"
          :data="paginated"
          :pagination="false"
          :loading="loading"
          :scroll-x="isMobile ? 700 : undefined"
          :single-line="false"
          size="small"
          striped
        >
          <template #empty>
            <!-- 空状态 -->
            <n-empty
              v-if="!loading && !filtered.length"
              description="暂无玩家数据"
              style="margin: 40px auto; text-align: center"
            >
              <template #icon>
                <n-icon size="48">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                    <path
                      fill="currentColor"
                      d="M12 2C13.1 2 14 2.9 14 4C14 5.1 13.1 6 12 6C10.9 6 10 5.1 10 4C10 2.9 10.9 2 12 2ZM21 9V7L15 1H5C3.89 1 3 1.89 3 3V21C3 22.11 3.89 23 5 23H19C20.11 23 21 22.11 21 21V9M19 9H14V4H5V21H19V9Z"
                    />
                  </svg>
                </n-icon>
              </template>
            </n-empty>
          </template>
        </n-data-table>

        <!-- 分页 -->
        <div class="pagination-section">
          <n-pagination
            v-model:page="page"
            :page-count="Math.ceil(filtered.length / pageSize)"
            :page-size="pageSize"
            :page-slot="isMobile ? 5 : 7"
            :show-size-picker="!isMobile"
            :show-quick-jumper="!isMobile"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped lang="less">
.players-page {
  max-width: 1600px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;

  .head-text {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    &.mobile-layout {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;

      .title-section {
        text-align: center;
      }

      .action-section {
        width: 100%;

        :deep(.n-space) {
          width: 100%;

          &.n-space--vertical {
            .n-space-item {
              width: 100%;

              .n-button {
                width: 100%;
                justify-content: center;
              }
            }
          }

          &:not(.n-space--vertical) {
            justify-content: center;

            .n-space-item {
              flex: 1;

              .n-button {
                width: 100%;
              }
            }
          }
        }
      }

      h1 {
        margin: 0;
      }
    }

    p {
      margin: 0;
      color: #666;
      font-size: 14px;
    }

    .last-update {
      font-size: 12px;
      color: #999;
      margin-top: 4px;
    }
  }

  h1 {
    margin: 0 0 8px 0;
    font-size: 24px;
    color: var(--text-color-1);
  }

  p {
    margin: 0;
    color: var(--text-color-3);
    font-size: 14px;
  }
}

.search-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;

  &.mobile-layout {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;

    .search-section {
      order: 1;
    }

    .controls-section {
      order: 2;
    }
  }

  .search-section {
    flex: 1;
    min-width: 200px;
  }

  .controls-section {
    flex-shrink: 0;
  }
}

.data-section {
  .pagination-section {
    margin-top: 16px;
    display: flex;
    justify-content: center;
  }
}

/* 移动端优化 */
@media (max-width: 768px) {
  .players-page {
    padding: 12px;
    max-width: 100vw;
  }

  .page-header {
    margin-bottom: 16px;

    h1 {
      font-size: 20px;
    }

    p {
      font-size: 13px;
    }
  }

  .search-controls {
    margin-bottom: 16px;
  }

  :deep(.n-data-table) {
    .n-data-table-th,
    .n-data-table-td {
      padding: 8px 4px !important;
      font-size: 12px !important;
    }

    .n-data-table-th {
      font-weight: 600 !important;
    }
  }
}

@media (max-width: 480px) {
  .players-page {
    padding: 8px;
  }

  .page-header {
    h1 {
      font-size: 18px;
    }

    p {
      font-size: 12px;
    }
  }

  :deep(.n-data-table) {
    .n-data-table-th,
    .n-data-table-td {
      padding: 6px 2px !important;
      font-size: 11px !important;
    }
  }
}
</style>
