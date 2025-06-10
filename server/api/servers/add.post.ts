import { defineEventHandler, readBody } from 'h3';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { name, token } = body;

    if (!name || !token) {
        return {
            success: false,
            message: '服务器名字和 token 是必须的'
        };
    }

    try {
        await db.insert(servers).values({
            name,
            token
        });

        return {
            success: true,
            message: '服务器添加成功'
        };
    } catch (err) {
        return {
            success: false,
            message: '添加失败: ' + String(err)
        };
    }
});
