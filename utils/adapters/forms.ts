export interface OneBotConfig {
    host: string;
    port: number;
    accessToken: string;
    enabled: boolean;
    connectionType: 'reverse' | 'forward';
    autoReconnect: boolean;
}

export interface AdapterFormData {
    adapter_type: string;
    config: {
        onebot?: OneBotConfig;
    };
}

// 适配器请求体 - 创建
export interface AdapterPayload {
    adapter_type: string;
    config?: OneBotConfig;
}
