# OpenSpec UI

[English](#english) | [中文](#中文)

---

## English

A visual web interface for spec-driven development with OpenSpec.

### Features

- **Dashboard** - Overview of specs, changes, and task progress
- **Spec Management** - View and edit specification documents
- **Change Proposals** - Track change proposals with tasks and deltas
- **Task Tracking** - Click to toggle task completion status
- **Realtime Updates** - WebSocket-based live updates when files change
- **Static Site Export** - Export the current state as static website to be used in CI
- **AI Integration** - Review, translate, and suggest improvements (API & ACP)

### Quick Start

#### Via npm (all platforms)

```bash
# Install globally
npm install -g openspecui

# Run in your project directory
openspecui

# Or specify a directory
openspecui ./my-project
```

#### Via Nix (Linux, macOS)

If you use the Nix package manager:

```bash
# Run without installation
nix run github:jixoai-labs/openspecui

# Run with arguments
nix run github:jixoai-labs/openspecui -- --help
nix run github:jixoai-labs/openspecui -- ./my-project

# Install to user profile
nix profile install github:jixoai-labs/openspecui
openspecui  # Now available in PATH
```

**Add to NixOS configuration:**

```nix
{
  inputs.openspecui.url = "github:jixoai-labs/openspecui";

  environment.systemPackages = [
    inputs.openspecui.packages.${system}.default
  ];
}
```

**Development shell:**

```bash
# Enter development environment with all dependencies
nix develop
pnpm install
pnpm dev
```

The UI will open at `http://localhost:3100`.

### CLI Options

```
Usage: openspecui [command] [options] [project-dir]

Commands:
  openspecui [project-dir]        Start the development server (default)
  openspecui start [project-dir]  Start the development server
  openspecui export [output-dir]  Export as a static website

Options:
  -p, --port <port>       Port to run the server on (default: 3100)
  -d, --dir <path>        Project directory containing openspec/
  --no-open               Don't automatically open the browser
  -h, --help              Show help message
  -v, --version           Show version number

Export Options:
  --base-path <path>      Base path for deployment (default: /)
  --clean                 Clean output directory before export
```

### Static Export

Export your OpenSpec project as a static website for deployment to GitHub Pages, Netlify, or any static hosting service.

```bash
# Export to default directory (./openspec-export/)
openspecui export

# Export to custom directory
openspecui export ./dist

# Export for subdirectory deployment
openspecui export --base-path=/docs/

# Clean output directory before export
openspecui export --clean
```

The exported site includes:

- Complete data snapshot (data.json)
- All HTML, CSS, JS assets
- Fallback routing for SPA navigation
- Routes manifest for all pages

**Note:** Static exports have limited functionality compared to the live server:

- No real-time file watching
- No task checkbox toggling
- No AI integration features
- Read-only view of the snapshot at export time

#### Test the Static Export Locally

```bash
# Export the site
openspecui export ./test-output --clean

# Serve it locally with any static server
cd test-output
python3 -m http.server 8080
# Or: npx http-server -p 8080

# Open in browser
# http://localhost:8080
```

Look for the "📸 Static Snapshot" banner at the top to confirm static mode is active.

#### Deploy to GitHub Pages

**Using npm:**

```yaml
# .github/workflows/deploy-specs.yml
name: Deploy Specs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g openspecui
      - run: openspecui export ./dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**Using Nix:**

```yaml
# .github/workflows/deploy-specs.yml
name: Deploy Specs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v27
        with:
          nix_path: nixpkgs=channel:nixos-unstable
      - run: nix run github:jixoai-labs/openspecui -- export ./dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### Project Structure

OpenSpec UI expects the following directory structure:

```
your-project/
└── openspec/
    ├── project.md          # Project overview
    ├── AGENTS.md           # AI agent instructions
    ├── specs/              # Specification documents
    │   └── {spec-id}/
    │       └── spec.md
    └── changes/            # Change proposals
        ├── {change-id}/
        │   ├── proposal.md
        │   └── tasks.md
        └── archive/        # Archived changes
```

### Development

```bash
# Clone the repository
git clone https://github.com/jixoai-labs/openspecui.git
cd openspecui

# Install dependencies
pnpm install

# Build all packages
pnpm build:packages

# Start development servers
pnpm dev
```

### Packages

| Package                   | Description                                  |
| ------------------------- | -------------------------------------------- |
| `openspecui`              | CLI tool and bundled web UI                  |
| `@openspecui/core`        | File adapter, parser, validator, and watcher |
| `@openspecui/server`      | tRPC HTTP/WebSocket server                   |
| `@openspecui/ai-provider` | AI provider abstraction (API & ACP)          |
| `@openspecui/web`         | React web application                        |

### Tech Stack

- **Frontend**: React 19, TanStack Router, TanStack Query, Tailwind CSS v4
- **Backend**: Hono, tRPC v11, WebSocket
- **Build**: pnpm workspaces, Vite, tsdown
- **Type Safety**: TypeScript, Zod

### License

MIT

---

## 中文

OpenSpec 规范驱动开发的可视化 Web 界面。

### 功能特性

- **仪表盘** - 规范、变更和任务进度概览
- **规范管理** - 查看和编辑规范文档
- **变更提案** - 跟踪变更提案及其任务和增量
- **任务跟踪** - 点击切换任务完成状态
- **实时更新** - 基于 WebSocket 的文件变更实时更新
- **AI 集成** - 审查、翻译和改进建议（支持 API 和 ACP）

### 快速开始

#### 通过 npm（所有平台）

```bash
# 全局安装
npm install -g openspecui

# 在项目目录中运行
openspecui

# 或指定目录
openspecui ./my-project
```

#### 通过 Nix（Linux、macOS）

如果您使用 Nix 包管理器：

```bash
# 无需安装直接运行
nix run github:jixoai-labs/openspecui

# 带参数运行
nix run github:jixoai-labs/openspecui -- --help
nix run github:jixoai-labs/openspecui -- ./my-project

# 安装到用户配置文件
nix profile install github:jixoai-labs/openspecui
openspecui  # 现在可以在 PATH 中使用
```

**添加到 NixOS 配置：**

```nix
{
  inputs.openspecui.url = "github:jixoai-labs/openspecui";

  environment.systemPackages = [
    inputs.openspecui.packages.${system}.default
  ];
}
```

**开发环境：**

```bash
# 进入包含所有依赖的开发环境
nix develop
pnpm install
pnpm dev
```

界面将在 `http://localhost:3100` 打开。

### 命令行选项

```
用法: openspecui [命令] [选项] [项目目录]

命令:
  openspecui [项目目录]        启动开发服务器（默认）
  openspecui start [项目目录]  启动开发服务器
  openspecui export [输出目录] 导出为静态网站

选项:
  -p, --port <端口>       服务器端口（默认: 3100）
  -d, --dir <路径>        包含 openspec/ 的项目目录
  --no-open               不自动打开浏览器
  -h, --help              显示帮助信息
  -v, --version           显示版本号

导出选项:
  --base-path <路径>      部署的基础路径（默认: /）
  --clean                 导出前清理输出目录
```

### 静态导出

将您的 OpenSpec 项目导出为静态网站，可部署到 GitHub Pages、Netlify 或任何静态托管服务。

```bash
# 导出到默认目录 (./openspec-export/)
openspecui export

# 导出到自定义目录
openspecui export ./dist

# 为子目录部署导出
openspecui export --base-path=/docs/

# 导出前清理输出目录
openspecui export --clean
```

导出的网站包含：

- 完整的数据快照 (data.json)
- 所有 HTML、CSS、JS 资源
- SPA 导航的回退路由
- 所有页面的路由清单

**注意：** 静态导出相比实时服务器功能有限：

- 无实时文件监听
- 无任务复选框切换
- 无 AI 集成功能
- 仅可查看导出时的只读快照

#### 本地测试静态导出

```bash
# 导出网站
openspecui export ./test-output --clean

# 使用任何静态服务器本地提供服务
cd test-output
python3 -m http.server 8080
# 或: npx http-server -p 8080

# 在浏览器中打开
# http://localhost:8080
```

查看顶部的 "📸 Static Snapshot" 横幅以确认静态模式已激活。

#### 部署到 GitHub Pages

**使用 npm：**

```yaml
# .github/workflows/deploy-specs.yml
name: Deploy Specs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install -g openspecui
      - run: openspecui export ./dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

**使用 Nix：**

```yaml
# .github/workflows/deploy-specs.yml
name: Deploy Specs

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: cachix/install-nix-action@v27
        with:
          nix_path: nixpkgs=channel:nixos-unstable
      - run: nix run github:jixoai-labs/openspecui -- export ./dist
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
```

### 项目结构

OpenSpec UI 期望以下目录结构：

```
your-project/
└── openspec/
    ├── project.md          # 项目概述
    ├── AGENTS.md           # AI 代理指令
    ├── specs/              # 规范文档
    │   └── {spec-id}/
    │       └── spec.md
    └── changes/            # 变更提案
        ├── {change-id}/
        │   ├── proposal.md
        │   └── tasks.md
        └── archive/        # 已归档的变更
```

### 开发

```bash
# 克隆仓库
git clone https://github.com/jixoai-labs/openspecui.git
cd openspecui

# 安装依赖
pnpm install

# 构建所有包
pnpm build:packages

# 启动开发服务器
pnpm dev
```

### 包说明

| 包名                      | 描述                               |
| ------------------------- | ---------------------------------- |
| `openspecui`              | CLI 工具和打包的 Web UI            |
| `@openspecui/core`        | 文件适配器、解析器、验证器和监视器 |
| `@openspecui/server`      | tRPC HTTP/WebSocket 服务器         |
| `@openspecui/ai-provider` | AI 提供者抽象层（API 和 ACP）      |
| `@openspecui/web`         | React Web 应用                     |

### 技术栈

- **前端**: React 19, TanStack Router, TanStack Query, Tailwind CSS v4
- **后端**: Hono, tRPC v11, WebSocket
- **构建**: pnpm workspaces, Vite, tsdown
- **类型安全**: TypeScript, Zod

### 许可证

MIT
