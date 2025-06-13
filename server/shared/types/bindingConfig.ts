import type { ServerBindingConfig } from '~/server/utils/config/bindingConfigManager';

/**
 * 获取绑定配置的响应类型
 */
export interface GetBindingConfigResponse {
    config: ServerBindingConfig | null;
}

/**
 * 更新绑定配置的请求类型
 */
export type UpdateBindingConfigRequest = Partial<Omit<ServerBindingConfig, 'server_id' | 'createdAt' | 'updatedAt'>>;

/**
 * 更新绑定配置的响应类型
 */
export interface UpdateBindingConfigResponse {
    config: ServerBindingConfig;
}
