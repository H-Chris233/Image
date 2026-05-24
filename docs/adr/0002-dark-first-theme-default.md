# ADR 0002 · 暗色优先的主题默认策略

**状态**：已决定  
**日期**：2026-05-18

> 2026-05-21 更新：本 ADR 的 **dark-first 决策仍然有效**，但下文关于 “Aether Fruit / 深空背景 / 高饱和渐变色 / 玻璃卡片” 的视觉理由已被后续 Warm Charcoal UI 标准取代。当前 UI 执行标准以 `src/design-system/design.md` 为准；不要从本 ADR 恢复 cyan / violet / Genesis gradient 作为新增 UI 主视觉。

## 背景

原有代码跟随系统偏好（`prefers-color-scheme`），没有产品层面的主题立场。Aether Fruit 设计系统以深空背景为核心，暗色模式下品牌色彩效果最佳。

## 决定

**首次访问默认暗色（dark-first）**，忽略系统偏好。用户手动切换后记住偏好，后续访问尊重该选择。

即：`getInitialTheme()` 在无存储值时返回 `'dark'`，不读 `prefers-color-scheme`。

## 理由

- Aether Fruit 设计语言（深空背景 + 高饱和渐变色 + 玻璃卡片）在暗色下效果显著优于浅色
- 产品定位为 AI 创作工具，对标 Lovart、Midjourney、Figma 等同类产品均采用暗色优先
- 用户首次打开看到品牌设计的完整效果，建立正确的视觉印象

## 被放弃的方案

- **跟随系统偏好**：工具类产品的行业惯例，更「礼貌」。但会导致浅色系统用户第一眼看不到 Aether Fruit 最佳效果
- **强制暗色（不可切换）**：过于强硬，无障碍访问友好度差

## 影响

- `ThemeProvider.getInitialTheme()` 逻辑变更
- `index.html` 内联脚本的 localStorage key 已更新为 `aethergenix_theme`
- 浅色模式仍需完整维护，不可降级
