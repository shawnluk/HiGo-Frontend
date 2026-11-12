# HiGo 前端待接入接口清单

> 统计时间：2026-11-12
> 核对范围：前端 `pages/`、`src/`、`components/`、`api/modules/`、`config/env.js`；后端 `HiGo-Backend/src/routes/`
> 当前环境：`useMock: false`，已接入接口均走真实后端

## 状态标记

| 标记 | 含义 |
| --- | --- |
| 【前端待接】 | 后端接口已提供，前端仍为 Toast / 本地数据，需联调 |
| 【前端入口】 | 页面或能力已存在，仅缺入口跳转，不需要新增后端接口 |
| 【后端待建】 | 后端尚无对应接口（部分页面已有前端占位） |
| 【前后端待建】 | 接口与页面均未实现 |

## 总览

| 页面 | 待接入项 | 后端已就绪 | 仅缺前端 | 需后端新增 |
| --- | ---: | ---: | ---: | ---: |
| 首页 | 4 | 1 | 0 | 3 |
| 动态页 | 3 | 0 | 1 | 2 |
| 消息 / 聊天室 | 4 | 0 | 0 | 4 |
| 「我的」页 | 11 | 0 | 0 | 11 |
| 登录 / 注册 | 5 | 0 | 0 | 5 |
| 活动详情 | 2 | 0 | 1 | 1 |
| 报名确认页 | 4 | 0 | 0 | 4 |
| 行程页 | 3 | 0 | 0 | 3 |
| 创建活动 | 1 | 0 | 0 | 1 |
| 发布动态 | 1 | 0 | 0 | 1 |
| 创建小队 | 1 | 0 | 0 | 1 |
| **合计** | **39** | **1** | **2** | **36** |

## 1 项可直接联调（后端已就绪）

| 页面 | 功能 | 后端接口 |
| --- | --- | --- |
| 首页 | 搜索关键字 | `GET /api/v1/activities?keyword=` |

## 已接入（不在待办范围）

- 登录 / 注册：`POST /api/v1/auth/login`、`POST /api/v1/auth/register`
- 首页活动：列表、详情、创建、热度上报、分类筛选（服务端 `category_id`）
- 分类：`GET /api/v1/categories`
- 动态：列表、发布、点赞、取消点赞、评论、删除评论
- 小队：详情 `GET /api/v1/squads/:id`（已对非成员开放）、我的小队 `GET /api/v1/squads/mine`、创建 `POST /api/v1/squads`、加入 `POST /api/v1/squads/:id/join`、退出 `POST /api/v1/squads/:id/leave`、转让队长 `POST /api/v1/squads/:id/captain`
- 创建活动：所在小队选择 `GET /api/v1/squads/mine`（含按用户记住上次选择、无小队时跳转创建小队、创建成功后返回自动回填新小队）

---

## 首页

- [ ] **搜索**：当前仅 Toast「搜索：xxx」；后端已支持关键字查询 → 【前端待接】 — `pages/index/index.vue:85-90`
- [ ] **筛选**：仅 Toast「筛选功能开发中」，无筛选面板与筛选参数 → 【后端待建】 — `pages/index/index.vue:91-94`
- [ ] **城市 / 区域**：Picker 仅本地切换并 Toast，H5 不支持；无定位或城市列表接口 → 【后端待建】 — `pages/index/components/index-top-bar.vue:73-88`
- [ ] **轮播图 / 广播**：轮播为组件内置静态数据，广播为 `MOCK_INDEX_BROADCAST`；无运营位内容接口 → 【后端待建】 — `pages/index/components/index-marquee.vue:15-23`

## 动态页

- [ ] **收藏**：仅 Toast「已收藏」，未调用任何接口 → 【后端待建】 — `components/moment-feed.vue:354-357`
- [ ] **分享**：仅 Toast「分享功能开发中」 → 【前端待接】 — `components/moment-feed.vue:348-353`
- [ ] **图片上传**：本地临时路径直接作为 `image_urls` 提交，无文件上传接口 → 【后端待建】 — `src/create-moment/create-moment.vue:162-170`

## 消息 / 聊天室

- [ ] **会话列表**：直接返回 Mock；后端 `GET /api/v1/messages` 是通知列表，不是会话聚合 → 【后端待建】 — `api/modules/message.js:9-11`
- [ ] **通知详情**：仅 Toast「通知详情开发中」 → 【后端待建】 — `pages/message/message.vue:166-171`
- [ ] **聊天记录**：直接返回 Mock，无聊天记录接口 → 【后端待建】 — `api/modules/message.js:19-24`
- [ ] **发送消息**：仅本地追加到列表，无发送接口 → 【后端待建】 — `pages/chat/chat-room.vue:79-93`

## 「我的」页

