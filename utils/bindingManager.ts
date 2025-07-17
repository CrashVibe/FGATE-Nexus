import type { ServerBindingConfig } from '~/server/utils/config/bindingConfigManager';
import { Adapter } from '~/server/utils/adapters/core/types';
import { and, eq } from 'drizzle-orm';
import { db } from '~/server/database/client';
import { servers, adapters, players, social_accounts } from '~/server/database/schema';

interface PendingBinding {
    serverId: number;
    playerId: string;
    socialAccountId: string;
    adapterType: Adapter;
    code: string;
    createdAt: Date;
    expiresAt: Date;
}

interface BindingResult {
    success: boolean;
    message: string;
    code?: string;
    playerName?: string;
}

class BindingManager {
    private static instance: BindingManager;
    private pendingBindings: Map<string, PendingBinding> = new Map();
    private activeCodes: Map<string, PendingBinding> = new Map();

    private constructor() {}

    public static getInstance(): BindingManager {
        if (!BindingManager.instance) {
            BindingManager.instance = new BindingManager();
        }
        return BindingManager.instance;
    }

    /**
     * 根据配置生成验证码
     */
    private generateCode(config: ServerBindingConfig): string {
        const { codeLength, codeMode } = config;
        let chars = '';

        switch (codeMode) {
            case 'mix':
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
                break;
            case 'number':
                chars = '0123456789';
                break;
            case 'word':
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
                break;
            case 'upper':
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
                break;
            case 'lower':
                chars = 'abcdefghijklmnopqrstuvwxyz';
                break;
            default:
                chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        }

        let code = '';
        for (let i = 0; i < codeLength; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    /**
     * 清理过期的绑定
     */
    private cleanupExpiredBindings(): void {
        const now = new Date();
        for (const [key, binding] of this.pendingBindings.entries()) {
            if (binding.expiresAt < now) {
                this.pendingBindings.delete(key);
                this.activeCodes.delete(binding.code);
            }
        }
    }

    /**
     * 添加待绑定，生成验证码
     */
    async addPendingBinding(serverId: number, playerId: string, socialAccountId: string): Promise<BindingResult> {
        try {
            const configManager = BindingConfigManager.getInstance(serverId);
            const config = await configManager.getConfig();

            if (!config) {
                return {
                    success: false,
                    message: '服务器绑定配置未找到'
                };
            }

            const serverWithAdapter = await db
                .select({
                    adapterId: servers.adapter_id,
                    adapterType: adapters.type
                })
                .from(servers)
                .leftJoin(adapters, eq(servers.adapter_id, adapters.id))
                .where(eq(servers.id, serverId))
                .limit(1);

            if (serverWithAdapter.length === 0 || !serverWithAdapter[0].adapterType) {
                return {
                    success: false,
                    message: '服务器适配器配置未找到'
                };
            }

            const adapterType = serverWithAdapter[0].adapterType;

            this.cleanupExpiredBindings();

            const bindingKey = `${serverId}_${playerId}`;

            if (this.pendingBindings.has(bindingKey)) {
                const existing = this.pendingBindings.get(bindingKey)!;
                if (existing.expiresAt > new Date()) {
                    return {
                        success: true,
                        message: '验证码已生成，请使用现有验证码',
                        code: existing.code
                    };
                } else {
                    this.pendingBindings.delete(bindingKey);
                    this.activeCodes.delete(existing.code);
                }
            }

            let code: string;
            let attempts = 0;
            do {
                code = this.generateCode(config);
                attempts++;
                if (attempts > 100) {
                    return {
                        success: false,
                        message: '生成验证码失败，请重试'
                    };
                }
            } while (this.activeCodes.has(code));

            const now = new Date();
            const expiresAt = new Date(now.getTime() + config.codeExpire * 60 * 1000);

            const binding: PendingBinding = {
                serverId,
                playerId,
                socialAccountId,
                adapterType,
                code,
                createdAt: now,
                expiresAt
            };

            this.pendingBindings.set(bindingKey, binding);
            this.activeCodes.set(code, binding);

            return {
                success: true,
                message: '验证码生成成功',
                code
            };
        } catch (error) {
            console.error('添加待绑定失败:', error);
            return {
                success: false,
                message: '服务器内部错误'
            };
        }
    }

    /**
     * 处理消息匹配，检查是否为绑定指令
     */
    async handleMessage(
        serverId: number,
        display_name: string,
        message: string,
        socialAccountId: string
    ): Promise<BindingResult> {
        try {
            const configManager = BindingConfigManager.getInstance(serverId);
            const config = await configManager.getConfig();

            if (!config) {
                return {
                    success: false,
                    message: '服务器配置未找到'
                };
            }

            const { prefix } = config;

            if (!message.startsWith(prefix)) {
                return {
                    success: false,
                    message: '消息格式不匹配'
                };
            }

            const code = message.substring(prefix.length).trim();

            if (!code) {
                return {
                    success: false,
                    message: '请提供验证码'
                };
            }

            this.cleanupExpiredBindings();

            const binding = this.activeCodes.get(code);
            if (!binding) {
                return {
                    success: false,
                    message:
                        config.bindFailMsg?.replace('#user', '未知玩家').replace('#why', '验证码无效或已过期') ||
                        '验证码无效或已过期'
                };
            }

            if (binding.serverId !== serverId) {
                return {
                    success: false,
                    message:
                        config.bindFailMsg
                            ?.replace('#user', binding.playerId)
                            .replace('#why', '验证码不适用于当前服务器') || '验证码不适用于当前服务器'
                };
            }

            if (binding.socialAccountId.startsWith('minecraft_')) {
                binding.socialAccountId = socialAccountId;
            } else if (binding.socialAccountId !== socialAccountId) {
                return {
                    success: false,
                    message:
                        config.bindFailMsg
                            ?.replace('#user', binding.playerId)
                            .replace('#why', '验证码不适用于当前账号') || '验证码不适用于当前账号'
                };
            }

            const bindingKey = `${serverId}_${binding.playerId}`;
            this.pendingBindings.delete(bindingKey);
            this.activeCodes.delete(code);

            await this.performBinding(display_name, binding);

            return {
                success: true,
                message: config.bindSuccessMsg?.replace('#user', binding.playerId) || '绑定成功'
            };
        } catch (error) {
            console.error('处理绑定消息失败:', error);
            return {
                success: false,
                message: '绑定失败，服务器内部错误'
            };
        }
    }

    /**
     * 执行实际的绑定操作
     */
    private async performBinding(display_name: string, binding: PendingBinding): Promise<void> {
        try {
            const socialAccountId = await this.findOrCreateSocialAccount(
                display_name,
                binding.socialAccountId,
                binding.adapterType
            );

            await db
                .update(players)
                .set({
                    socialAccountId: socialAccountId,
                    updatedAt: new Date().toISOString()
                })
                .where(eq(players.name, binding.playerId));

            console.log(
                `[SUCCESS] 绑定成功: 服务器${binding.serverId}, 玩家${binding.playerId}, 社交账号${binding.socialAccountId} -> ID:${socialAccountId}`
            );
        } catch (error) {
            console.error('执行绑定操作失败:', error);
            throw error;
        }
    }

    /**
     * 查找或创建社交账号记录
     */
    private async findOrCreateSocialAccount(
        display_name: string,
        socialAccountUuid: string,
        adapterType: Adapter
    ): Promise<number> {
        try {
            // 映射到数据库接受的类型
            let dbAdapterType: typeof Adapter.Onebot | typeof Adapter.Discord | 'minecraft';
            switch (adapterType) {
                case Adapter.Onebot:
                    dbAdapterType = Adapter.Onebot;
                    break;
                case Adapter.Discord:
                    dbAdapterType = Adapter.Discord;
                    break;
                default:
                    dbAdapterType = 'minecraft';
                    break;
            }

            const existingAccounts = await db
                .select()
                .from(social_accounts)
                .where(
                    and(eq(social_accounts.uiuid, socialAccountUuid), eq(social_accounts.adapterType, dbAdapterType))
                )
                .limit(1);

            if (existingAccounts.length > 0) {
                return existingAccounts[0].id;
            }

            const [newSocialAccount] = await db
                .insert(social_accounts)
                .values({
                    adapterType: adapterType,
                    name: display_name,
                    uiuid: socialAccountUuid
                })
                .returning();

            console.log(
                `✨ 创建新社交账号记录: ID=${newSocialAccount.id}, UUID=${socialAccountUuid}, Type=${adapterType}`
            );
            return newSocialAccount.id;
        } catch (error) {
            console.error('查找或创建社交账号失败:', error);
            throw error;
        }
    }

    /**
     * 获取待绑定信息
     */
    getPendingBinding(serverId: number, playerId: string): PendingBinding | undefined {
        const bindingKey = `${serverId}_${playerId}`;
        return this.pendingBindings.get(bindingKey);
    }

    /**
     * 移除待绑定
     */
    removePendingBinding(serverId: number, playerId: string): boolean {
        const bindingKey = `${serverId}_${playerId}`;
        const binding = this.pendingBindings.get(bindingKey);
        if (binding) {
            this.pendingBindings.delete(bindingKey);
            this.activeCodes.delete(binding.code);
            return true;
        }
        return false;
    }

    /**
     * 获取所有待绑定（用于调试）
     */
    getAllPendingBindings(): PendingBinding[] {
        this.cleanupExpiredBindings();
        return Array.from(this.pendingBindings.values());
    }

    /**
     * 处理解绑消息
     */
    async handleUnbindMessage(serverId: number, message: string, socialAccountId: string): Promise<BindingResult> {
        try {
            const configManager = BindingConfigManager.getInstance(serverId);
            const config = await configManager.getConfig();

            if (!config) {
                return {
                    success: false,
                    message: '服务器配置未找到'
                };
            }

            if (!config.allowUnbind) {
                return {
                    success: false,
                    message: '该服务器不允许解绑'
                };
            }

            let playerName = '';

            if (config.unbindPrefix && config.unbindPrefix.trim() && message.startsWith(config.unbindPrefix)) {
                playerName = message.substring(config.unbindPrefix.length).trim();
            } else if (message.startsWith(config.prefix)) {
                playerName = message.substring(config.prefix.length).trim();
            } else {
                return {
                    success: false,
                    message: '消息格式不匹配'
                };
            }

            if (!playerName) {
                return {
                    success: false,
                    message: '请提供要解绑的玩家名称'
                };
            }

            const unbindResult = await this.performUnbind(serverId, playerName, socialAccountId);

            if (unbindResult) {
                return {
                    success: true,
                    message: config.unbindSuccessMsg?.replace('#user', playerName) || '解绑成功',
                    playerName: playerName
                };
            } else {
                return {
                    success: false,
                    message:
                        config.unbindFailMsg
                            ?.replace('#user', playerName)
                            .replace('#why', '未找到绑定记录或无权限解绑') || '解绑失败'
                };
            }
        } catch (error) {
            console.error('处理解绑消息失败:', error);
            return {
                success: false,
                message: '解绑失败，服务器内部错误'
            };
        }
    }

    /**
     * 执行实际的解绑操作
     */
    private async performUnbind(serverId: number, playerName: string, socialAccountUuid: string): Promise<boolean> {
        try {
            const socialAccountRows = await db
                .select()
                .from(social_accounts)
                .where(eq(social_accounts.uiuid, socialAccountUuid))
                .limit(1);

            if (socialAccountRows.length === 0) {
                console.log(`[FAILED] 解绑失败: 未找到社交账号 ${socialAccountUuid}`);
                return false;
            }

            const socialAccountId = socialAccountRows[0].id;

            const playerRows = await db
                .select()
                .from(players)
                .where(and(eq(players.name, playerName), eq(players.socialAccountId, socialAccountId)))
                .limit(1);

            if (playerRows.length === 0) {
                console.log(`[FAILED] 解绑失败: 玩家 ${playerName} 未绑定到社交账号 ${socialAccountUuid}`);
                return false;
            }

            const updateResult = await db
                .update(players)
                .set({
                    socialAccountId: null,
                    updatedAt: new Date().toISOString()
                })
                .where(and(eq(players.name, playerName), eq(players.socialAccountId, socialAccountId)))
                .returning();

            if (updateResult.length > 0) {
                console.log(`[SUCCESS] 解绑成功: 玩家 ${playerName} 已从社交账号 ${socialAccountUuid} 解绑`);
                return true;
            } else {
                console.log(`[FAILED] 解绑失败: 数据库更新失败`);
                return false;
            }
        } catch (error) {
            console.error(`[FAILED] 执行解绑操作失败:`, error);
            return false;
        }
    }
}

export const bindingManager = BindingManager.getInstance();
