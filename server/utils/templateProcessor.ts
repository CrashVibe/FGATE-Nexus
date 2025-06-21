/**
 * 强大的模板占位符处理器
 * 支持动态占位符、默认值、格式化函数等高级功能
 */

export interface TemplateContext {
    // 基础变量
    player?: string;
    nickname?: string; // QQ昵称，通常与player相同
    message?: string;
    server?: string;
    serverId?: number;
    serverName?: string;
    time?: Date | string;
    date?: Date | string;
    group?: string;
    groupId?: string;

    // OneBot/QQ 相关
    botId?: number;
    botName?: string;
    userId?: string;
    userName?: string;

    // Minecraft 相关
    playerCount?: number;
    maxPlayers?: number;
    worldName?: string;
    dimension?: string;

    // 消息相关
    messageId?: string;
    direction?: 'mcToQq' | 'qqToMc';
    originalMessage?: string;

    // 系统相关
    timestamp?: Date | string;
    [key: string]: unknown; // 允许动态扩展
}

export interface PlaceholderOptions {
    /** 当占位符值不存在时的默认值 */
    defaultValue?: string;
    /** 是否保留未找到的占位符 (默认: false，会被替换为空字符串) */
    preserveUnknown?: boolean;
    /** 自定义格式化函数 */
    formatters?: Record<string, (value: unknown) => string>;
}

export class TemplateProcessor {
    private static instance: TemplateProcessor;

    // 默认格式化函数
    private readonly defaultFormatters: Record<string, (value: unknown) => string> = {
        // 时间格式化
        time: (value) => {
            const date = this.parseDate(value);
            return date ? date.toLocaleTimeString('zh-CN') : '';
        },

        // 日期格式化
        date: (value) => {
            const date = this.parseDate(value);
            return date ? date.toLocaleDateString('zh-CN') : '';
        },

        // 完整日期时间
        datetime: (value) => {
            const date = this.parseDate(value);
            return date ? date.toLocaleString('zh-CN') : '';
        },

        // ISO 时间戳
        timestamp: (value) => {
            const date = this.parseDate(value);
            return date ? date.toISOString() : '';
        },

        // 大写
        upper: (value) => String(value || '').toUpperCase(),

        // 小写
        lower: (value) => String(value || '').toLowerCase(),

        // 首字母大写
        capitalize: (value) => {
            const str = String(value || '');
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        // 截断文本
        truncate: (value, length = 50) => {
            const str = String(value || '');
            return str.length > length ? str.substring(0, length) + '...' : str;
        },

        // HTML转义
        escape: (value) => {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        },

        // JSON格式化
        json: (value) => {
            try {
                return JSON.stringify(value);
            } catch {
                return String(value || '');
            }
        }
    };

    private constructor() {}

    static getInstance(): TemplateProcessor {
        if (!this.instance) {
            this.instance = new TemplateProcessor();
        }
        return this.instance;
    }

    /**
     * 处理模板字符串，替换其中的占位符
     *
     * @param template 模板字符串，如 "Hello {player}! {time:time} in {server:upper}"
     * @param context 上下文变量
     * @param options 处理选项
     * @returns 处理后的字符串
     */
    processTemplate(template: string, context: TemplateContext, options: PlaceholderOptions = {}): string {
        if (!template || typeof template !== 'string') {
            return template || '';
        }

        const mergedFormatters = { ...this.defaultFormatters, ...options.formatters };

        // 正则表达式匹配占位符: {variable} 或 {variable:formatter} 或 {variable:formatter:param}
        const placeholderRegex = /\{([^}]+)\}/g;

        return template.replace(placeholderRegex, (match, expression) => {
            try {
                return this.resolvePlaceholder(expression, context, mergedFormatters, options);
            } catch (error) {
                console.warn(`[TemplateProcessor] 处理占位符 '${match}' 失败:`, error);
                return options.preserveUnknown ? match : options.defaultValue || '';
            }
        });
    }

    /**
     * 解析单个占位符表达式
     */
    private resolvePlaceholder(
        expression: string,
        context: TemplateContext,
        formatters: Record<string, (value: unknown, ...args: unknown[]) => string>,
        options: PlaceholderOptions
    ): string {
        const parts = expression.split(':');
        const variableName = parts[0].trim();
        const formatterName = parts[1]?.trim();
        const formatterParams = parts.slice(2).map((p) => p.trim());

        // 获取变量值
        let value = this.getVariableValue(variableName, context);

        // 如果变量不存在且有默认值
        if (value === undefined || value === null) {
            if (options.defaultValue !== undefined) {
                value = options.defaultValue;
            } else if (options.preserveUnknown) {
                return `{${expression}}`;
            } else {
                value = '';
            }
        }

        // 应用格式化函数
        if (formatterName && formatters[formatterName]) {
            try {
                return formatters[formatterName](value, ...formatterParams);
            } catch (error) {
                console.warn(`[TemplateProcessor] 格式化函数 '${formatterName}' 执行失败:`, error);
                return String(value);
            }
        }

        return String(value);
    }

