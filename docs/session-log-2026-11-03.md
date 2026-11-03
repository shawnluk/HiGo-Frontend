# 会话日志

> 生成时间：2026-11-03
> 项目：HiGo-Frontend（uni-app / Vue）
> 对应提交：`4b213d7`（提交信息 `20260821/mac/1`，已推送至 `higo-origin/master`）
> 主题：首页整体改版（顶部定位 / 搜索 / logo / 铃铛、活动卡片重构、分类与热度标签、全局字体与配色）

---

## 一、会话概览

本次会话按 `unitone-ui/首页.png` 参考图对首页做整体改版：先用参考图迁移配色（白底 + 深色文字 + 红色强调），随后重构顶部区域（城市定位、搜索框上移、右上角通知铃铛与 logo），并对活动卡片做纵向布局重构，补充分类淡色标签、可点击热度标签、参与头像横向滑动、时间格式化、收藏登录拦截等能力。最后接入全局微软雅黑字体并完成提交推送。

---

## 二、修改文件（前端）

### 1. `pages/index/components/index-top-bar.vue`（新建）
- 顶部栏分左右两块：
  - 左侧城市定位：`picker mode="region"` + `locIcon`（`/static/address.png`）+ 「当前城市」标签（`locLabelRow` 同一行）+ 城市·区县（`locCityRow`，带 `▾`）。
  - 右侧：通知铃铛（带红点）+ 品牌 logo（`/static/logo-nav.png`，替代原头像）。
- 对外事件：`bell` / `avatar` / `region-change`。
- 细节：logo `122×60rpx`、`flex-shrink:0`、`translateY(-30rpx)` 上移；`locIcon` 30rpx 且与「当前城市」同行居中；左侧定位区 `flex:1` 并省略超长城市名，避免挤压右侧。

### 2. `pages/index/components/index-search-box.vue`（重构）
- 改为**全宽圆角胶囊**搜索框：左侧搜索图标 + 右侧红色「筛选」入口。
- 移除原城市选择（已上移到顶栏）。
- 配色改为浅灰底 + 细灰边框（去掉原 burlywood 边框）。

### 3. `components/home-activity-card.vue`（核心重构）
- 卡片改为**纵向布局**：封面图顶部全宽。
- 封面浮层：左上角「分类标签 + 热度标签」、右上角收藏心形、左下角时间。
- **分类标签**：按 `category_id` 映射 5 种淡色（蓝 / 紫 / 绿 / 橙 / 粉），文字优先取 `category_key`。
- **热度标签**：显示活动 `hot` 字段，点击走 `reportHot` 上报热度（移除原顶部「本周热门」`hotBadge`）。
- **参与头像**：`scroll-view` 横向滚动，默认露出约 3 个，增加底部横向滚动条（H5 端 `::-webkit-scrollbar`）。
- 删除「+」图标与「已有好友报名」文字及相关样式。
- **参与人数**：优先读后端 `joinCount`（兼容 `member_count`），不再误取头像数量。
- **时间格式化**：输出 `M月D日 H时M分，周X`。
- **收藏登录拦截**：未登录弹窗提示「登录后即可收藏活动」→ 去登录跳 `/src/login/login`；已登录仅做本地状态切换，后端接口暂搁置。

### 4. `pages/index/components/home-category-bar.vue`
- 图标下文字优先取接口返回的 `category_key`。
- 整体高度压缩：图标容器 `76→64rpx`、图标 `56→48rpx`、文字上边距 `10→6rpx`、卡片内边距 `10→8rpx`。
- 配色：外容器去紫渐变改透明、卡片白底 + 淡边框、图标底座浅灰、文字深色、选中态改红色系。

### 5. `pages/index/components/index-marquee.vue`
- `📢` emoji 改为引用 `/static/note.png`（30rpx）。
- 广播条配色由紫改红色系。

### 6. `pages/index/components/index-logo-bubble.vue`
- 配色由紫改红（首页已不再使用该组件）。

### 7. `pages/index/index.vue`
- 引入 `IndexTopBar`，移除 `IndexLogoBubble`。
- `indexContent` 改为 `indexHeader` 纵向布局（顶部栏 + 搜索框）。
- 新增占位事件：`onBell` / `onAvatar` / `onFilter` / `onRegionChange`。
- 下拉刷新 spinner 由紫改红。

### 8. `components/bottom-tab-bar.vue`
- 外框渐变改中性浅灰，选中态改浅红底 + 红字。
- 注意：该组件为全局共享，会影响「时刻 / 消息 / 我的」页。

### 9. `components/page-scaffold.vue`
- `showTopBar` 默认值 `true → false`（首页改用自定义顶部栏）。

### 10. `App.vue`
- `page` 及 `button/input/textarea/scroll-view/picker/label` 统一设置 `font-family`：优先 `Microsoft YaHei`（微软雅黑），macOS/iOS 回退 `PingFang SC` 等。

---

## 三、新增 / 替换静态资源

| 文件 | 说明 |
|------|------|
| `static/logo-nav.png` | 新增，裁剪为紧凑字标的导航 logo |
| `static/note.png` | 新增，广播条公告图标（替代 emoji） |
| `static/address.png` | 替换，定位图标 |
| `static/address-1.png` | 新增，定位图标备用图 |

---

## 四、关键交互与数据说明

- **首页数据加载**：`created` 时即 `refresh()` → `fetchPage()` 写入 `activityList`，再经 `applyCategoryFilter(null)` 全量铺到 `filteredItems`，因此未点分类也能看到全部活动；分类按钮只切换 `filteredItems` 的子集。
- **热度上报**：点击「热度」标签或卡片进详情均走 `reportHot` → `reportActivityView` → `applyHotResult`，后端按 token/设备去重，`added` 为 true 才 +1。
- **收藏**：仅前端登录拦截与本地状态，后端接口待补。

---

## 五、遗留事项

- 顶栏「铃铛 / 头像 / 筛选 / 搜索 / 区域切换」目前均为占位 `uni.showToast`，待接入真实跳转逻辑。
- 收藏功能后端接口暂搁置，目前仅本地状态。
- `components/home-activity-card.vue` 中保留调试日志 `console.log('[HiGo] 首页活动列表返回值 =>', res)`，确认返回结构后可移除。
- 全局字体优先微软雅黑，但该字体属 Windows 系统字体；macOS 调试时会回退到苹方，如需在 Mac 一致显示需另引入 `@font-face`。
- 底部 TabBar 为全局共享组件，配色改动会同步影响其他 Tab 页。
