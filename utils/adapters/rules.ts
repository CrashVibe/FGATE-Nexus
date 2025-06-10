import type { FormRules } from 'naive-ui';

export const onebotRules: FormRules = {
    botId: {
        required: true,
        type: 'number',
        message: '请输入Bot ID',
        trigger: ['blur', 'input']
    },
    listenPath: {
        required: true,
        message: '请输入监听路径',
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
