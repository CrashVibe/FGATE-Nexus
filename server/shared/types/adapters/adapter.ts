import type { InferSelectModel, InferInsertModel } from 'drizzle-orm';
import type { onebot_adapters as onebotAdaptersTable } from '~/server/database/schema';

export type onebot_adapters = InferSelectModel<typeof onebotAdaptersTable> & { connected?: boolean };
export type onebot_adaptersInsert = InferInsertModel<typeof onebotAdaptersTable>;

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

// WebSocket 适配器类型
export interface WebSocketAdapterDetail {
    url?: string;
    autoReconnect?: boolean;
    connected?: boolean;
    enabled?: boolean;
}

export type WebSocketAdapterUnion = AdapterUnion<'websocket', WebSocketAdapterDetail, WebSocketAdapterDetail>;

// 其它类型可扩展
export type OtherAdapterUnion = AdapterUnion<string>;

export type AdapterUnionType = OnebotAdapterUnion | WebSocketAdapterUnion | OtherAdapterUnion;
