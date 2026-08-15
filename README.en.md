# dsh-fork-to-workspace

[中文说明](./README.md)

Clone any session branch from DeepSeek Harness Web into **another workspace**, so
you can reuse the performance baseline of your best branches as the starting
point of new projects.

A community project. Not an official DeepSeek plugin and not affiliated with or
endorsed by DeepSeek.

## What problem does it solve

DeepSeek Harness sessions form a branch tree: different forks cut from the same
session diverge. In practice, the same model can behave very differently across
branches of the same session tree — some branches keep a clean trajectory (for
example, no `let me` reasoning chains, clean tool usage, high eval scores),
while others drift.

Continuing to stack new requirements on a branch keeps it drifting away from
the state that worked. **dsh-fork-to-workspace clones a good branch into a
brand-new session inside another workspace.** The clone inherits the complete
history up to that branch point (prompt trajectory, tool calls, reasoning
chains), so you can keep working in the new project directory while the
performance baseline stays intact.

## How it pairs with dsh-anchored-standard

[dsh-anchored-standard](https://github.com/xiaobright/dsh-anchored-standard) is
a two-phase agent preset: it bootstraps the first request with a minimal tool
catalog to guide a clean initial trajectory, then switches to the full Standard
catalog. It is the tool that *grows good branches inside a session*.

Suggested workflow:

1. Use dsh-anchored-standard (or any preset) to produce multiple branches in a
   session;
2. Pick the branch that performs best (for example, the one without `let me`
   reasoning chains, or with the highest eval score);
3. Use this plugin to **clone that branch into another workspace** (the new
   project directory);
4. The clone inherits the branch's full history and becomes the baseline
   session of the new project.

In short: **dsh-anchored-standard grows good branches; dsh-fork-to-workspace
turns a good branch into a new project.**

## Features

- **Sidebar session menu gains "Fork session to another workspace…"**
  - Opens a workspace picker (the source workspace is excluded; each entry
    shows title and full path);
  - Clones the source session up to its last completed turn into the chosen
    workspace;
  - The child title gets an auto-incremented suffix (e.g. `Original (1)`), and
    the child opens automatically.
- **In-session "Branch into a new conversation" button becomes a two-option
  menu**
  - **Clone to current workspace**: identical to the official fork behavior;
  - **Clone to another workspace…**: supports **any turn** — the officially
    disabled branch buttons on non-final turns are enabled too.

## Install

Requires DeepSeek Harness Web (`dsh web`), `0.1.0-rc.x` (a developer preview;
APIs may break without notice).

```sh
# 1. Clone this repository
git clone https://github.com/csyangwen/dsh-fork-to-workspace.git
# 2. Put it into the DSH plugin directory
mkdir -p ~/.dsh/plugins
cp -R dsh-fork-to-workspace ~/.dsh/plugins/
# 3. Install into the web profile
dsh plugin --profile web add "link:$HOME/.dsh/plugins/dsh-fork-to-workspace"
```

Append to `~/.dsh/profiles/web/cordis.patch.yml` (the `name` must match
`package.json` exactly):

```yaml
- insert:
    - id: dsh-fork-to-workspace
      name: dsh-fork-to-workspace
```

Restart `dsh web` (or wait for the patch hot-reload), then **refresh the
browser page**. You should see "Fork session to another workspace…" in the
sidebar session menu.

> The host half has zero runtime dependencies and the client bundle is
> pre-built in `lib/client.js` — no Node build toolchain is required.

## Usage

**Entry 1: sidebar session list**

1. Hover a session row and click its "…" button;
2. Choose "Fork session to another workspace…";
3. Pick the target workspace (directory) in the dialog and click "Clone to
   this workspace";
4. The new session opens automatically, titled `Original (1)`, grouped under
   the target workspace.

**Entry 2: in-session branch button**

1. Open the source session and locate the "Branch into a new conversation"
   button at the end of a turn;
2. Click it: a two-option menu appears:
   - **Clone to current workspace**: official fork behavior, immediately;
   - **Clone to another workspace…**: pick the target workspace, and the
     session is cloned up to **that turn**;
3. The official UI only allows branching from the last completed turn; this
   plugin enables every turn's branch button, so **any turn can be cloned**.

## How it works

- **Fork semantics align with the official fork**: the child's event seed is
  the full event prefix of the source up to the boundary (last completed turn,
  or the turn anchored by `atSeq`); the child inherits the source's agent
  preset and model configuration.
- **The key to cross-workspace membership**: in DSH, a session belongs to a
  workspace iff the canonical path of the session's `header.cwd` equals the
  workspace directory. The plugin creates the child with `cwd` set to the
  target workspace path, then attaches it through the official
  `workspace.attachSession` validation, so the child naturally appears under
  the target workspace group.
- **Host side**: a zero-dependency `lib/index.js` registers two APIs through
  the `webServer` service — `GET /dsh-fork-ws/prepare` (source info +
  workspace list) and `POST /dsh-fork-ws/fork` (perform the clone, optional
  `atSeq` anchor). All services are read by name from the cordis context; no
  `@deepseek-ai/*` package is imported.
- **Client side**: DOM enhancement without touching framework source — a
  MutationObserver injects the sidebar menu entry and takes over the official
  branch button (capture-phase interception); the dialog is rendered with
  `react-dom`.

## Build from source (optional)

Requires a DSH source checkout (which ships esbuild):

```sh
DSH_SOURCE=/path/to/dsh-checkout node scripts/build.mjs
```

## Tests

```sh
npm test
```

Host-side smoke tests (fake ctx + real HTTP forwarding) cover: boundary
computation, cross-workspace attachment, title increment, `atSeq` anchoring,
and error branches.

## Repository layout

```
lib/index.js       Host half: /dsh-fork-ws API (zero dependencies)
lib/client.js      Client bundle (pre-built)
src/client/        Client source (TSX: menu injection / branch two-option menu / workspace picker dialog)
scripts/build.mjs  esbuild build script
tests/             Host smoke tests
```

## Compatibility

- Developed against DeepSeek Harness `0.1.0-rc.x` (developer preview); APIs may
  change without notice — review upstream changes before upgrading.
- Community project, not affiliated with DeepSeek.
- The plugin only uses official service seams (`webServer` / `sessions` /
  `agents` / `workspaceRegistry` / `sessionTitle` / `agentPresets`) and never
  modifies framework source.

## License

MIT
