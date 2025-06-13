# FGATE-Nexus

一个基于 Nuxt 3 的全栈应用，专为游戏服务器管理和 OneBot 适配器集成而设计，支持打包为独立二进制文件，实现"打开即用"的分发体验。

## ✨ 特性

- 🚀 **独立可执行文件** - 基于 Bun 打包，无需安装 Node.js
- 🎮 **游戏服务器管理** - 支持 Minecraft 等游戏服务器的监控和管理
- 🤖 **OneBot 适配器** - 集成聊天机器人适配器，支持多平台消息处理
- 🌍 **跨平台支持** - Linux, macOS, Windows
- ⚡ **完整功能** - WebSocket 实时通信, SQLite 数据库, RESTful API
- 🎨 **现代 UI** - 基于 Naive UI 的响应式界面
- 📦 **一键分发** - 完整的构建和分发脚本

## 🛠️ 技术栈

- **前端**: Nuxt 3, Vue 3, Naive UI, TypeScript
- **后端**: Nitro, H3, WebSocket, Drizzle ORM
- **数据库**: SQLite
- **运行时**: Bun
- **构建工具**: Vite, ESLint, Prettier

## 🛠️ 开发环境

### 系统要求

- Node.js 18+
- Bun (推荐) 或 npm/yarn

### 安装依赖

```bash
bun install
```

### 开发服务器

启动开发服务器在 `http://localhost:3000`:

```bash
# 使用 Bun 运行时（推荐）
bun --bun dev

# 或者使用标准方式
bun run dev
```

> **注意**: 由于项目使用了 Bun 特定的功能，建议使用 `bun --bun dev` 命令来确保最佳兼容性。

## 📦 构建和分发

### 快速构建（当前平台）

```bash
# 构建应用
bun run build

# 编译为二进制文件（macOS）
bun run build:mac

# 编译为二进制文件（Linux）
bun run build:linux

# 编译为二进制文件（Windows）
bun run build:win
```

### 构建所有平台

```bash
# 构建所有平台的二进制文件
bun run build:all
```

## 🚀 使用二进制文件

构建完成后，在 `dist/` 目录中：

## 📁 项目结构

```
FGATE-Nexus/
├── components/          # Vue 组件
│   ├── Card/           # 卡片组件（服务器、适配器等）
│   └── Config/         # 配置组件
├── pages/              # 页面路由
│   ├── adapters/       # 适配器管理页面
│   └── servers/        # 服务器管理页面
├── server/             # 服务端代码
│   ├── api/            # API 路由
│   ├── database/       # 数据库配置和 Schema
│   ├── handlers/       # 业务处理器
│   ├── plugins/        # 服务器插件
│   └── utils/          # 工具类
│       ├── adapters/   # 适配器管理
│       └── client/     # 客户端连接管理
├── composables/        # Vue 组合式函数
├── assets/             # 静态资源
└── migrations/         # 数据库迁移文件
```

## 🎯 主要功能

### 🎮 游戏服务器管理

- **服务器监控**: 实时监控游戏服务器状态和性能
- **玩家管理**: 查看在线玩家信息和统计
- **配置管理**: 可视化配置服务器参数
- **WebSocket 通信**: 实时双向数据传输

### 🤖 OneBot 适配器

- **多平台支持**: 支持各种聊天平台的 OneBot 协议
- **适配器管理**: 动态添加、配置和管理适配器
- **消息处理**: 实时消息接收和处理
- **认证机制**: 支持 Access Token 安全认证

### 📊 数据管理

- **SQLite 数据库**: 轻量级本地数据存储
- **Drizzle ORM**: 类型安全的数据库操作
- **自动迁移**: 数据库结构自动更新

## 🔧 开发指南

### 数据库操作

```bash
# 生成数据库迁移文件
bun run db:generate

# 执行数据库迁移
bun run db:migrate
```

### 代码规范

项目使用 ESLint 和 Prettier 确保代码质量：

## 📋 系统要求

### 开发环境

- **Node.js**: 18+
- **Bun**: 最新版本（推荐）
- **操作系统**: macOS, Linux, Windows

### 运行环境（二进制文件）

- **Linux**: x64 和 ARM 架构
- **macOS**: x64 和 ARM 架构（Intel 与 Apple Silicon）
- **Windows**: x64 架构

## 🚀 快速开始

1. **克隆项目**

    ```bash
    git clone <repository-url>
    cd FGATE-Nexus
    ```

2. **安装依赖**

    ```bash
    bun install
    ```

3. **启动开发服务器**

    ```bash
    bun --bun dev
    ```

4. **访问应用**

    打开浏览器访问 `http://localhost:3000`

## 📖 相关链接

- [Nuxt 3 文档](https://nuxt.com/docs) - 了解 Nuxt 3 框架
- [Naive UI](https://www.naiveui.com/) - UI 组件库文档
- [Bun 文档](https://bun.sh/docs) - Bun 运行时文档
- [OneBot 标准](https://onebot.dev/) - OneBot 协议规范

---

## 许可证

本项目基于 GPL 许可证开源。
