# AGENTS.md

## 约束文件

根目录或 `docs/` 的文档是唯一权威，按需创建，包括但不限于：

```text
ARCHITECTURE.md
CONTEXT.md
docs/adr/
docs/contracts/
docs/migrations/
docs/design-system/
```

重要长期约束放入上述位置，是项目架构、决策，以及所有 agent 执行任务的唯一权威。

设计系统权威见 `src/design-system/design.md`，对应静态预览见 `src/design-system/preview/index.html`；agent skills（issue tracker、triage labels、domain docs）见 `docs/agents/`。

## 本地工作区

所有不是长期约束的内容和临时产物，只放入：

```text
.scratch/
.temp/
.draft/
```

不得提交：

```text
.scratch/
.temp/
.draft/
```

不得在根目录或 `docs/` 放临时产物。

临时内容不作为项目事实保留。需要进入项目的内容，必须改成正式文件修改，并走 GitHub 工作流。

## 正式开发

`source code` 修改只能通过 GitHub issue / branch / PR 进入项目事实区域。

自行创建分支。

branch 命名：

```text
codex/<issue-number>-<short-topic>
```

无 issue 且已明确授权的小修：

```text
codex/no-issue-<short-topic>
```

## 验证

不得声称未实际运行的验证已通过。
