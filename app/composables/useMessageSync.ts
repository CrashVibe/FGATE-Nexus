import type { MessageSyncConfig } from '~/server/shared/types/messageSync';

interface MessageSyncApiResponse {
    success: boolean;
    message: string;
    config?: MessageSyncConfig;
}

interface MessageSyncUpdateResponse {
    success: boolean;
    message: string;
    data?: MessageSyncConfig;
}

interface QueueStatsResponse {
    success: boolean;
    message: string;
    data?: {
        pending: number;
        failed: number;
        total: number;
    };
}

interface ConnectionStatusResponse {
    success: boolean;
    message: string;
    data?: {
        minecraft: {
            connected: boolean;
            lastSeen: Date | string | null;
            playerCount: number;
        };
        onebot: {
            connected: boolean;
            lastSeen: Date | string | null;
            groupCount: number;
        };
    };
}

interface ProcessQueueResponse {
    success: boolean;
    message: string;
    data?: {
        processed: number;
        failed: number;
    };
}

export const useMessageSync = (serverId: string | number) => {
    const { $serverAPI } = useNuxtApp();

    const getMessageSyncConfig = async () => {
        const response = await $serverAPI.Get<MessageSyncApiResponse>(`/servers/${serverId}/message-sync`);
        if (!response.success) {
            throw new Error(response.message);
        }
        return response;
    };

    const updateMessageSyncConfig = async (config: MessageSyncConfig) => {
        const response = await $serverAPI.Put<MessageSyncUpdateResponse>(`/servers/${serverId}/message-sync`, config);
        if (!response.success) {
            throw new Error(response.message);
        }
        return response;
    };

    const getQueueStats = async () => {
        const response = await $serverAPI.Get<QueueStatsResponse>(`/servers/${serverId}/message-queue-stats`);
        if (!response.success) {
            throw new Error(response.message);
        }
        return response;
    };

    const getConnectionStatus = async () => {
        const response = await $serverAPI.Get<ConnectionStatusResponse>(`/servers/${serverId}/connection-status`);
        if (!response.success) {
            throw new Error(response.message);
        }
        return response;
    };

    const processMessageQueue = async () => {
        const response = await $serverAPI.Post<ProcessQueueResponse>(`/servers/${serverId}/process-message-queue`, {});
        if (!response.success) {
            throw new Error(response.message);
        }
        return response;
    };

    return {
        getMessageSyncConfig,
        updateMessageSyncConfig,
        getQueueStats,
        getConnectionStatus,
        processMessageQueue
    };
};
