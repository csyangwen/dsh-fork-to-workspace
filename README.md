# dsh-fork-to-workspace

[English](./README.en.md)

把 DeepSeek Harness Web 中的任意会话分支**克隆到其他工作区**，把表现好的分支作为新项目的性能基线复用。

这是一个社区项目，与 DeepSeek 官方无关，也不是官方插件。

## 这个插件解决什么问题

DeepSeek Harness 的会话是一棵分支树：从同一会话的不同轮次（分支点）可以克隆出走向不同的会话。实际使用中，同一个模型在同一个会话树的不同分支上，表现可能差异很大——某些分支保留了好的轨迹（例如没有 `let me` 思维链、工具使用干净、评测分数高的分支），其他分支则会逐渐发散。

如果在这些分支上继续叠加新需求，后续对话会继续发散，难以保持初始的良好状态。**dsh-fork-to-workspace 解决的是：把表现好的分支整体克隆成独立的新会话，放进其他工作区，作为新项目的起点。** 克隆出的会话保留到该分支为止的完整历史（提示词轨迹、工具调用、思维链全部继承），在新项目目录里继续对话，性能基线保持不变。

## 与 dsh-anchored-standard 配合

[dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) 是一个两阶段 agent preset：先用最小工具目录引导出干净的初始轨迹，再切换到完整 Standard 工具目录。它解决的是**在会话内部长出好分支**的问题。

两个插件的配合工作流：

1. 用 dsh-anchored-standard（或任意 preset）在会话中产生多个分支；
2. 通过评测或观察挑出表现好的分支（例如没有 `let me` 思维链、能力分数高的分支）；
3. 用本插件把该分支**克隆到其他工作区**（新项目目录）；
4. 克隆出的会话继承分支的完整历史，直接作为新项目的基线会话继续工作。

简单说：**dsh-anchored-standard 负责"长出好分支"，dsh-fork-to-workspace 负责"把好分支变成新项目"。**

## 功能

- **侧边栏会话三点菜单新增「分叉会话到其他工作区…」**
  - 弹出工作区选择对话框（自动排除源会话所在工作区，显示标题与完整路径）；
  - 把源会话截至最后一个已完成回合克隆为目标工作区的新会话；
  - 子会话标题自动追加序号（如「原标题 (1)」），创建后自动打开。
- **会话内「在新对话中分支」按钮升级为二选一**
  - **克隆到当前工作区**：与官方分叉行为一致（同工作区、标题自增、自动打开）；
  - **克隆到其他工作区…**：支持**任意轮次**——官方禁用的非末尾回合分支按钮也会被启用，从任意一轮都能克隆到目标工作区。
- **会话导出 / 导入（跨机器迁移）**
  - **导出会话…**：把会话（完整日志 + 图片附件）打包成 `dsh-session-<id>.zip` 下载（与官方导出同格式）；
  - **导入会话…**：选择 zip 文件 + 目标工作区，把会话完整写入当前 DSH（日志按本机压缩格式落盘、附件按内容寻址写回），刷新后出现在目标工作区分组下，可直接打开继续对话；
  - 跨机器导入的关键：目标工作区可选，导入时自动把会话 `cwd` 改写为本机路径，会话直接归属该工作区（不选则保留原目录，显示在「未分组」）。

## 安装

要求：DeepSeek Harness Web（`dsh web`），`0.1.0-rc.x` 开发版（上游 API 迭代快，不保证向前兼容）。

```sh
# 1. 克隆本项目
git clone https://github.com/csyangwen/dsh-fork-to-workspace.git
# 2. 放入 DSH 插件目录
mkdir -p ~/.dsh/plugins
cp -R dsh-fork-to-workspace ~/.dsh/plugins/
# 3. 安装进 web profile
dsh plugin --profile web add "link:$HOME/.dsh/plugins/dsh-fork-to-workspace"
```

在 `~/.dsh/profiles/web/cordis.patch.yml` 追加（name 必须与 package.json 的 name 一致）：

```yaml
- insert:
    - id: dsh-fork-to-workspace
      name: dsh-fork-to-workspace
```

重启 dsh web（或等待 patch 热重载），**浏览器刷新页面**。左侧会话三点菜单应出现「分叉会话到其他工作区…」即安装成功。

