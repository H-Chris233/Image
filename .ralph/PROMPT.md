你在为 GitHub 仓库 `H-Chris233/Image` 跑**一轮**自主修复循环。**只做一个 issue 就停**。动作要外科手术式精确。基分支是 `main`。

## 一、选 issue
1. 跑 `gh issue list --repo H-Chris233/Image --state open --label ready-for-agent --label ralph --json number,title,labels`。
2. 选**编号最小**、且标签里**没有** `in-progress` / `has-pr` / `needs-human`、且没有已关联开放 PR 的那个。
3. 若没有可选的 → 原样打印 `RALPH_RESULT: NO_ELIGIBLE` 然后**停止**，什么都不要改。

## 二、认领 + 切分支
4. `gh issue edit <N> --repo H-Chris233/Image --add-label in-progress`
5. `git fetch origin`
6. `git checkout -B ralph-base origin/main`
7. `git checkout -b fix/issue-<N>-<英文短slug>`

## 三、实现
8. `gh issue view <N> --repo H-Chris233/Image` 读正文，**严格按它实现**。
9. diff **只限本 issue**，最小化。**绝不**碰 `.env*`、密钥、或其他 issue 的范围、或与本 issue 无关的文件。

## 四、门禁（四条**各自单独**跑，全绿才算过；不要用 && 串起来）
10. `npm run lint`
11. `npm run build`
12. `npm run test:account`
13. `python -m pytest`
14. 任一条失败、且**本 issue 范围内修不好**：
    - `git checkout ralph-base` ；`git branch -D fix/issue-<N>-<slug>`
    - `gh issue edit <N> --repo H-Chris233/Image --remove-label in-progress --add-label needs-human`
    - `gh issue comment <N> --repo H-Chris233/Image --body "Ralph 门禁未过：<一句话失败原因>。需人工。"`
    - 打印 `RALPH_RESULT: SKIPPED #<N>` 然后**停止**。

## 五、交付（门禁全绿）
15. `git add <仅本次改动的文件>`（**不要 `git add -A`**，避免误带入未跟踪文件）；`git commit -m "<type>(<scope>): <一句话>` 正文含 `Closes #<N>`。
16. `git push -u origin fix/issue-<N>-<slug>`
17. `gh pr create --repo H-Chris233/Image --base main --head fix/issue-<N>-<slug> --title "<标题>" --body "改动摘要 + 门禁结果（lint/build/test:account/pytest 均绿）。Closes #<N>"`
18. `gh pr merge <PR号> --repo H-Chris233/Image --squash --delete-branch`
19. `gh issue edit <N> --repo H-Chris233/Image --remove-label in-progress --add-label has-pr`（issue 会因 Closes 自动关闭，标签仅作追踪）
20. `git checkout ralph-base`
21. 打印 `RALPH_RESULT: DID_ISSUE #<N>` 然后**停止**。

## 铁律（绝不违反）
- 绝不直接 push `main`，绝不在 `main`/`ralph-base` 上 commit；只能通过自己 PR 的 squash 合并进 main。
- 绝不 `--no-verify`、`--force`、`--dangerously-skip-permissions`。
- 绝不动 `.env*`、密钥、或标签为 `ready-for-human`/`needs-triage` 的 issue 范围。
- 一轮只做一个 issue。结尾**必须且只有一行** `RALPH_RESULT:`（NO_ELIGIBLE / DID_ISSUE #N / SKIPPED #N 三选一）。