### 资料与会员

- [ ] **用户资料**：`fetchUserProfile` 已定义但页面未调用；后端无 `/api/v1/user/profile` 路由 → 【前后端待建】 — `api/modules/user.js:19-32`
- [ ] **头像保存**：裁剪完成后仅更新本地 `avatarUrl`，未上传、未更新资料 → 【后端待建】 — `pages/user/user.vue:305-314`
- [ ] **会员权益**：头部「查看会员权益 ›」为纯文案，无点击事件与页面 → 【前后端待建】 — `pages/user/components/user-header-panel.vue:26-30`

### 快捷入口

- [ ] **活动数据**：仅 Toast「功能开发中」，无数据统计接口 → 【后端待建】 — `pages/user/components/user-quick-entry-panel.vue:32-39`
- [ ] **收益明细**：仅 Toast「功能开发中」，无收益接口 → 【后端待建】 — `pages/user/components/user-quick-entry-panel.vue:32-39`

### 小队管理

- [ ] **小队置顶**：仅前端排序，无置顶接口 → 【后端待建】 — `pages/user/user.vue:253-272`

### 内容与资产

- [ ] **我的动态**：仅 Toast「功能开发中」，无列表接口 → 【后端待建】 — `pages/user/components/user-list-card.vue:34-45`
- [ ] **我的收藏**：仅 Toast「功能开发中」，无收藏列表接口 → 【后端待建】 — `pages/user/components/user-list-card.vue:34-45`
- [ ] **券票与订单**：仅 Toast「功能开发中」，无订单接口 → 【后端待建】 — `pages/user/components/user-list-card.vue:34-45`
- [ ] **我的客服**：仅 Toast「功能开发中」，无客服接口或页面 → 【后端待建】 — `pages/user/components/user-list-card.vue:34-45`
- [ ] **我的设置**：仅 Toast「功能开发中」，无设置页与接口 → 【后端待建】 — `pages/user/components/user-list-card.vue:34-45`

## 登录 / 注册

- [ ] **获取短信验证码**：仅倒计时 + Toast「验证码已发送（待接入）」 → 【后端待建】 — `src/login/login.vue:328-336`
- [ ] **手机号验证码登录**：校验后 Toast「手机号登录功能待接入」 → 【后端待建】 — `src/login/login.vue:344-356`
- [ ] **微信登录**：Toast「微信登录功能待接入」 → 【后端待建】 — `src/login/login.vue:363-366`
- [ ] **微信注册**：Toast「微信注册功能待接入」 → 【后端待建】 — `src/login/login.vue:363-366`
- [ ] **用户协议 / 隐私政策**：点击 Toast「页面待接入」 → 【前后端待建】 — `src/login/login.vue:358-361`

## 活动详情

- [ ] **收藏 / 取消收藏**：已登录 Toast「收藏功能开发中」 → 【后端待建】 — `src/activity-detail/activity-detail.vue:388-399`
- [ ] **分享**：Toast「分享能力即将接入」 → 【前端待接】 — `src/activity-detail/activity-detail.vue:421-423`

## 报名确认页

- [ ] **票种 / 价格 / 库存**：固定「单人票」，价格从 `fee_note` 解析，标注「（待接入）」 → 【后端待建】 — `src/activity-enroll/activity-enroll.vue:25-30`
- [ ] **优惠券**：显示「暂无可用（待接入）」 → 【后端待建】 — `src/activity-enroll/activity-enroll.vue:93-98`
- [ ] **提交报名**：姓名 / 手机号校验后 Toast「报名提交功能（待接入）」 → 【后端待建】 — `src/activity-enroll/activity-enroll.vue:228-239`
- [ ] **支付**：页面无支付流程 → 【后端待建】

## 行程页

- [ ] **行程列表**：使用 `MOCK_ITINERARY_ITEMS`，标注「（待接入）」 → 【后端待建】 — `src/itinerary/itinerary.vue:101-126`
- [ ] **行程筛选**：Toast「行程筛选功能待接入」 → 【后端待建】 — `src/itinerary/itinerary.vue:168-173`
- [ ] **行程详情**：Toast「行程详情待接入」 → 【后端待建】 — `src/itinerary/itinerary.vue:168-173`

## 创建活动

- [ ] **封面 / 富文本图片上传**：本地临时路径直接写入表单 → 【后端待建】 — `src/create-activity/create-activity.vue:403-421`

## 发布动态

- [ ] **图片上传**：本地临时路径直接作为 `image_urls` 提交 → 【后端待建】 — `src/create-moment/create-moment.vue:162-170`

## 创建小队

- [ ] **小队头像上传**：本地选择，文案标注「（待接入）」 → 【后端待建】 — `src/create-unit/create-unit.vue:336-352`
