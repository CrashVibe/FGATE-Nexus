import { onebotClient } from './OnebotClient';
import { unifiedAdapterManager } from '../core/UnifiedAdapterManager';
import { Adapter } from '../core/types';
import type { GroupMessageEvent, PrivateMessageEvent } from 'philia-onebot/types/events.js';
import type { UnifiedMessageData } from '../core/UnifiedAdapterManager';

/**
 * OneBot 适配器管理器
 * 负责接收 OneBot 消息并转发给统一管理器处理
 */
class OnebotManager {
    private static instance: OnebotManager;

    /**
     * 获取 OnebotManager 单例实例
     * @returns OnebotManager 实例
     */
    public static getInstance(): OnebotManager {
        if (!OnebotManager.instance) {
            OnebotManager.instance = new OnebotManager();
        }
        return OnebotManager.instance;
    }

    private constructor() {
        // 注册自己到统一管理器
        unifiedAdapterManager.registerAdapterReceiver(Adapter.Onebot, {
            hasConnection: (adapterId: number) => this.hasBot(adapterId),
            disconnect: (adapterId: number) => this.disconnectBot(adapterId),
            sendMessagePrivate: (adapterId: number, message: string, userId: string) => {
                try {
                    return onebotClient.sendPrivateMessageSync(adapterId, parseInt(userId), message);
                } catch (error) {
                    console.error('解析私聊消息失败:', error);
                    return false;
                }
            },
            sendMessageGroup: (adapterId: number, message: string, groupId: string) => {
                try {
                    return onebotClient.sendGroupMessageSync(adapterId, parseInt(groupId), message);
                } catch (error) {
                    console.error('解析群消息失败:', error);
                    return false;
                }
            }
        });
    }

    /**
     * 检查 OneBot 连接是否存在（仅检查连接）
     * @param adapterId 机器人 ID
     * @returns 是否存在连接
     */
    hasBot(adapterId: number): boolean {
        return onebotClient.isConnected(adapterId);
    }

    /**
     * 主动断开 OneBot 连接
     * @param adapterId 适配器 ID
     */
    disconnectBot(adapterId: number): void {
        if (adapterId !== null && adapterId !== undefined) {
            console.log(`断开 Bot ${adapterId} 的连接`);
            onebotClient.disconnect(adapterId);
        } else {
            console.log(`断开 Bot null 的连接`);
        }
    }

    /**
     * 处理 OneBot 消息
     *
     * 转换为统一格式并传递给统一管理器
     * @param adapterId 适配器 ID
     * @param message_event 消息内容
     */
    async handleBotMessage(adapterId: number, message_event: GroupMessageEvent | PrivateMessageEvent): Promise<void> {
        try {
            const unifiedMessage: UnifiedMessageData = {
                messageText: message_event.raw_message,
                senderId: message_event.sender.user_id?.toString() || '',
                senderName: message_event.sender.nickname || '',
                adapterType: Adapter.Onebot,
                adapterId: adapterId,
                messageType: message_event.message_type as 'private' | 'group',
                groupId: message_event.message_type === 'group' ? message_event.group_id.toString() : undefined,
                rawData: message_event
            };
            await unifiedAdapterManager.handleUnifiedMessage(unifiedMessage);
        } catch (error) {
            console.error('处理 OneBot 消息时发生错误:', error);
        }
    }
}

/**
 * OneBot 管理器单例实例
 * 用于全局访问 OneBot 适配器管理功能
 */
export const onebotInstance = OnebotManager.getInstance();
