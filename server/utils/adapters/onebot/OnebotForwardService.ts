// server/utils/adapters/onebot/OnebotForwardService.ts
import { db } from '~/server/database/client';
import { onebot_adapters } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { onebotForwardClient } from './OnebotForwardClient';

class OnebotForwardService {
    private static instance: OnebotForwardService;
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): OnebotForwardService {
        if (!OnebotForwardService.instance) {
            OnebotForwardService.instance = new OnebotForwardService();
        }
        return OnebotForwardService.instance;
    }

    /**
     * 初始化服务，自动连接所有配置为正向连接的适配器
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('OneBot 正向连接服务已初始化');
            return;
        }

        try {
            console.log('初始化 OneBot 正向连接服务...');

            // 查询所有配置为正向连接的适配器
            const forwardAdapters = await db
                .select()
                .from(onebot_adapters)
                .where(eq(onebot_adapters.connectionType, 'forward'))
                .execute();

            console.log(`发现 ${forwardAdapters.length} 个正向连接适配器`);

            // 为每个适配器建立连接
            for (const adapter of forwardAdapters) {
                if (adapter.enabled && adapter.forwardUrl) {
                    await this.connectAdapter(adapter);
                } else {
                    console.log(`跳过适配器 ${adapter.botId}: ${!adapter.enabled ? '未启用' : '缺少 URL'}`);
                }
            }

            this.isInitialized = true;
            console.log('OneBot 正向连接服务初始化完成');
        } catch (error) {
            console.error('OneBot 正向连接服务初始化失败:', error);
        }
    }

    /**
     * 连接单个适配器
     */
    private async connectAdapter(adapter: typeof onebot_adapters.$inferSelect): Promise<void> {
        try {
            console.log(
                `正在连接适配器 ${adapter.adapter_id} (Bot ID: ${adapter.botId || '未知'}) -> ${adapter.forwardUrl}`
            );

            const config = {
                adapterId: adapter.adapter_id,
                url: adapter.forwardUrl!,
                accessToken: adapter.accessToken || undefined,
                autoReconnect: adapter.autoReconnect ?? true,
                responseTimeout: adapter.responseTimeout
            };

            const success = await onebotForwardClient.createConnection(config);

            if (success) {
                console.log(`[SUCCESS] 适配器 ${adapter.adapter_id} 连接成功`);

                // 如果数据库中已有 botId，通知客户端设置
                if (adapter.botId) {
                    // 延迟一点时间确保连接完全建立
                    setTimeout(() => {
                        onebotForwardClient.setBotIdForAdapter(adapter.adapter_id, adapter.botId!);
                    }, 100);
                }
            } else {
                console.log(`[FAILED] 适配器 ${adapter.adapter_id} 连接失败`);
            }
        } catch (error) {
            console.error(`连接适配器 ${adapter.adapter_id} 时出错:`, error);
        }
    }

    /**
     * 重新连接所有适配器
     */
    async reconnectAll(): Promise<void> {
        console.log('重新连接所有正向适配器...');
        this.isInitialized = false;
        await this.initialize();
    }

    /**
     * 断开所有连接
     */
    async disconnectAll(): Promise<void> {
        try {
            const connections = onebotForwardClient.getAllConnections();

            for (const connection of connections) {
                if (connection.botId) {
                    onebotForwardClient.disconnect(connection.botId);
                    console.log(`断开适配器 ${connection.botId} 的连接`);
                }
            }

            console.log('所有正向连接已断开');
        } catch (error) {
            console.error('断开所有连接时出错:', error);
        }
    }

    /**
     * 获取连接状态
     */
    getConnectionStatus(): Array<{ botId: number; url: string; connected: boolean }> {
        return onebotForwardClient
            .getAllConnections()
            .filter((conn) => conn.botId !== undefined)
            .map((conn) => ({
                botId: conn.botId!,
                url: conn.url,
                connected: conn.connected
            }));
    }
}

export const onebotForwardService = OnebotForwardService.getInstance();
