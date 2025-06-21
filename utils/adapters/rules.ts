import type { FormRules } from 'naive-ui';

export const onebotRules: FormRules = {
    botId: {
        required: true,
        type: 'number',
        message: '请输入Bot ID',
        trigger: ['blur', 'input']
    },
    responseTimeout: {
        required: true,
        type: 'number',
        min: 1000,
        message: '超时时间需大于1000毫秒',
        trigger: ['blur', 'input']
    },
    enabled: {
        type: 'boolean',
        message: '请选择是否启用',
        trigger: ['change']
    }
};

// 反向连接的验证规则（需要 botId）
export const onebotReverseRules: FormRules = {
    ...onebotRules
};

// 正向连接的验证规则（botId 可选）
export const onebotForwardRules: FormRules = {
    botId: {
        required: false,
        type: 'number',
        message: '请输入有效的Bot ID',
        trigger: ['blur', 'input']
    },
    responseTimeout: {
        required: true,
        type: 'number',
        min: 1000,
        message: '超时时间需大于1000毫秒',
        trigger: ['blur', 'input']
    },
    enabled: {
        type: 'boolean',
        message: '请选择是否启用',
        trigger: ['change']
    }
};

// 根据连接类型获取验证规则
export function getOnebotRules(connectionType: 'reverse' | 'forward'): FormRules {
    return connectionType === 'forward' ? onebotForwardRules : onebotReverseRules;
}
