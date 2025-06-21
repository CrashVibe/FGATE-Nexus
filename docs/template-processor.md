# FGATE-Nexus 模板占位符处理器

## 概述

FGATE-Nexus 项目现在包含了一个强大的模板占位符处理器，用于消息同步功能。这个处理器支持动态占位符、格式化函数和高级模板功能。

## 完成的功能

### 1. 后端模板处理器 (`server/utils/templateProcessor.ts`)

- ✅ 实现了完整的模板占位符处理器
- ✅ 支持基础占位符：`{player}`, `{message}`, `{server}`, `{time}`, `{date}` 等
- ✅ 支持格式化函数：`{time:time}`, `{message:truncate:50}`, `{player:upper}` 等
- ✅ 支持错误处理和默认值
- ✅ 专门为消息同步创建上下文的方法
- ✅ 模板验证和占位符提取功能

### 2. 前端模板处理器 (`utils/templateProcessor.ts`)

- ✅ 简化版的模板处理器，用于实时预览
- ✅ 支持所有基础占位符和格式化函数
- ✅ 创建预览上下文的方法
- ✅ 模板验证功能

### 3. 消息同步处理器集成 (`server/handlers/message/messageSyncHandler.ts`)

- ✅ 完全集成新的模板处理器
- ✅ 替换了原有的简单字符串替换
- ✅ 支持动态上下文创建
- ✅ 在消息队列重试时重新应用模板

### 4. 前端界面改进 (`pages/servers/[id]/message-sync.vue`)

- ✅ 集成新的前端模板处理器
- ✅ 改进的实时预览功能
- ✅ 添加了更多占位符选项，包括格式化函数
- ✅ 支持高级占位符如 `{playerCount}`, `{message:escape}`, `{time:time}`

### 5. API 端点 (`server/api/template/validate.post.ts`)

- ✅ 模板验证 API
- ✅ 预览生成功能
- ✅ 帮助信息和示例

## 支持的占位符

### 基础占位符

- `{player}` - 玩家名称/QQ昵称
- `{message}` - 消息内容
- `{server}` - 服务器名称
- `{serverId}` - 服务器ID
- `{time}` - 时间 (需要格式化函数)
- `{date}` - 日期 (需要格式化函数)

### QQ/OneBot 专用

- `{groupId}` - QQ群ID
- `{group}` - QQ群ID (别名)
- `{botId}` - 机器人ID
- `{userId}` - QQ用户ID
- `{nickname}` - QQ昵称

### Minecraft 专用

- `{playerCount}` - 在线玩家数
- `{maxPlayers}` - 最大玩家数
- `{worldName}` - 世界名称
- `{dimension}` - 维度

### 元信息

- `{direction}` - 消息方向 (mcToQq/qqToMc)
- `{source}` - 消息来源 (minecraft/qq)
- `{originalMessage}` - 原始消息内容

## 支持的格式化函数

- `{time:time}` - 格式化为本地时间 (HH:MM:SS)
- `{date:date}` - 格式化为本地日期 (YYYY/MM/DD)
- `{timestamp:datetime}` - 完整日期时间
- `{timestamp:timestamp}` - ISO时间戳
- `{player:upper}` - 转换为大写
- `{player:lower}` - 转换为小写
- `{player:capitalize}` - 首字母大写
- `{message:truncate:50}` - 截断到50字符
- `{message:escape}` - HTML转义
- `{data:json}` - JSON格式化

## 使用示例

### MC → QQ 消息模板

```
[{server}] {player}: {message}
```

```
[{server:upper}] {player} ({playerCount} 在线): {message:truncate:100}
```

```
{time:time} - {player:capitalize}: {message}
```

### QQ → MC 消息模板

```
[QQ] {nickname}: {message}
```

```
§e[QQ群] §f{player}: {message:escape}
```

```
§7[{time:time}] §a{nickname}: §f{message}
```

## 技术实现

### 后端处理流程

1. 消息进入 `MessageSyncHandler.handleMessage()`
2. 通过 `templateProcessor.createMessageSyncContext()` 创建上下文
3. 使用 `templateProcessor.processTemplate()` 处理模板
4. 支持错误处理和默认值

### 前端预览

1. 用户编辑模板时，自动创建预览上下文
2. 使用 `frontendTemplateProcessor.processTemplate()` 生成实时预览
3. 显示处理后的消息格式

### 消息队列重试

- 每次重试时重新获取配置
- 重新应用过滤规则
- 重新处理模板（支持模板更新后的重试）

## 测试

运行测试：

```bash
# 后端测试
cd server/utils
node -r ts-node/register templateProcessor.test.ts

# 或使用 Nuxt 环境测试 API
curl -X POST http://localhost:3000/api/template/validate \
  -H "Content-Type: application/json" \
  -d '{"template":"{player} 在 {time:time} 说: {message:truncate:50}"}'
```

## 性能和安全性

- ✅ 缓存编译的正则表达式
- ✅ 安全的HTML转义功能
- ✅ 错误处理和优雅降级
- ✅ 占位符验证防止注入
- ✅ 长度限制和截断保护

## 向后兼容性

- ✅ 完全向后兼容现有模板
- ✅ 原有的 `{player}`, `{message}`, `{server}`, `{time}` 占位符继续工作
- ✅ 新的格式化功能是可选的

## 下一步扩展

可以进一步扩展的功能：

- 条件占位符 (如：`{if:playerCount>5:服务器很热闹:服务器很安静}`)
- 数学运算 (如：`{calc:playerCount*2}`)
- 日期相对格式 (如：`{time:relative}` 显示"5分钟前")
- 自定义格式化函数
- 模板片段和包含功能
