# 会话日志

> 生成时间：2026-11-04
> 项目：HiGo-Frontend（uni-app / Vue 3）
> 主题：自定义底栏（tabbar）多机型贴底修复、H5 端 region 选择器警告修复、顶部栏状态栏避让与底栏间距微调

---

## 一、会话概览

本次会话围绕「自定义底栏在部分机型上完全看不到」这一问题展开。排查结论：底栏原先使用 `position: fixed`，在部分 H5 / 5+App 机型的 WebView 上 fixed 定位基准不可靠（会相对页面内容而不是视口定位），因此无论怎么调整安全区、层级、溢出，仍可能在特定机型上整条不可见。

最终改为「`position: sticky` + 撑满一屏的布局」方案：底栏不再依赖 fixed，而是相对滚动容器可视区域贴底。同时附带修复了 H5 端 `picker mode="region"` 的 Vue prop 校验警告、顶部栏被系统状态栏（时间 / 电量）遮挡、以及底栏与屏幕底部间距过大的问题。

---

## 二、修改文件

### 1. `components/bottom-tab-bar.vue`（底栏定位重构）

定位方式：

- 外层 `.bottomTabbarWrapper` 由 `position: fixed` 改为 `position: sticky; bottom: 0`，并保留 `position: fixed`（不支持 sticky 的极老 WebView 兜底）与 `position: -webkit-sticky`（老 iOS）。
- 声明顺序为 `fixed → -webkit-sticky → sticky`，支持 sticky 的环境取最后一条。

尺寸与安全区：

- 不再用 `bottom: 30rpx` 悬浮，改为容器贴底后由 `padding-bottom` 控制悬浮间隙。
- 悬浮间隙由 30rpx 收小到 10rpx，安全区三级兜底：
  - `padding-bottom: 10rpx;`
  - `padding-bottom: calc(10rpx + constant(safe-area-inset-bottom));`
  - `padding-bottom: calc(10rpx + env(safe-area-inset-bottom));`

视觉与命中：

- 胶囊本体 `.bottomTabbar` 增加 `box-sizing: border-box`。此前 `width: 92%` + `padding: 0 40rpx` 未加 box-sizing，实际宽度 = 92% + 80rpx，窄屏机型会超出屏幕左右各十余像素，首尾 tab 被裁掉。
- 原外层 2rpx 渐变边框改为胶囊自身 `box-shadow: inset 0 0 0 2rpx #e6e6e6`（观感基本一致）。
- 胶囊宽度改为 `width: 100%`，由外层 `padding-left/right: 20rpx` 与 `max-width: 700rpx` 共同约束。
- `z-index: 999`；外层 `pointer-events: none`、胶囊 `pointer-events: auto` 保持不变。

### 2. `components/page-scaffold.vue`（骨架布局配合）

- 模板：`<slot />` 外包一层 `<view class="pageBody">`，底栏移至内容区之后，保证 sticky 有正常文档流位置。
- `.pageScaffold`：`min-height: 100%` → `min-height: 100vh`。
- `.pageBody`：`min-height: calc(100vh - 130rpx)`（130rpx = 120rpx 胶囊 + 10rpx 间隙），内容不足一屏时底栏仍落在屏幕底部。

### 3. `pages/moment/moment.vue` / `pages/message/message.vue`（移除重复底部留白）

- `momentPage` 删除 `padding-bottom: calc(140rpx + env(safe-area-inset-bottom))`。
- `messagePage` 的 `padding: 0 24rpx 140rpx` 改为 `padding: 0 24rpx`。
- 原因：底栏已占据文档流空间，继续保留页面级底部 padding 会造成双重留白，且滚到页面最底部时底栏会向上跳 140rpx。

### 4. `pages/index/components/index-top-bar.vue`（两处）

H5 端 `picker` 警告：

- `<picker mode="region">` 用条件编译 `<!-- #ifndef H5 -->` 包裹，仅在小程序 / App 端保留；H5 端编译后只保留展示用的 `.locationBox`。
- 原因：uni-app H5 的 `uni-picker` 不支持 region 模式（运行时源码中 `mode` 枚举里 REGION 被注释），其 `mode` prop 带自定义校验，传入 `region` 会触发 `Invalid prop: custom validator check failed for prop "mode"`。
- H5 端新增 `handleLocationTap()`，点击定位区域提示「H5 端暂不支持城市选择」（`uni.showToast`，仅 H5 条件编译生效）。

状态栏避让：

- `.topBar` 由 `padding: 0 8rpx` 改为 `padding-top: var(--status-bar-height, 0px); padding-left/right: 8rpx;`。
- 原因：`pages.json` 全局 `navigationStyle: custom`，页面内容会顶到屏幕上沿，被系统状态栏（时间 / 电量）覆盖。该 CSS 变量在 App / 小程序返回系统状态栏高度，H5 返回 0。

---

## 三、验证建议

1. H5 手机浏览器、5+App（至少各一台此前出问题的机型）打开首页 / 动态 / 消息 / 我的，确认底栏始终贴在屏幕底部，滚动过程中不消失、不闪烁。
2. 检查 4 个 tab 页在内容不足一屏时底栏仍位于屏幕底部（不被内容顶到中间）。
3. 消息 / 动态页滚到最底部，确认没有多余的空白、底栏不会上跳。
4. H5 控制台确认 `Invalid prop: custom validator check failed for prop "mode"` 警告已消失。
5. App 端确认首页顶部栏不再被状态栏遮挡；若 App 端顶部反而多出一条空白，说明该端状态栏非沉浸式，需要把 `padding-top` 改为固定值或不加。

---

## 四、注意点

- sticky 依赖「祖先没有 `overflow: hidden`」以及「页面由滚动容器滚动」。当前 uni-app H5/App 的 `uni-view` 默认是 `display: block`（无 overflow），页面由文档或页面容器滚动，满足条件；若后续给 `.pageScaffold` / `.pageBody` 加 `overflow: hidden`，底栏会退回文档流末尾而不再贴底。
- 页面级下拉刷新（`onPullDownRefresh`）与触底加载（`onReachBottom`）逻辑未改动，仍走页面滚动，无需迁移到 `scroll-view` 事件。
- H5 端城市选择暂不提供（仅展示当前城市 · 区县），小程序 / App 行为不变。
- 本次改动未提交，工作区改动文件：`components/bottom-tab-bar.vue`、`components/page-scaffold.vue`、`pages/index/components/index-top-bar.vue`、`pages/moment/moment.vue`、`pages/message/message.vue`。
