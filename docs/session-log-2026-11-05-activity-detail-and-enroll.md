# 会话日志

> 生成时间：2026-11-05
> 项目：HiGo-Frontend（uni-app / Vue 3 `<script setup>`） + HiGo-Backend（Node.js / Koa）
> 主题：活动详情返回值排查、热度上报接口补齐、报名成员展示、头像滚动条、新增报名确认页（activity-enroll）

---

## 一、会话概览

本次会话围绕活动详情页的数据链路与报名入口展开，包含五块：

1. **详情返回数据排查**：在详情页打印接口/缓存返回的原始对象，便于核对字段。
2. **热度上报 404 修复**：后端补齐 `POST /api/v1/activities/:id/views`，支持登录用户与匿名设备去重。
3. **报名成员展示**：详情接口补充 `members` / `member_count`，前端渲染报名用户头像与人数。
4. **头像区域交互**：固定显示 6 个头像，超出后可横向滑动，并新增可拖动的主题色横向滚动条。
5. **报名确认页**：新建 `src/activity-enroll`，按 `unitone-ui/报名确认.png` 还原 UI，详情页「立即报名」携带 `activity_id` 跳转。

---

## 二、修改文件

### 前端（HiGo-Frontend）

| 文件 | 说明 |
| --- | --- |
| `src/activity-detail/activity-detail.vue` | 详情返回值日志、报名成员头像/人数渲染、6 头像可视区 + 自定义可拖动横向滚动条、「立即报名」登录拦截与跳转 |
| `src/activity-enroll/activity-enroll.vue` | 新增报名确认页（原命名 `activity-signup`，按反馈改为 `enroll`） |
| `pages.json` | 注册报名确认页路由 `src/activity-enroll/activity-enroll` |
| `api/modules/activity.js` | 未改动；沿用 `fetchActivityDetail`（缓存优先）与 `reportActivityView` |
| `utils/activity-cache.js` | 未改动；报名页复用 `getCachedActivity` / `cacheActivities` 能力 |

### 后端（HiGo-Backend）

| 文件 | 说明 |
| --- | --- |
| `src/routes/activities.js` | 新增 `POST /api/v1/activities/:id/views` 热度上报路由 |
| `src/services/activity-service.js` | 新增 `reportActivityView`；活动详情补充 `members` / `member_count` |
| `src/db/queries.js` | 新增按活动批量查询报名成员、`INSERT IGNORE` 浏览记录、热度 +1 语句 |
| `src/app.js` | 热度上报接口允许匿名访问，携带 token 时仍解析用户身份 |

---

## 三、详情页返回值排查

### 1. 日志位置

在 `src/activity-detail/activity-detail.vue` 的 `loadActivityDetail` 中保留一条日志，输出接口/缓存返回的原始对象：

```js
console.log(`[HiGo] 活动详情-返回数据（activity_id=${activityId}）=>`, data)
```

其余路由参数、列表传入数据、JSON 展开、归一化后数据的日志均已移除。

### 2. 数据来源

`fetchActivityDetail(id)` **缓存优先**：

- 命中 `higo:activity-cache` → 直接返回列表加载时写入的条目，不发请求；
- 未命中 → 请求 `GET /api/v1/activities/:id`。

因此首页进详情时日志输出的是缓存对象；小队详情、清缓存、换设备等场景才是接口返回对象。

---

## 四、热度上报接口补齐

前端报错 `POST http://127.0.0.1:3000/api/v1/activities/1/views 404`，原因是后端缺少该路由（数据库已有 `hot` 字段与 `activity_views` 表）。

### 实现要点

- 已登录按 `user_id` 去重；未登录按 `device_id` 去重。
- 重复访问返回 `added: false`，热度不增加。
- 返回 `{ hot, added }`；活动不存在返回 404。
- 路由允许匿名访问，携带 token 时仍解析用户身份。

实测返回：

```json
{"code":0,"success":true,"message":"ok","data":{"hot":9,"added":true}}
```

同一设备重复请求返回 `added:false`。

---

## 五、报名成员展示

### 1. 后端

`getActivityDetail` 查询 `activity_member`（仅 `member_status = 1`），将报名用户映射为：

```json
"members": [{ "user_id": 2, "nickname": "娜娜", "avatar": "https://..." }],
"member_count": 3
```

其中：

```js
activity.member_count = activity.members.length
```

即 `member_count` 就是 `members` 数组长度，不是额外统计字段。

### 2. 前端展示

- 头像列表：`members[].avatar`
- 人数优先级：`members.length` → `member_count` / `memberCount` → `joinCount` → 头像数量 → 0
- 页面使用 `detail.joinCount` 渲染「已报名 N 人」

