import { defineEventHandler, readBody } from 'h3';
import { eq } from 'drizzle-orm';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';
import { BindingConfigManager } from '~/server/utils/config/bindingConfigManager';

export default defineEventHandler(async (event) => {
    const body = await readBody(event);

    const { name, token } = body;

    if (!name || !token) {
        event.node.res.statusCode = 400;
        return {
            success: false,
            message: '服务器名字和 token 是必须的',
            data: undefined
        };
    }
    try {
        // Check if server with same name or token already exists
        const existingServer = await db.select().from(servers).where(eq(servers.name, name)).limit(1);

        if (existingServer.length > 0) {
            event.node.res.statusCode = 400;
            return {
                success: false,
                message: '服务器名字已存在',
                data: undefined
            };
        }

        const [server] = await db
            .insert(servers)
            .values({
                name,
                token,
                adapter_id: body.adapter_id ?? null
            })
            .returning();

        // 自动创建绑定配置
        if (server && server.id) {
            const manager = BindingConfigManager.getInstance(server.id);
            await manager.updateConfig({}); // 用默认配置
        }

        return {
            success: true,
            message: '服务器添加成功',
            data: server
        };
    } catch (err) {
        console.error('Database error:', err);
        event.node.res.statusCode = 500;
        return {
            success: false,
            message: '添加失败: ' + (err instanceof Error ? err.message : String(err)),
            data: undefined
        };
    }
});