> 宿主端零运行时依赖，客户端 bundle 已预构建在 `lib/client.js`，安装无需 Node 构建环境。

## 使用

**入口一：侧边栏会话列表**

1. 鼠标悬停任意会话行，点击行尾「…」；
2. 菜单选择「分叉会话到其他工作区…」；
3. 在弹出的对话框里点选目标工作区（目录），点击「克隆到该工作区」；
4. 新会话创建并自动打开，标题为「原标题 (1)」，位于目标工作区分组下。

**入口三：导出 / 导入会话（跨机器迁移）**

1. 源机器：会话行「…」菜单 →「导出会话…」→ 下载 `dsh-session-<id>.zip`；
2. 目标机器：会话行「…」菜单 →「导入会话…」→ 选择 zip →（可选）选择目标工作区 →「导入」；
3. 导入成功后点击「打开会话」即可继续对话。

> 注意：会话记录的 agent preset（如 `anchored-standard`）需要在目标 DSH 中同样安装，否则打开会话会失败。

**入口二：会话内分支按钮**

1. 打开源会话，找到某一轮末尾的「在新对话中分支」按钮；
2. 点击后弹出两个选项：
   - **克隆到当前工作区**：与官方分叉一致，立即在本工作区创建分支会话；
   - **克隆到其他工作区…**：弹出目标工作区选择，把**该轮为止**的会话克隆过去；
3. 官方仅允许从最后一个已完成回合分支，本插件会启用所有回合的分支按钮，**任意一轮都可克隆**。

## 工作原理

- **克隆语义与官方分叉对齐**：子会话的事件种子 = 源会话截至目标边界（最后一个已完成回合，或 atSeq 锚定的回合）的完整事件前缀；子会话继承源会话的 agent preset 与模型配置。
- **跨工作区归属的关键**：DSH 中会话归属于工作区的唯一判据是「会话 `header.cwd` 的 canonical 路径 === 工作区目录」。插件创建子会话时直接把 `cwd` 设为目标工作区路径，再经官方 `workspace.attachSession` 校验挂载，因此子会话天然出现在目标工作区分组下。
- **宿主端**：零依赖的 `lib/index.js`，通过 `webServer` 服务注册两个 API——`GET /dsh-fork-ws/prepare`（源会话信息 + 工作区列表）与 `POST /dsh-fork-ws/fork`（执行克隆，可选 `atSeq` 分支锚点）；服务全部按名从 cordis 上下文读取，不 import 任何 `@deepseek-ai/*` 包。
- **客户端**：不改框架源码的 DOM 增强——MutationObserver 向官方菜单注入入口、接管官方分支按钮点击（capture 阶段拦截），对话框用 `react-dom` 渲染。
- **导出 / 导入**：手写零依赖 zip 打包/解析（CRC32 + deflate）；导出 = 官方同款条目（`session.jsonl` 解码文本 + `media/*` 附件）；导入 = 解析打包行（text-chunks 等，与官方 decodeStorageRecord 一致）→ 持久化层公开接口 `create` + 分批 `append` 写入（后端自动按本机压缩编码落盘，跨机器无需关心 zstd）→ 附件写回 `attachments/v1/objects/`。

## 从源码构建（可选）

需要一份 DSH 源码 checkout（内含 esbuild）：

```sh
DSH_SOURCE=/path/to/dsh-checkout node scripts/build.mjs
```

## 测试

```sh
npm test
```

宿主端冒烟测试（fake ctx + 真实 HTTP 转发）覆盖：边界计算、跨工作区挂载、标题自增、atSeq 锚点、错误分支。

## 目录结构

```
lib/index.js       宿主端：/dsh-fork-ws API（零依赖）
lib/client.js      客户端 bundle（预构建产物）
src/client/        客户端源码（TSX：菜单注入 / 分支二选一 / 工作区选择对话框）
scripts/build.mjs  esbuild 构建脚本
tests/             宿主端冒烟测试
```

## 兼容性与声明

- 面向 DeepSeek Harness `0.1.0-rc.x` 开发版开发；上游为开发者预览版，API 可能破坏性变更，升级前请先对照上游变化。
- 社区项目，非 DeepSeek 官方出品。
- 插件只使用官方服务 seam（`webServer` / `sessions` / `agents` / `workspaceRegistry` / `sessionTitle` / `agentPresets`），不修改框架源码。

## License

MIT
