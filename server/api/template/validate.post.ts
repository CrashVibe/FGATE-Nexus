/**
 * 模板处理器的API端点
 * 提供模板验证、预览等功能
 */

import { templateProcessor, MESSAGE_SYNC_PLACEHOLDERS } from '~/server/utils/templateProcessor';

/**
 * 验证消息同步模板
 */
export default defineEventHandler(async (event) => {
    const method = getMethod(event);

    if (method === 'POST') {
        const body = await readBody(event);
        const { template, previewData } = body;

        if (!template || typeof template !== 'string') {
            return {
                success: false,
                message: '模板不能为空'
            };
        }

        // 验证模板
        const validation = templateProcessor.validateTemplate(template, MESSAGE_SYNC_PLACEHOLDERS);

        // 如果有预览数据，生成预览
        let preview = '';
        if (previewData) {
            try {
                const context = templateProcessor.createMessageSyncContext({
                    serverId: previewData.serverId || 1,
                    serverName: previewData.serverName || 'TestServer',
                    player: previewData.player || 'TestPlayer',
                    message: previewData.message || '这是一条测试消息',
                    timestamp: new Date(),
                    source: previewData.source || 'minecraft',
                    direction: previewData.direction || 'mcToQq',
                    groupId: previewData.groupId,
                    playerCount: previewData.playerCount || 5,
                    botId: previewData.botId
                });

                preview = templateProcessor.processTemplate(template, context);
            } catch (error) {
                preview = '预览生成失败: ' + (error instanceof Error ? error.message : '未知错误');
            }
        }

        return {
            success: true,
            validation,
            preview,
            supportedFormatters: templateProcessor.getSupportedFormatters(),
            availablePlaceholders: MESSAGE_SYNC_PLACEHOLDERS
        };
    }

    if (method === 'GET') {
        // 返回帮助信息
        return {
            success: true,
            data: {
                availablePlaceholders: MESSAGE_SYNC_PLACEHOLDERS,
                supportedFormatters: templateProcessor.getSupportedFormatters(),
                examples: {
                    mcToQq: [
                        '[MC] {player}: {message}',
                        '[{server}] {player} ({playerCount} 在线): {message}',
                        '{time:time} - {player:capitalize}: {message:truncate:100}'
                    ],
                    qqToMc: [
                        '[QQ] {player}: {message}',
                        '§e[QQ群] §f{player}: {message}',
                        '§7[{time:time}] §a{player}: §f{message:escape}'
                    ]
                },
                formattersHelp: {
                    time: '格式化为本地时间 (HH:MM:SS)',
                    date: '格式化为本地日期 (YYYY/MM/DD)',
                    datetime: '格式化为完整日期时间',
                    timestamp: '格式化为ISO时间戳',
                    upper: '转换为大写',
                    lower: '转换为小写',
                    capitalize: '首字母大写',
                    truncate: '截断文本，可指定长度 {message:truncate:50}',
                    escape: 'HTML转义，防止注入',
                    json: '转换为JSON格式'
                }
            }
        };
    }

    throw createError({
        statusCode: 405,
        statusMessage: 'Method Not Allowed'
    });
});