### 3. 缓存一致性说明

列表接口 `GET /api/v1/activities` 原本就返回 `members` / `member_count`；详情接口本次补齐后两个接口字段结构一致。首页进详情仍走缓存，详情接口的补充主要用于无缓存场景兜底。缓存过期时人数可能滞后，如需实时人数应改为强制请求详情接口。

---

## 六、头像区域与横向滚动条

### 1. 固定 6 个头像

- 可视区宽度 `560rpx` = `6×80rpx` + `5×16rpx` 间距。
- `.joinAva` 增加 `box-sizing: border-box`，把 `3rpx` 边框计入 `80rpx`，避免第 6 个被裁切。

### 2. 自定义横向滚动条

原生 `scroll-view` 滚动条已通过 `show-scrollbar="false"` 隐藏，改为自绘：

- 仅在头像超过 6 个时显示。
- 滑块宽度按「可视宽度 / 内容宽度」比例计算，最小 `24px` 便于拖动。
- 支持触摸拖动；H5 桌面端额外支持鼠标拖动。
- 拖动滑块同步滚动头像；直接滑动头像时滑块位置同步更新。
- 配色：轨道 `rgba(255, 59, 48, 0.08)`，滑块 `#ff7a45 → #ff3b30` 渐变。

相关实现位于 `src/activity-detail/activity-detail.vue` 的模板（`avaWrap` / `avaBar`）、脚本（`avatarScrollLeft` 等状态与拖拽处理）与样式段。

---

## 七、报名确认页（activity-enroll）

### 1. 页面结构

按 `unitone-ui/报名确认.png` 还原：

- 顶部返回 + 「确认报名」标题；
- 活动摘要卡：封面、标题、时间、地点；
- 「选择票种」：单人票 + 数量步进器 + 合计（票种接口未接入，标注「（待接入）」）；
- 「报名人信息」：姓名、手机号、备注，自动预填登录用户信息；
- 「优惠券」：暂无可用（待接入）；
- 底部固定栏：已选数量 + 合计金额 + 「提交报名」按钮，提交时做姓名/手机号校验后提示「报名提交功能（待接入）」。

金额处理：从 `fee_note` 解析 `¥xx` 作为单价并按数量计算合计；包含「免费」显示「免费」；无法解析显示「以说明为准」。

### 2. 活动信息传递方案

采用「只传 `activity_id` + 缓存优先解析」，不把完整活动 JSON 塞进 URL：

- 详情页「立即报名」：
  - 未登录 → 弹窗引导登录；
  - 已登录 → `uni.navigateTo({ url: '/src/activity-enroll/activity-enroll?activity_id=xxx' })`。
- 报名页 `onLoad`：
  - `fetchActivityDetail(id)`：命中缓存直接展示，未命中请求详情接口；
  - 拿到接口数据后 `cacheActivities([data])` 回写缓存，避免重复请求。

选择理由：

| 方式 | 问题 |
| --- | --- |
| 只传 `activity_id`（采用） | 无 |
| URL 传完整活动 JSON | 活动描述长时 URL 可能超长、字段易过期、转义易出错 |
| Storage 临时传递 | 需清理逻辑，更适合表单草稿而非只读活动信息 |

### 3. 命名调整

原页面命名为 `src/activity-signup/activity-signup`，因 `signup` 易与「注册」混淆，按反馈改为：

- 目录 / 文件：`src/activity-enroll/activity-enroll.vue`
- 路由：`src/activity-enroll/activity-enroll`
- 跳转路径：`/src/activity-enroll/activity-enroll?activity_id=xxx`

页面标题仍为「确认报名」。

---

## 八、接口清单（活动相关）

| 方法 | 路径 | 前端函数 | 用途 |
| --- | --- | --- | --- |
| GET | `/api/v1/activities` | `fetchHomeActivityList` | 首页列表、发布动态选择关联活动 |
| GET | `/api/v1/activities/:id` | `fetchActivityDetail` | 详情页缓存未命中兜底（`fetchActivityDetail` 目前仅详情页使用） |
| POST | `/api/v1/activities` | `createActivity` | 创建活动 |
| POST | `/api/v1/activities/:id/views` | `reportActivityView` | 点击活动上报热度 |

---

## 九、待接入项

- 票种 / 价格体系：当前仅从 `fee_note` 提取金额，无独立票种与库存接口。
- 优惠券：展示「暂无可用（待接入）」。
- 报名提交：仅做前端校验，未落库。
- 报名成功后的人数与热度刷新：待报名接口接入后再补。
