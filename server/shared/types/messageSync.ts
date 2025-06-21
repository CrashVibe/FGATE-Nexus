export interface FilterRule {
    id?: string;
    keyword: string;
    replacement: string;
    direction: 'both' | 'mcToQq' | 'qqToMc';
    matchMode: 'exact' | 'contains' | 'regex';
    enabled: boolean;
}

export interface MessageSyncConfig {
    enabled: boolean;
    mcToQq: boolean;
    qqToMc: boolean;
    groupIds: string[];
    mcToQqTemplate: string;
    qqToMcTemplate: string;
    filterRules: FilterRule[];
}

export interface MessageSyncResponse {
    config: MessageSyncConfig;
}

// 消息队列相关类型
export interface QueuedMessage {
    id: string;
    serverId: string;
    type: 'mc_to_qq' | 'qq_to_mc';
    content: string;
    sender: string;
    timestamp: number;
    processed: boolean;
}

export interface MinecraftChatMessage {
    player: string;
    message: string;
    timestamp?: number;
}

export interface OneBotMessage {
    groupId: string;
    userId: string;
    message: string;
    timestamp?: number;
    rawData?: Record<string, unknown>;
}

export interface MessageQueue {
    messages: QueuedMessage[];
    maxSize: number;
}
