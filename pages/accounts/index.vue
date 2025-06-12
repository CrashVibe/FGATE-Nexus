<script setup lang="ts">
import type { SocialAccount } from '~/server/shared/types/account/account';
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
const { accountApi } = useApi();

const search = ref('');
const page = ref(1);
const pageSize = ref(10);
const accounts = ref<SocialAccount[]>([]);
const loading = ref(true);
const message = useMessage();
const pageSizeOptions = [5, 10, 20, 50].map((n) => ({ label: `${n}/页`, value: n }));

useRequest(accountApi.getAccounts())
  .onSuccess(({ data }) => {
    if (data.success && data.data) accounts.value = data.data;
    else accounts.value = [];
    if (!data.success) message.error(data.message || '获取账号列表失败');
  })
  .onError((event) => {
    // @ts-expect-error alova event.data 结构类型推断不全
    message.error(event.data?.message || '获取账号列表失败');
    accounts.value = [];
  })
  .onComplete(() => {
    loading.value = false;
  });

const filtered = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return accounts.value;
  return accounts.value.filter((a) => a.name.toLowerCase().includes(q) || a.uiuid.toLowerCase().includes(q));
});

const paginated = computed(() => {
  const start = (page.value - 1) * pageSize.value;
  return filtered.value.slice(start, start + pageSize.value);
});

watch([search, pageSize], () => {
  page.value = 1;
});

const columns = [
  { title: '适配器类型', key: 'adapterType', width: isMobile.value ? undefined : 120 },
  { title: '名称', key: 'name', ellipsis: { tooltip: true } },
  { title: 'UIUID', key: 'uiuid', ellipsis: { tooltip: true } },
  {
    title: '创建时间',
    key: 'createdAt',
    width: isMobile.value ? undefined : 150,
    render: (row: SocialAccount) => {
      if (!row.createdAt) return '-';
      return new Date(row.createdAt).toLocaleDateString('zh-CN');
    }
  },
  {
    title: '更新时间',
    key: 'updatedAt',
    width: isMobile.value ? undefined : 150,
    render: (row: SocialAccount) => {
      if (!row.updatedAt) return '-';
      return new Date(row.updatedAt).toLocaleDateString('zh-CN');
    }
  }
];
</script>

<template>
  <div class="page-container">
    <div class="accounts-page">
      <!-- 页面标题 -->
      <div class="page-header">
        <n-text strong>
          <h1>社交账号管理</h1>
          <p>管理已绑定的社交账号，查看账号详细信息。</p>
        </n-text>
      </div>

      <!-- 搜索和筛选区域 -->
      <div class="search-controls" :class="{ 'mobile-layout': isMobile }">
        <div class="search-section">
          <n-input
            v-model:value="search"
            placeholder="搜索名称或UIUID"
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
          :scroll-x="isMobile ? 600 : undefined"
          :single-line="false"
          size="small"
          striped
        >
          <template #empty>
            <!-- 空状态 -->
            <n-empty
              v-if="!loading && !filtered.length"
              description="当前没有已绑定的社交账号"
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
.accounts-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 24px;
  text-align: center;

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
  .accounts-page {
    padding: 12px;
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

  /* 表格移动端优化 */
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

/* 超小屏幕优化 */
@media (max-width: 480px) {
  .accounts-page {
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
