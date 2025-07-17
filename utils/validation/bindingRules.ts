import type { FormRules } from 'naive-ui';

/**
 * 绑定配置的字段限制常量
 */
export const BINDING_CONSTRAINTS = {
    maxBindCount: { min: 1, max: 10 },
    codeLength: { min: 4, max: 12 },
    codeExpire: { min: 1, max: 60 },
    prefix: { maxLength: 50, required: true },
    unbindPrefix: { maxLength: 50, required: false },
    kickMsg: { maxLength: 500 },
    unbindKickMsg: { maxLength: 500 },
    bindSuccessMsg: { maxLength: 200 },
    bindFailMsg: { maxLength: 200 },
    unbindSuccessMsg: { maxLength: 200 },
    unbindFailMsg: { maxLength: 200 }
} as const;

/**
 * 验证码模式选项
 */
export const CODE_MODE_OPTIONS = [
    { label: '大小写单词和数字', value: 'mix' },
    { label: '纯数字', value: 'number' },
    { label: '纯单词(大小写)', value: 'word' },
    { label: '纯单词(大写)', value: 'upper' },
    { label: '纯单词(小写)', value: 'lower' }
];

/**
 * 校验器函数
 */
export const validators = {
    /**
     * 校验绑定数量
     */
    maxBindCount: (value: number): boolean => {
        return (
            Number.isInteger(value) &&
            value >= BINDING_CONSTRAINTS.maxBindCount.min &&
            value <= BINDING_CONSTRAINTS.maxBindCount.max
        );
    },

    /**
     * 校验验证码长度
     */
    codeLength: (value: number): boolean => {
        return (
            Number.isInteger(value) &&
            value >= BINDING_CONSTRAINTS.codeLength.min &&
            value <= BINDING_CONSTRAINTS.codeLength.max
        );
    },

    /**
     * 校验验证码过期时间
     */
    codeExpire: (value: number): boolean => {
        return (
            Number.isInteger(value) &&
            value >= BINDING_CONSTRAINTS.codeExpire.min &&
            value <= BINDING_CONSTRAINTS.codeExpire.max
        );
    },

    /**
     * 校验验证码模式
     */
    codeMode: (value: string): boolean => {
        const validModes = CODE_MODE_OPTIONS.map((option) => option.value);
        return validModes.includes(value);
    },

    /**
     * 校验前缀格式
     */
    prefix: (value: string): { valid: boolean; message?: string } => {
        if (!value || !value.trim()) {
            return { valid: false, message: '绑定前缀不能为空' };
        }
        const trimmed = value.trim();
        if (trimmed.length > BINDING_CONSTRAINTS.prefix.maxLength) {
            return { valid: false, message: `绑定前缀长度不能超过${BINDING_CONSTRAINTS.prefix.maxLength}字符` };
        }
        return { valid: true };
    },

    /**
     * 校验解绑前缀格式
     */
    unbindPrefix: (value: string): { valid: boolean; message?: string } => {
        if (!value) return { valid: true }; // 解绑前缀可以为空

        const trimmed = value.trim();
        if (trimmed.length > BINDING_CONSTRAINTS.unbindPrefix.maxLength) {
            return { valid: false, message: `解绑前缀长度不能超过${BINDING_CONSTRAINTS.unbindPrefix.maxLength}字符` };
        }
        return { valid: true };
    },

    /**
     * 校验前缀不能相同
     */
    prefixConflict: (prefix: string, unbindPrefix: string): { valid: boolean; message?: string } => {
        const trimmedPrefix = prefix?.trim();
        const trimmedUnbindPrefix = unbindPrefix?.trim();

        if (trimmedPrefix && trimmedUnbindPrefix && trimmedPrefix === trimmedUnbindPrefix) {
            return { valid: false, message: '绑定前缀和解绑前缀不能相同' };
        }
        return { valid: true };
    },

    /**
     * 校验消息长度
     */
    messageLength: (value: string, maxLength: number, fieldName: string): { valid: boolean; message?: string } => {
        if (!value) return { valid: true }; // 允许空值

        if (value.length > maxLength) {
            return { valid: false, message: `${fieldName}长度不能超过${maxLength}字符` };
        }
        return { valid: true };
    }
};

/**
 * Naive UI 表单校验规则
 */
export const bindingFormRules: FormRules = {
    maxBindCount: [
        {
            required: true,
            type: 'number',
            validator: (_, value: number) => {
                if (!validators.maxBindCount(value)) {
                    return new Error(
                        `绑定数量必须在${BINDING_CONSTRAINTS.maxBindCount.min}-${BINDING_CONSTRAINTS.maxBindCount.max}之间`
                    );
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    codeLength: [
        {
            required: true,
            type: 'number',
            validator: (_, value: number) => {
                if (!validators.codeLength(value)) {
                    return new Error(
                        `验证码长度必须在${BINDING_CONSTRAINTS.codeLength.min}-${BINDING_CONSTRAINTS.codeLength.max}之间`
                    );
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    codeExpire: [
        {
            required: true,
            type: 'number',
            validator: (_, value: number) => {
                if (!validators.codeExpire(value)) {
                    return new Error(
                        `有效时间必须在${BINDING_CONSTRAINTS.codeExpire.min}-${BINDING_CONSTRAINTS.codeExpire.max}分钟之间`
                    );
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    codeMode: [
        {
            required: true,
            validator: (_, value: string) => {
                if (!validators.codeMode(value)) {
                    return new Error('请选择有效的验证码生成模式');
                }
                return true;
            },
            trigger: ['blur', 'change']
        }
    ],
    prefix: [
        {
            required: true,
            validator: (_, value: string) => {
                const result = validators.prefix(value);
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    unbindPrefix: [
        {
            validator: (_, value: string) => {
                const result = validators.unbindPrefix(value);
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    kickMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(value, BINDING_CONSTRAINTS.kickMsg.maxLength, '踢出消息');
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    unbindKickMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(
                    value,
                    BINDING_CONSTRAINTS.unbindKickMsg.maxLength,
                    '解绑踢出消息'
                );
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    bindSuccessMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(
                    value,
                    BINDING_CONSTRAINTS.bindSuccessMsg.maxLength,
                    '绑定成功消息'
                );
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    bindFailMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(
                    value,
                    BINDING_CONSTRAINTS.bindFailMsg.maxLength,
                    '绑定失败消息'
                );
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    unbindSuccessMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(
                    value,
                    BINDING_CONSTRAINTS.unbindSuccessMsg.maxLength,
                    '解绑成功消息'
                );
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ],
    unbindFailMsg: [
        {
            validator: (_, value: string) => {
                const result = validators.messageLength(
                    value,
                    BINDING_CONSTRAINTS.unbindFailMsg.maxLength,
                    '解绑失败消息'
                );
                if (!result.valid) {
                    return new Error(result.message);
                }
                return true;
            },
            trigger: ['blur', 'input']
        }
    ]
};
