<template>
    <div class="binding-page">
        <n-grid :cols="'1 900:2'" x-gap="24" y-gap="24" responsive="screen">
            <!-- 左侧：功能设置 -->
            <n-gi>
                <n-card title="账号绑定设置" size="small">
                    <n-form :model="form" label-placement="left" label-width="120px">
                        <n-form-item label="绑定模式">
                            <n-select
                                v-model:value="form.bindMode"
                                :options="bindModeOptions"
                                placeholder="请选择绑定模式"
                            />
                        </n-form-item>
                        <n-form-item label="社交账号可绑定游戏账号数量">
                            <n-input-number v-model:value="form.maxBindCount" min="1" max="10" />
                        </n-form-item>
                        <n-form-item label="验证码长度">
                            <n-input-number v-model:value="form.codeLength" min="4" max="12" />
                        </n-form-item>
                        <n-form-item label="验证码生成模式">
                            <n-select v-model:value="form.codeMode" :options="codeModeOptions" />
                            <n-button size="small" style="margin-left: 8px" @click="previewCode">预览</n-button>
                            <n-input v-model:value="previewedCode" readonly style="width: 120px; margin-left: 8px" />
                        </n-form-item>
                        <n-form-item label="验证码有效时间(分钟)">
                            <n-input-number v-model:value="form.codeExpire" min="1" max="60" />
                        </n-form-item>
                        <n-form-item label="允许解绑">
                            <n-switch v-model:value="form.allowUnbind" />
                        </n-form-item>
                        <n-form-item label="通用前缀">
                            <n-input v-model:value="form.prefix" placeholder="如：/" />
                        </n-form-item>
                    </n-form>
                </n-card>
                <n-card title="使用方法说明" size="small" style="margin-top: 16px">
                    <n-descriptions bordered :column="1">
                        <n-descriptions-item label="绑定指令示例">绑定 1234</n-descriptions-item>
                        <n-descriptions-item label="绑定成功提示"
                            >@IKUN 绑定PlayerName成功! 你可以进入服务器了!</n-descriptions-item
                        >
                        <n-descriptions-item label="解绑指令示例">解绑 Steve</n-descriptions-item>
                        <n-descriptions-item label="解绑成功提示">@IKUN 解除绑定Steve成功!</n-descriptions-item>
                    </n-descriptions>
                </n-card>
            </n-gi>
            <!-- 右侧：高级设置和反馈消息 -->
            <n-gi>
                <n-card title="高级设置" size="small">
                    <n-form :model="form" label-placement="left" label-width="120px">
                        <n-form-item label="强制绑定">
                            <n-switch v-model:value="form.forceBind" />
                        </n-form-item>
                        <n-form-item label="未绑定账号踢出消息">
                            <n-input v-model:value="form.kickMsg" type="textarea" rows="7" />
                        </n-form-item>
                        <n-form-item label="信任模式踢出消息">
                            <n-input v-model:value="form.trustKickMsg" type="textarea" rows="5" />
                        </n-form-item>
                        <n-form-item label="被解绑踢出消息">
                            <n-input v-model:value="form.unbindKickMsg" type="textarea" rows="3" />
                        </n-form-item>
                    </n-form>
                </n-card>
                <n-card title="反馈消息配置" size="small" style="margin-top: 16px">
                    <n-form :model="form" label-placement="left" label-width="120px">
                        <n-form-item label="绑定成功">
                            <n-input v-model:value="form.bindSuccessMsg" />
                        </n-form-item>
                        <n-form-item label="绑定失败">
                            <n-input v-model:value="form.bindFailMsg" />
                        </n-form-item>
                        <n-form-item label="解绑成功">
                            <n-input v-model:value="form.unbindSuccessMsg" />
                        </n-form-item>
                        <n-form-item label="解绑失败">
                            <n-input v-model:value="form.unbindFailMsg" />
                        </n-form-item>
                    </n-form>
                </n-card>
            </n-gi>
        </n-grid>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

definePageMeta({
    layout: 'servere-edit'
});

const form = ref({
    bindMode: '',
    maxBindCount: 4,
    codeLength: 6,
    codeMode: 'mix',
    codeExpire: 5,
    allowUnbind: true,
    prefix: '/',
    forceBind: false,
    kickMsg: `&l&k123456&6&l未绑定社交帐号 | #name&f&l&k123456\n&f&a进入服务器需要绑定您的社交帐号\n&f请先加群&e956076046\n&f发送内容:&a绑定 #code\n&f发送后方可进入服务器\n&7请在#time前完成验证\n&7&l【&c&l!&7&l】请不要将验证码发送给其他人\n&7&l【&c&l!&7&l】验证超时后需重新进入服务器`,
    trustKickMsg: `&l&k123456&6&l未绑定社交帐号 | #name&f&l&k123456\n&f&a进入服务器需要绑定您的社交帐号\n&f请先加群&e956076046\n&f发送内容:&a绑定 #name\n&f发送后方可进入服务器\n&7&l【&c&l!&7&l】请注意名称大小写`,
    unbindKickMsg: `&l&k123456&a&l社交帐号被解绑&f&l&k123456\n您的社交账号&c<#social_account>&f已在社交平台解绑。`,
    bindSuccessMsg: '绑定#user成功! 你可以进入服务器了!',
    bindFailMsg: '绑定#user失败! #why',
    unbindSuccessMsg: '解除绑定#user成功!',
    unbindFailMsg: '解除绑定#user失败! #why'
});
const bindModeOptions = [
    { label: '验证码', value: 'code' },
    { label: '信任模式', value: 'trust' }
];
const codeModeOptions = [
    { label: '大小写单词和数字', value: 'mix' },
    { label: '纯数字', value: 'number' },
    { label: '纯单词(大小写)', value: 'word' },
    { label: '纯单词(大写)', value: 'upper' },
    { label: '纯单词(小写)', value: 'lower' }
];
const previewedCode = ref('');
function previewCode() {
    const { codeLength, codeMode } = form.value;
    let chars = '';
    switch (codeMode) {
        case 'mix':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
            break;
        case 'number':
            chars = '0123456789';
            break;
        case 'word':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
            break;
        case 'upper':
            chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
            break;
        case 'lower':
            chars = 'abcdefghijklmnopqrstuvwxyz';
            break;
    }
    let code = '';
    for (let i = 0; i < codeLength; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    previewedCode.value = code;
}
</script>

<style scoped>
.binding-page {
    padding: 20px 0;
}
@media (max-width: 900px) {
    .binding-page .n-grid {
        flex-direction: column !important;
    }
}
</style>
