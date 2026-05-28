# curate-templates.mjs

LLM-based benchmark template curation (issue #117 / B2).

Usage:
- export OPENAI_API_KEY=...
- export OPENAI_BASE_URL=https://api.openai.com/v1   # 或合作伙伴 sub2api endpoint
- npm run curate -- --dry-run                         # 前 5 条验证
- npm run curate                                      # 全部 968 条 -> scripts/templates-candidates.json
- npm run curate -- --top 60 --concurrency 8

Output JSON is consumed by #119 (B4) human curation.
