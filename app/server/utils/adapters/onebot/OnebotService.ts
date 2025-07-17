import { db } from '~/server/database/client';
import { onebot_adapters } from '~/server/database/schema';
import { eq } from 'drizzle-orm';
import { onebotClient } from './OnebotClient';
import type { OnebotConfig } from './OnebotClient';
class OnebotService {
    private static instance: OnebotService;
    private isInitialized = false;

    private constructor() {}

    public static getInstance(): OnebotService {
        if (!OnebotService.instance) {
            OnebotService.instance = new OnebotService();
        }
        return OnebotService.instance;
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

            const forwardAdapters: Array<typeof onebot_adapters.$inferSelect> = await db
                .select()
                .from(onebot_adapters)
                .where(eq(onebot_adapters.connectionType, 'forward'))
                .execute();

            console.log(`发现 ${forwardAdapters.length} 个正向连接适配器`);

            // 为每个适配器建立连接
            for (const adapter of forwardAdapters) {
                if (adapter.enabled) {
                    await this.connectAdapter(adapter);
                } else {
                    console.log(`跳过适配器 ${adapter.adapter_id} (未启用)`);
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
                `正在连接适配器 ${adapter.adapter_id} ${adapter.host}:${adapter.port}`
            );

            const config: OnebotConfig = {
                adapterId: adapter.adapter_id,
                autoReconnect: adapter.autoReconnect,
                WsConfig: adapter.connectionType === OnebotConnectionType.Forward
                    ? {
                        host: adapter.host,
                        port: adapter.port,
                        access_token: adapter.accessToken,
                        mode: 'ws',
                        log_level: 'info'
                    }
                    : {
                        host: adapter.host,
                        port: adapter.port,
                        mode: 'ws-reverse',
                        log_level: 'info'
                    }
            };

            const success = await onebotClient.createConnection(config);

            if (success) {
                console.log(`[SUCCESS] 适配器 ${adapter.adapter_id} 连接成功`);
            } else {
                console.log(`[FAILED] 适配器 ${adapter.adapter_id} 连接失败`);
            }
        } catch (error) {
            console.error(`连接适配器 ${adapter.adapter_id} 时出错:`, error);
        }
    }
}

export const onebotService = OnebotService.getInstance();
