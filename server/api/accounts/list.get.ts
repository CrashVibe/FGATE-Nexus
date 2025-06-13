import { defineEventHandler } from 'h3';
import { db } from '@/server/database/client';
import { social_accounts } from '@/server/database/schema';
import type { SocialAccount } from '~/server/shared/types/account/account';
import type { ApiResponse } from '~/server/shared/types/server/api';

export default defineEventHandler(async (): Promise<ApiResponse<SocialAccount[]>> => {
    try {
        const data = await db.select().from(social_accounts);
        return { success: true, message: '获取账号列表成功', data };
    } catch (err) {
        return { success: false, message: '获取账号列表失败: ' + String(err) };
    }
});