    /**
     * 从上下文中获取变量值，支持嵌套路径
     */
    private getVariableValue(path: string, context: TemplateContext): unknown {
        if (!path || typeof context !== 'object' || context === null) {
            return undefined;
        }

        // 支持点号分隔的嵌套路径，如 'user.name'
        const keys = path.split('.');
        let value: unknown = context;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = (value as Record<string, unknown>)[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    /**
     * 解析日期值
     */
    private parseDate(value: unknown): Date | null {
        if (!value) return null;

        if (value instanceof Date) {
            return value;
        }

        if (typeof value === 'string' || typeof value === 'number') {
            const date = new Date(value);
            return isNaN(date.getTime()) ? null : date;
        }

        return null;
    }

    /**
     * 快速格式化方法，用于向后兼容
     */
    formatMessage(template: string, variables: Record<string, string>): string {
        return this.processTemplate(template, variables as TemplateContext);
    }

    /**
     * 创建消息同步专用的上下文
     */
    createMessageSyncContext(data: {
        serverId: number;
        serverName?: string;
        player: string;
        message: string;
        timestamp: Date;
        source: 'minecraft' | 'qq';
        groupId?: string;
        direction: 'mcToQq' | 'qqToMc';
        originalMessage?: string;
        playerCount?: number;
        botId?: number;
        userId?: string;
    }): TemplateContext {
        return {
            // 基础信息
            serverId: data.serverId,
            server: data.serverName || `Server-${data.serverId}`,
            serverName: data.serverName || `Server-${data.serverId}`,
            player: data.player,
            nickname: data.player, // QQ昵称，与player相同
            message: data.message,
            originalMessage: data.originalMessage || data.message,

            // 时间信息
            time: data.timestamp,
            date: data.timestamp,
            timestamp: data.timestamp,

            // 平台相关
            groupId: data.groupId,
            group: data.groupId,
            botId: data.botId,
            userId: data.userId,

            // 方向和状态
            direction: data.direction,
            source: data.source,

            // Minecraft 相关
            playerCount: data.playerCount,

            // 便利变量
            isFromMC: data.source === 'minecraft',
            isFromQQ: data.source === 'qq',
            isToMC: data.direction === 'qqToMc',
            isToQQ: data.direction === 'mcToQq'
        };
    }

    /**
     * 验证模板字符串，检查是否包含未知占位符
     */
    validateTemplate(
        template: string,
        allowedVariables?: string[]
    ): {
        isValid: boolean;
        unknownPlaceholders: string[];
        errors: string[];
    } {
        const errors: string[] = [];
        const unknownPlaceholders: string[] = [];

        if (!template || typeof template !== 'string') {
            errors.push('模板必须是非空字符串');
            return { isValid: false, unknownPlaceholders, errors };
        }

        const placeholderRegex = /\{([^}]+)\}/g;
        let match;

        while ((match = placeholderRegex.exec(template)) !== null) {
            const expression = match[1];
            const variableName = expression.split(':')[0].trim();

            if (allowedVariables && !allowedVariables.includes(variableName)) {
                unknownPlaceholders.push(variableName);
            }

            // 检查格式化函数是否存在
            const formatterName = expression.split(':')[1]?.trim();
            if (formatterName && !this.defaultFormatters[formatterName]) {
                errors.push(`未知的格式化函数: ${formatterName}`);
            }
        }

        return {
            isValid: errors.length === 0 && unknownPlaceholders.length === 0,
            unknownPlaceholders,
            errors
        };
    }

    /**
     * 获取模板中使用的所有占位符
     */
    extractPlaceholders(template: string): string[] {
        if (!template || typeof template !== 'string') {
            return [];
        }

        const placeholders: string[] = [];
        const placeholderRegex = /\{([^}]+)\}/g;
        let match;

        while ((match = placeholderRegex.exec(template)) !== null) {
            const expression = match[1];
            const variableName = expression.split(':')[0].trim();
            if (!placeholders.includes(variableName)) {
                placeholders.push(variableName);
            }
        }

        return placeholders;
    }

    /**
     * 获取支持的所有格式化函数列表
     */
    getSupportedFormatters(): string[] {
        return Object.keys(this.defaultFormatters);
    }
}

// 导出单例
export const templateProcessor = TemplateProcessor.getInstance();

// 导出常用的占位符变量名，用于验证和文档
export const COMMON_PLACEHOLDERS = {
    // 基础变量
    PLAYER: 'player',
    NICKNAME: 'nickname', // QQ昵称
    MESSAGE: 'message',
    SERVER: 'server',
    SERVER_ID: 'serverId',
    SERVER_NAME: 'serverName',
    TIME: 'time',
    DATE: 'date',
    TIMESTAMP: 'timestamp',

    // 平台相关
    GROUP: 'group',
    GROUP_ID: 'groupId',
    BOT_ID: 'botId',
    USER_ID: 'userId',
    USER_NAME: 'userName',

    // Minecraft 相关
    PLAYER_COUNT: 'playerCount',
    MAX_PLAYERS: 'maxPlayers',
    WORLD_NAME: 'worldName',
    DIMENSION: 'dimension',

    // 消息相关
    DIRECTION: 'direction',
    SOURCE: 'source',
    ORIGINAL_MESSAGE: 'originalMessage',
    MESSAGE_ID: 'messageId',

    // 便利变量
    IS_FROM_MC: 'isFromMC',
    IS_FROM_QQ: 'isFromQQ',
    IS_TO_MC: 'isToMC',
    IS_TO_QQ: 'isToQQ'
} as const;

export const MESSAGE_SYNC_PLACEHOLDERS = Object.values(COMMON_PLACEHOLDERS);
