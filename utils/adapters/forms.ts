export interface OneBotConfig {
    botId: number | null;
    accessToken: string | null;
    listenPath: string;
    responseTimeout: number;
    enabled: boolean;
}

export interface AdapterFormData {
    adapter_type: string;
    config: {
        onebot: OneBotConfig;
    };
}

export interface AdapterPayload {
    adapter_type: string;
    config?: OneBotConfig;
}