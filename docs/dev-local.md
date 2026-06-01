# 本地开发速记

> 写在 feature 分支、经 PR 进 main。`Image/`（主仓库）常驻只读 main，不直接改。

## 多开时共享登录态（新端口自带登录）

登录态 = 后端在浏览器设的 session cookie（host-only，作用于整个 `localhost`、**不含端口**）。
因此新开一个端口能否自带登录，取决于下面三条，**满足即零配置自带登录**：

1. **统一用 `localhost`**：所有前端都用 `http://localhost:<port>` 访问。
   不要和 `127.0.0.1` 混用——它和 `localhost` 是不同 host，cookie 不互通（真正的隔离点在 host，不在端口）。
2. **所有前端代理到同一个后端**：vite 默认代理到 `127.0.0.1:8000`（见 `vite.config.ts` 的 `VITE_BACKEND_PROXY_TARGET`）。
   不要每开一个前端就在各自目录 `npm run backend` 起一个新后端。
3. **只起一个后端 + 一个库**。

> 实证（2026-06-01）：`localhost:3001` 登录后，全新 `localhost:3007`（同后端）打开即自带登录态，无需重登。

## 推荐做法

- **多开只多开前端**：`npm run dev` 用不同端口，后端只起一个。登录一次，所有端口共享。

## 为什么会“每次重登”（多库陷阱）

`DATABASE_PATH` 默认是**相对路径** `./backend/data/app.sqlite3`（见 `backend/app/settings.py`），
解析依赖启动后端时的工作目录。**在不同目录（各 worktree / 主仓库）各起后端 = 各连各的库 = 登录态不共享**，
新目录的后端是空库，就要重登。

session 本身是持久的：文件型 SQLite + `SESSION_TTL_SECONDS=2592000`（30 天）。后端不会“丢”登录，是连错了库。

## 若确实要每个 worktree 各跑全栈后端

把 `.env` 的 `DATABASE_PATH` 设为**绝对路径**，所有目录指向同一个库文件，多后端共享 session。
代价：① 不同分支 schema 可能不一致；② SQLite 并发写有锁风险。优先用“多前端 + 单后端”，避免走这条。

## 本地跑 UI smoke（`npm run smoke:ui`）

CI 的 UI smoke gate 在 Windows 本地复现要点：

- **用 PowerShell，别用 Git-bash**：Git-bash 会把 `/` 开头的环境变量值当路径转换（`/explore` 被转成 Windows 路径），过滤器会静默匹配不到、0 用例跑。
- **temp 必须落在非系统盘**：脚本拒绝 temp 落在 `C:`。worktree 在 C 盘时用 `$env:UI_SMOKE_TMP_ROOT` 指到非系统盘（CI 在 ubuntu 不触发此护栏）；多实例并行用不同子目录避免缓存争用。
- **按组跑**：`$env:UI_SMOKE_ONLY='<正则>'` 只跑名字匹配的用例（如 `/explore`、`shell icon controls`），快速迭代；CI 不设此 env 跑全量。
- **全量调大超时**：`$env:UI_SMOKE_TIMEOUT_MS='540000'`（全量约 41 项，默认 240s 会超时）。
- smoke 用 vite dev server（端口/CDP 自动避让、profile 带 pid），不需要 build，可并行多实例。

示例（只跑 explore 组）：

```powershell
$env:UI_SMOKE_TMP_ROOT='D:\path\to\smoke-tmp\explore'; $env:UI_SMOKE_ONLY='/explore'; $env:UI_SMOKE_TIMEOUT_MS='180000'; npm run smoke:ui
```

> smoke 用例须跟随 studio IA 演进同步：`/explore` = InspirationSurface 营销页、`/create` = StudioPage 模板画廊、主导航 = studio LeftNav。删页面时记得同步 `scripts/design-system-smoke.mjs` 的 `activeSourceFiles` 清单，否则 design-system smoke 报 ENOENT。
