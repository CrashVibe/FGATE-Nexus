// 适配器组件映射工具
import type { Component } from 'vue';
import type {
    AdapterUnionType,
    OnebotAdapterUnion,
    WebSocketAdapterUnion
} from '~/server/shared/types/adapters/adapter';

// 动态导入组件
const AdapterOnebotCard = defineAsyncComponent(() => import('@/components/Card/Adapter/OnebotCard.vue'));

// 适配器类型映射表
export const adapterComponentMap: Record<string, Component> = {
    onebot: AdapterOnebotCard
    // 未来可扩展其他类型
    // 'other': AdapterOtherCard,
};

// 获取适配器对应的组件
export function getAdapterComponent(adapterType: string): Component | null {
    return adapterComponentMap[adapterType] || null;
}

// 类型守卫函数
export function isOnebotAdapter(adapter: AdapterUnionType): adapter is OnebotAdapterUnion {
    return adapter.type === 'onebot';
}

export function isWebSocketAdapter(adapter: AdapterUnionType): adapter is WebSocketAdapterUnion {
    return adapter.type === 'websocket';
}

// 验证适配器类型是否支持
export function isSupportedAdapterType(type: string): boolean {
    return type in adapterComponentMap;
}

// 获取所有支持的适配器类型
export function getSupportedAdapterTypes(): string[] {
    return Object.keys(adapterComponentMap);
}

// 适配器类型的显示名称映射
export const adapterTypeDisplayNames: Record<string, string> = {
    onebot: 'OneBot 协议',
    websocket: 'WebSocket 协议'
    // 未来可扩展
    // 'other': '其他协议',
};

// 获取适配器类型的显示名称
export function getAdapterTypeDisplayName(type: string): string {
    return adapterTypeDisplayNames[type] || type;
}
