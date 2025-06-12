import { db } from '../../database/client';
import { eq } from 'drizzle-orm';
import { adapters as adaptersTable, onebot_adapters as onebotAdaptersTable, servers } from '../../database/schema';
import { onebotConnectionManager } from '~/server/utils/adapters/onebot/connectionManager';
import type { InferSelectModel } from 'drizzle-orm';

// 输入式接口定义
export interface AdapterUnion<T extends string, B = unknown, C = unknown> {
  id: number;
  type: T;
  adapterType: T;
  connected?: boolean;
  detail?: B;
  config?: C;
}

// onebot 类型实现
export type OnebotAdapterUnion = AdapterUnion<
  'onebot',
  InferSelectModel<typeof onebotAdaptersTable> & { connected: boolean },
  InferSelectModel<typeof onebotAdaptersTable>
>;
// 其它类型可扩展
export type OtherAdapterUnion = AdapterUnion<string>;

export type AdapterUnionType = OnebotAdapterUnion | OtherAdapterUnion;

class AdapterManager {
  private static instance: AdapterManager;

  private constructor() {}

  /**
   * 获取单例实例
   * @returns {AdapterManager} 单例实例
   */
  public static getInstance(): AdapterManager {
    if (!AdapterManager.instance) {
      AdapterManager.instance = new AdapterManager();
    }
    return AdapterManager.instance;
  }

  // 获取所有适配器配置（多类型聚合）
  async getAllAdapters(): Promise<AdapterUnionType[]> {
    const allAdapters = await db.select().from(adaptersTable).all();
    const result: AdapterUnionType[] = [];
    for (const adapter of allAdapters) {
      if (adapter.type === 'onebot') {
        const onebot = await db
          .select()
          .from(onebotAdaptersTable)
          .where(eq(onebotAdaptersTable.adapter_id, adapter.id))
          .get();
        if (onebot) {
          result.push({
            id: adapter.id,
            type: 'onebot',
            adapterType: 'onebot',
            connected: onebotConnectionManager.has(onebot.botId),
            detail: { ...onebot, connected: onebotConnectionManager.has(onebot.botId) },
            config: onebot
          });
        }
      } else {
        result.push({
          id: adapter.id,
          type: adapter.type,
          adapterType: adapter.type
        });
      }
    }
    return result;
  }

  // 获取单个适配器配置
  async getAdapter(id: number): Promise<AdapterUnionType | null> {
    const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
    if (!adapter) return null;
    if (adapter.type === 'onebot') {
      const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id)).get();
      if (onebot) {
        return {
          id: adapter.id,
          type: 'onebot',
          adapterType: 'onebot',
          connected: onebotConnectionManager.has(onebot.botId),
          detail: { ...onebot, connected: onebotConnectionManager.has(onebot.botId) },
          config: onebot
        };
      }
      return null;
    }
    return { id: adapter.id, type: adapter.type, adapterType: adapter.type };
  }

  // 通过botId获取适配器配置（仅onebot）
  async getAdapterByBotId(botId: number): Promise<AdapterUnionType | null> {
    const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.botId, botId)).get();
    if (!onebot) return null;
    const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, onebot.adapter_id)).get();
    if (!adapter) return null;
    return {
      id: adapter.id,
      type: 'onebot',
      adapterType: 'onebot',
      connected: onebotConnectionManager.has(onebot.botId),
      detail: { ...onebot, connected: onebotConnectionManager.has(onebot.botId) },
      config: onebot
    };
  }

  // 创建新适配器配置（仅onebot）
  async createAdapter(
    config: Omit<InferSelectModel<typeof onebotAdaptersTable>, 'adapter_id'> & { adapterType: string }
  ): Promise<AdapterUnionType> {
    // 先插入 adapters 主表
    const adapterRow = await db.insert(adaptersTable).values({ type: config.adapterType }).returning().get();
    // 再插入 onebot 子表
    const onebot = await db
      .insert(onebotAdaptersTable)
      .values({ ...config, adapter_id: adapterRow.id })
      .returning()
      .get();
    return {
      id: adapterRow.id,
      type: 'onebot',
      adapterType: 'onebot',
      connected: false,
      detail: { ...onebot, connected: false },
      config: onebot
    };
  }

  // 更新适配器配置（仅onebot）
  async updateAdapter(
    id: number,
    config: Partial<InferSelectModel<typeof onebotAdaptersTable>>
  ): Promise<AdapterUnionType | null> {
    const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
    if (!adapter || adapter.type !== 'onebot') return null;
    const result = await db
      .update(onebotAdaptersTable)
      .set(config)
      .where(eq(onebotAdaptersTable.adapter_id, id))
      .returning()
      .get();
    if (result) {
      onebotConnectionManager.disconnect(result.botId);
      return {
        id: id,
        type: 'onebot',
        adapterType: 'onebot',
        connected: onebotConnectionManager.has(result.botId),
        detail: { ...result, connected: onebotConnectionManager.has(result.botId) },
        config: result
      };
    }
    return null;
  }

  // 删除适配器配置（多类型）
  async deleteAdapter(id: number): Promise<boolean> {
    const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
    if (!adapter) return false;
    try {
      // 先将 servers.adapter_id 置为 null
      await db.update(servers).set({ adapter_id: null }).where(eq(servers.adapter_id, id));
      if (adapter.type === 'onebot') {
        const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id)).get();
        if (onebot) onebotConnectionManager.disconnect(onebot.botId);
        await db.delete(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id));
      }
      // 删除主表
      await db.delete(adaptersTable).where(eq(adaptersTable.id, id));
      return true;
    } catch (error) {
      console.error('Failed to delete adapter:', error);
      return false;
    }
  }

  // 启用/禁用适配器（仅onebot）
  async setAdapterStatus(id: number, enabled: boolean): Promise<boolean> {
    const adapter = await db.select().from(adaptersTable).where(eq(adaptersTable.id, id)).get();
    if (!adapter || adapter.type !== 'onebot') return false;
    try {
      await db.update(onebotAdaptersTable).set({ enabled }).where(eq(onebotAdaptersTable.adapter_id, id));
      const onebot = await db.select().from(onebotAdaptersTable).where(eq(onebotAdaptersTable.adapter_id, id)).get();
      if (onebot && !enabled) {
        onebotConnectionManager.disconnect(onebot.botId);
      }
      return true;
    } catch (error) {
      console.error('Failed to update adapter status:', error);
      return false;
    }
  }
}

export const adapterManager = AdapterManager.getInstance();
