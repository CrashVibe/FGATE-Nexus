/**
 * 前端模板处理器工具
 * 简化版本的模板处理器，用于实时预览和验证
 */

export interface FrontendTemplateContext {
    player?: string;
    message?: string;
    server?: string;
    serverId?: number;
    serverName?: string;
    time?: string;
    date?: string;
    group?: string;
    groupId?: string;
    nickname?: string;
    userId?: string;
    playerCount?: number;
    botId?: number;
    [key: string]: unknown;
}

export class FrontendTemplateProcessor {
    private static instance: FrontendTemplateProcessor;

    // 基础格式化函数
    private readonly formatters: Record<string, (value: unknown, ...args: unknown[]) => string> = {
        time: (value) => {
            if (typeof value === 'string') return value;
            const date = new Date();
            return date.toLocaleTimeString('zh-CN');
        },

        date: (value) => {
            if (typeof value === 'string') return value;
            const date = new Date();
            return date.toLocaleDateString('zh-CN');
        },

        datetime: (value) => {
            if (typeof value === 'string') return value;
            const date = new Date();
            return date.toLocaleString('zh-CN');
        },

        upper: (value) => String(value || '').toUpperCase(),
        lower: (value) => String(value || '').toLowerCase(),

        capitalize: (value) => {
            const str = String(value || '');
            return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
        },

        truncate: (value, length = 50) => {
            const lengthNum = typeof length === 'number' ? length : parseInt(String(length), 10) || 50;
            const str = String(value || '');
            return str.length > lengthNum ? str.substring(0, lengthNum) + '...' : str;
        },

        escape: (value) => {
            return String(value || '')
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;');
        }
    };

    static getInstance(): FrontendTemplateProcessor {
        if (!this.instance) {
            this.instance = new FrontendTemplateProcessor();
        }
        return this.instance;
    }

    /**
     * 处理模板字符串
     */
    processTemplate(template: string, context: FrontendTemplateContext): string {
        if (!template || typeof template !== 'string') {
            return template || '';
        }

        // 正则表达式匹配占位符: {variable} 或 {variable:formatter} 或 {variable:formatter:param}
        const placeholderRegex = /\{([^}]+)\}/g;

        return template.replace(placeholderRegex, (match, expression) => {
            try {
                return this.resolvePlaceholder(expression, context);
            } catch (error) {
                console.warn(`处理占位符 '${match}' 失败:`, error);
                return match; // 保留原始占位符
            }
        });
    }

    /**
     * 解析单个占位符表达式
     */
    private resolvePlaceholder(expression: string, context: FrontendTemplateContext): string {
        const parts = expression.split(':');
        const variableName = parts[0].trim();
        const formatterName = parts[1]?.trim();
        const formatterParam = parts[2]?.trim();

        // 获取变量值
        let value = context[variableName];

        if (value === undefined || value === null) {
            value = '';
        }

        // 应用格式化函数
        if (formatterName && this.formatters[formatterName]) {
            try {
                if (formatterName === 'truncate' && formatterParam) {
                    const length = parseInt(formatterParam, 10);
                    return this.formatters[formatterName](value, isNaN(length) ? 50 : length);
                } else {
                    return this.formatters[formatterName](value);
                }
            } catch (error) {
                console.warn(`格式化函数 '${formatterName}' 执行失败:`, error);
                return String(value);
            }
        }

        return String(value);
    }

    /**
     * 创建消息同步预览上下文
     */
    createMessageSyncPreviewContext(options: {
        source: 'minecraft' | 'qq';
        serverName?: string;
        serverId?: number;
    }): FrontendTemplateContext {
        const now = new Date();

        if (options.source === 'minecraft') {
            return {
                player: 'Steve',
                message: 'Hello World!',
                server: options.serverName || 'MyServer',
                serverId: options.serverId || 1,
                serverName: options.serverName || 'MyServer',
                time: now.toLocaleTimeString('zh-CN'),
                date: now.toLocaleDateString('zh-CN'),
                playerCount: 5,
                source: 'minecraft',
                direction: 'mcToQq'
            };
        } else {
            return {
                nickname: '张三',
                player: '张三',
                message: '大家好！',
                group: '123456789',
                groupId: '123456789',
                userId: '987654321',
                time: now.toLocaleTimeString('zh-CN'),
                date: now.toLocaleDateString('zh-CN'),
                source: 'qq',
                direction: 'qqToMc'
            };
        }
    }

    /**
     * 验证模板
     */
    validateTemplate(template: string): {
        isValid: boolean;
        errors: string[];
        placeholders: string[];
    } {
        const errors: string[] = [];
        const placeholders: string[] = [];

        if (!template || typeof template !== 'string') {
            errors.push('模板不能为空');
            return { isValid: false, errors, placeholders };
        }

        const placeholderRegex = /\{([^}]+)\}/g;
        let match;

        while ((match = placeholderRegex.exec(template)) !== null) {
            const expression = match[1];
            const parts = expression.split(':');
            const variableName = parts[0].trim();
            const formatterName = parts[1]?.trim();

            if (!placeholders.includes(variableName)) {
                placeholders.push(variableName);
            }

            // 检查格式化函数是否存在
            if (formatterName && !this.formatters[formatterName]) {
                errors.push(`未知的格式化函数: ${formatterName}`);
            }
        }

        return {
            isValid: errors.length === 0,
            errors,
            placeholders
        };
    }

    /**
     * 获取支持的格式化函数
     */
    getSupportedFormatters(): string[] {
        return Object.keys(this.formatters);
    }

    /**
     * 获取格式化函数帮助信息
     */
    getFormatterHelp(): Record<string, string> {
        return {
            time: '格式化为本地时间 (HH:MM:SS)',
            date: '格式化为本地日期 (YYYY/MM/DD)',
            datetime: '格式化为完整日期时间',
            upper: '转换为大写',
            lower: '转换为小写',
            capitalize: '首字母大写',
            truncate: '截断文本，可指定长度 {message:truncate:50}',
            escape: 'HTML转义，防止注入'
        };
    }
}

// 导出单例
export const frontendTemplateProcessor = FrontendTemplateProcessor.getInstance();

// 导出常用占位符
export const MESSAGE_SYNC_PLACEHOLDERS = {
    // MC → QQ
    MC_TO_QQ: ['player', 'message', 'server', 'serverId', 'serverName', 'time', 'date', 'playerCount'],

    // QQ → MC
    QQ_TO_MC: ['nickname', 'player', 'message', 'group', 'groupId', 'userId', 'time', 'date'],

    // 通用
    COMMON: ['time', 'date', 'message']
} as const;
