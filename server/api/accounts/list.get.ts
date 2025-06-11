import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { social_accounts } from '@/server/database/schema';
import type { SocialAccountListResponse } from '@/server/shared/types/account/api';

export default defineEventHandler(async (): Promise<SocialAccountListResponse> => {
    try {
        const data = await db.select().from(social_accounts);
        return { success: true, data };
    } catch (err) {
        return { success: false, message: '获取账号列表失败: ' + String(err) };
    }
});
