# FGATE-Nexus

一个基于 Nuxt 3 的全栈应用，支持打包为独立二进制文件，实现"打开即用"的分发体验。

## ✨ 特性

- 🚀 **独立可执行文件** - 无需安装 Node.js
- 🌍 **跨平台支持** - Linux, macOS, Windows
- ⚡ **完整功能** - WebSocket, SQLite 数据库, API 路由
- 📦 **一键分发** - 完整的构建和分发脚本

## 🛠️ 开发环境

### 安装依赖

```bash
bun install
```

### 开发服务器

启动开发服务器在 `http://localhost:3000`:

```bash
bun run dev
```

## 📦 构建和分发

### 快速构建（当前平台）

```bash
bun run build:quick
# 或
./scripts/build-quick.sh
```

### 完整分发包构建

```bash
bun run build:distribution
# 或
./scripts/build-distribution.sh
```

### 单平台构建

```bash
# Linux
bun run pkg:linux

# macOS  
bun run pkg:macos

# Windows
bun run pkg:windows
```

## 🚀 使用二进制文件

构建完成后，在 `fgate-nexus-distribution/` 目录中：

### Windows
```bash
start.bat
# 或
fgate-nexus-windows.exe
```

### macOS/Linux
```bash
./start.sh
# 或
./fgate-nexus-macos    # macOS
./fgate-nexus-linux    # Linux
```

## 🔧 GitHub Actions

项目配置了自动化 CI/CD:

- **交叉编译**: 在 Linux 环境中构建所有平台的二进制文件
- **自动测试**: 验证构建质量和功能完整性
- **自动发布**: 创建 GitHub Release 并上传分发包

## 📋 系统要求

### 开发环境
- Node.js 18+
- Bun (推荐) 或 npm/yarn

### 运行环境
- **Linux**: x64 架构
- **macOS**: x64 架构（Intel 或 Apple Silicon with Rosetta）
- **Windows**: x64 架构

## 📖 更多信息

- [构建文档](BUILD.md) - 详细的构建说明和故障排除
- [Nuxt 3 文档](https://nuxt.com/docs) - 了解 Nuxt 3 框架
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
