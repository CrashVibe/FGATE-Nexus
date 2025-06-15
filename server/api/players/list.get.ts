import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { players, servers, social_accounts } from '@/server/database/schema';
import type { Player, EnhancedPlayer } from '~/server/shared/types/player/player';
import type { ApiResponse } from '~/server/shared/types/server/api';
import type { InferSelectModel } from 'drizzle-orm';

type ServerRecord = InferSelectModel<typeof servers>;
type SocialAccountRecord = InferSelectModel<typeof social_accounts>;

export default defineEventHandler(async (): Promise<ApiResponse<EnhancedPlayer[]>> => {
    try {
        // 获取所有玩家数据
        const playersData = await db.select().from(players);

        // 获取所有服务器数据，用于映射服务器ID到服务器名称
        const serversData = await db.select().from(servers);
        const serverMap = new Map(serversData.map((server: ServerRecord) => [server.id.toString(), server.name]));

        // 获取所有社交账号数据，用于映射社交账号ID到账号信息
        const socialAccountsData = await db.select().from(social_accounts);
        const socialAccountMap = new Map(
            socialAccountsData.map((account: SocialAccountRecord) => [account.id, account])
        );

        // 处理每个玩家的数据
        const enhancedPlayers: EnhancedPlayer[] = playersData.map((player: Player) => {
            // 解析服务器ID列表
            const serverIds = player.servers ? player.servers.split(',').filter(Boolean) : [];

            // 将服务器ID映射为服务器名称
            const serverNames = serverIds.map((id: string) => serverMap.get(id) || `未知服务器(${id})`);

            // 生成格式化的显示名称 "账号名称(UUID)"
            const displayName = `${player.name}(${player.uuid})`;

            // 获取社交账号信息并格式化为 "名字(UUID)"
            let socialAccountDisplay = '未绑定';
            if (player.socialAccountId) {
                const socialAccount = socialAccountMap.get(player.socialAccountId) as SocialAccountRecord | undefined;
                if (socialAccount) {
                    socialAccountDisplay = `${socialAccount.name}(${socialAccount.uiuid})`;
                }
            }

            return {
                ...player,
                serverNames,
                displayName,
                socialAccountDisplay
            };
        });

        return { success: true, message: '获取玩家列表成功', data: enhancedPlayers };
    } catch (err) {
        return { success: false, message: '获取玩家列表失败: ' + String(err), data: undefined };
    }
});
