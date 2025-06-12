import { defineEventHandler, readBody } from 'h3';
import { db } from '@/server/database/client';
import { servers } from '@/server/database/schema';

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
    await db.insert(servers).values({
      name,
      token,
      adapter_id: body.adapter_id ?? null // 支持新建时绑定适配器
    });

    return {
      success: true,
      message: '服务器添加成功',
      data: undefined
    };
  } catch (err) {
    event.node.res.statusCode = 500;
    return {
      success: false,
      message: '添加失败: ' + String(err),
      data: undefined
    };
  }
});
