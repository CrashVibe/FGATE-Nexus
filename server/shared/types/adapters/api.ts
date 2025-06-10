import type { onebot_adapters } from './adapter';

export interface AdapterResponse<T = void> {
    success: boolean;
    message: string;
    data?: T;
}

// 特定类型的响应
export type AdapterListResponse = AdapterResponse<onebot_adapters[]>;
export type AdapterActionResponse = AdapterResponse;
