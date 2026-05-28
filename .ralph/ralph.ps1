<#
.SYNOPSIS
  Ralph loop —— 反复唤起 claude -p，每轮自主修复一个 ready-for-agent + ralph 的 issue。
  状态全在 GitHub(labels) + git；每轮全新 context，不滚雪球。

.NOTES
  基分支 main（每轮从 origin/main 切 fix 分支）；门禁绿后 squash 合并进 main。
  护栏在 .ralph/PROMPT.md。本脚本只负责：循环、记日志、停机判断、轮间安全检查。

.EXAMPLE
  pwsh .ralph/ralph.ps1                 # 默认最多 12 轮
  pwsh .ralph/ralph.ps1 -MaxIterations 3
#>
[CmdletBinding()]
param(
  [int]$MaxIterations = 12,
  [int]$MaxConsecutiveFailures = 3
)

$ErrorActionPreference = 'Stop'
$RepoRoot   = Split-Path -Parent $PSScriptRoot
$PromptPath = Join-Path $PSScriptRoot 'PROMPT.md'
$LogPath    = Join-Path $PSScriptRoot 'run.log'
Set-Location $RepoRoot

if (-not (Get-Command claude -ErrorAction SilentlyContinue)) {
  throw "找不到 claude CLI，请确认已安装并在 PATH 中。"
}
$Prompt = Get-Content -Raw $PromptPath

# 与 .claude/settings.local.json 的白名单一致，双保险，避免 headless 卡权限
$Allowed = @(
  'Edit','Write','Read','Grep','Glob',
  'Bash(git:*)','Bash(gh:*)','Bash(npm:*)','Bash(npx:*)','Bash(python:*)','Bash(node:*)','Bash(cd:*)'
) -join ','

function Log([string]$msg) {
  $line = '[{0}] {1}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $msg
  Write-Host $line
  Add-Content -Path $LogPath -Value $line
}

Log "===== Ralph loop start (max=$MaxIterations, failCap=$MaxConsecutiveFailures) ====="
$fails = 0

for ($i = 1; $i -le $MaxIterations; $i++) {
  Log "----- iteration $i -----"

  # 一轮自主执行：长 prompt 走 stdin 更稳
  $output = ($Prompt | & claude -p --allowedTools $Allowed 2>&1) | Out-String
  Add-Content -Path $LogPath -Value $output

  if     ($output -match 'RALPH_RESULT:\s*NO_ELIGIBLE')        { Log '没有可处理的 issue，结束。'; break }
  elseif ($output -match 'RALPH_RESULT:\s*DID_ISSUE\s*#(\d+)') { Log "完成 issue #$($Matches[1])。"; $fails = 0 }
  elseif ($output -match 'RALPH_RESULT:\s*SKIPPED\s*#(\d+)')   { Log "跳过 issue #$($Matches[1])（门禁未过）。"; $fails++ }
  else                                                          { Log '未见 RALPH_RESULT 哨兵，按失败计。'; $fails++ }

  # 轮间安全检查：工作树必须干净，否则停（不强制丢弃，可能有半成品要人看）
  $dirty = git status --porcelain
  if ($LASTEXITCODE -ne 0) { Log 'ABORT: git status 失败。'; break }
  if ($dirty)              { Log ("ABORT: 轮后工作树不干净：`n" + ($dirty -join "`n")); break }

  if ($fails -ge $MaxConsecutiveFailures) { Log "ABORT: 连续失败 $MaxConsecutiveFailures 次。"; break }
}

Log '===== Ralph loop end ====='
