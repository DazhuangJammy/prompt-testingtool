# Prompt Canvas

本地提示词画布工具。

## 一键安装

安装脚本会从 GitHub 拉取源码，安装依赖，构建项目并启动服务。

Mac / Linux 本地使用：

```bash
curl -fsSL https://raw.githubusercontent.com/DazhuangJammy/prompt-testingtool/main/scripts/install.sh | bash
```

Linux 服务器使用：

```bash
curl -fsSL https://raw.githubusercontent.com/DazhuangJammy/prompt-testingtool/main/scripts/install.sh | bash -s -- --server
```

Windows PowerShell：

```powershell
iwr https://raw.githubusercontent.com/DazhuangJammy/prompt-testingtool/main/scripts/install.ps1 -UseB | iex
```

默认端口是 `8787`。服务器模式会监听 `0.0.0.0:8787`，需要在云服务器安全组/防火墙放行该端口。

可选环境变量：

```bash
PROMPT_TOOL_DIR="$HOME/Desktop/prompt-testingtool"
PROMPT_TOOL_PORT=8787
PROMPT_TOOL_BRANCH=main
```

## 启动管理

在项目目录内：

```bash
./start.sh start
./start.sh status
./start.sh stop
./start.sh restart
```

或：

```bash
pnpm start:tool
pnpm status:tool
pnpm stop:tool
```

## 更新

左上角版本胶囊可以检查 GitHub 是否有新版本。检测到更新后，可以点击“更新”，应用会执行固定流程：

```text
git pull --ff-only
pnpm install --frozen-lockfile
pnpm build
重启服务
```

个人本地使用可以直接更新。如果把工具暴露到公网，建议先只给自己访问；后续商业化或多人使用时应增加登录/管理密码。

## 开发

```bash
pnpm dev
```

前端默认运行在 Vite 端口，本地代理运行在 `http://localhost:8787`。

## Build

```bash
pnpm build
pnpm serve
```

## Data

数据保存在浏览器 IndexedDB。左侧栏支持 JSON 导入导出。
