# FGATE-Nexus（未发布，Alpha 版）

一个基于 Nuxt 3 的全栈应用，专为游戏服务器管理和 OneBot 适配器集成而设计，目标是支持打包为独立二进制文件，实现"打开即用"的分发体验。

## ✨ 已实现特性

- 🚀 **独立可执行文件**（Bun 打包，无需 Node.js）
- 🎮 **游戏服务器管理**（基础监控、管理界面）
- 🤖 **OneBot 适配器**（基础适配与消息处理）
- 🌍 **跨平台支持**（Linux, macOS, Windows）
- ⚡ **WebSocket 实时通信**
- 📦 **一键分发脚本**
- 🎨 **现代 UI（Naive UI）**

## 📝 TODO

- [ ] 游戏服务器高级监控（性能、日志、自动重启等）
- [ ] 玩家管理（在线统计、权限管理等）
- [ ] 服务器配置可视化编辑
- [ ] OneBot 多平台适配与热插拔
- [ ] 适配器动态管理与配置
- [ ] 消息处理高级功能（指令、插件等）
- [ ] Access Token 认证机制
- [ ] 数据库自动迁移与备份
- [ ] 完善的 RESTful API 文档
- [ ] 构建所有平台的二进制分发

## 🚀 快速开始

1. 克隆项目

    ```bash
    git clone <repository-url>
    cd FGATE-Nexus
    ```

2. 安装依赖

    ```bash
    bun install
    ```

3. 启动开发服务器

    ```bash
    bun dev
    ```

4. 访问应用

    打开浏览器访问 `http://localhost:3000`

## 📖 相关链接

- [Nuxt 3 文档](https://nuxt.com/docs)
- [Naive UI](https://www.naiveui.com/)
- [Bun 文档](https://bun.sh/docs)
- [OneBot 标准](https://onebot.dev/)

---

## 许可证

本项目基于 GPL 许可证开源。
