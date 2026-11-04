# 会话日志

> 生成时间：2026-11-04
> 项目：HiGo-Frontend（uni-app / Vue 2）
> 主题：消息页按参考 UI 完全重构、分类 Tab 配置抽离、时刻页切换主题红配色

---

## 一、会话概览

本次会话以 `unitone-ui/消息.png` 为基准，完全重写了消息页：顶部大标题与通知铃铛、胶囊搜索框、分类 Tab、白色圆角会话卡片、未读角标与空状态。随后将页面内硬编码的分类 Tab 抽离为独立配置，最后把时刻页从紫粉配色切换为当前主题红。

关键背景：

- 页面主色为红 `#ff3b30`，辅助深红 `#e8453c`。
- 底栏为自绘组件 `components/bottom-tab-bar.vue`，消息页 `tab-index = 3`。
- 后端会话聚合接口尚未提供，消息会话数据暂由 mock 占位。
- 全局 mock 由 `config/env.js` 的 `useMock` 控制。

---

## 二、消息页重构

### 1. `pages/message/message.vue`（完全重写）

页面结构：

1. **顶部栏**：左侧大标题「消息」（64rpx / 700），右侧白色圆形铃铛按钮；存在未读时铃铛显示红点，点击进入「系统通知」Tab。
2. **搜索框**：胶囊圆角、浅灰底 + 细描边，使用 CSS 绘制放大镜图标，输入时展示清空按钮；按好友名 / 群聊名 / 消息预览过滤当前 Tab。
3. **分类 Tab**：胶囊样式，选中项为主题红渐变 + 白字 + 红色投影；通知 Tab 支持配置未读红点。
4. **会话卡片**：白色 32rpx 圆角卡片，128rpx 渐变字符头像（通知类为浅黄底铃铛）、名称 + 标签（如「6人」「圈子」）、时间、单行消息预览、红色未读数字角标。
5. **空状态**：无数据时显示「暂无消息 / 新的聊天和通知会出现在这里」。
6. **刷新与安全区**：保留下拉刷新；列表底部预留 210rpx + `env(safe-area-inset-bottom)`，避免被自定义底栏遮挡。

交互说明：

- 私聊 Tab 展示全部会话；系统通知、小队聊天室为分类快捷筛选。
- 点击聊天类会话跳转 `/pages/chat/chat-room`，同时携带 `conversationId`、`squadId`、`squadName`。
- 点击活动通知暂提示「通知详情开发中」。

### 2. `mock/messages.js`（数据源重写）

新增/调整：

- `MOCK_MESSAGE_CONVERSATIONS`：6 条会话，字段包含 `id / category / name / avatarText / avatarBg / tag / lastMsg / time / unread`。
- `category` 枚举：`private`（私信）、`squad`（小队/圈子群聊）、`notice`（活动通知）。
- 会话头像用渐变底色 + 文字占位，不依赖远程图片。
- `getMockChatThread(conversation)` 改为按会话对象生成聊天记录，供聊天室页使用。

### 3. `api/modules/message.js`（接口层调整）

- 新增 `fetchMessageConversations()`：后端未提供会话接口前返回 mock 深拷贝，接口就绪后改为 `request()` 对接。
- `fetchChatThread(conversationId)`：改为在 `MOCK_MESSAGE_CONVERSATIONS` 中按 id 查找并生成聊天记录。
- 移除旧的 `fetchMessageList()` / `fetchChatMessageList()`。

### 4. `constants/message-tabs.js`（新增，Tab 配置抽离）

将 Tab 文案、分类筛选和红点规则集中到配置文件，页面只负责渲染：

```js
export const MESSAGE_TABS = [
	{ key: 'chat', label: '私信消息', categories: null, showUnreadDot: false },
	{ key: 'notice', label: '系统通知', categories: ['notice'], showUnreadDot: true },
	{ key: 'circle', label: '小队聊天室', categories: ['squad'], showUnreadDot: false }
]
```

字段含义：

- `label`：Tab 文案。
- `categories`：该 Tab 展示的会话分类；`null` 表示全部。
- `showUnreadDot`：是否展示未读红点。

页面通过 `MESSAGE_TABS` 计算当前列表，铃铛入口也按 `key = 'notice'` 查找，后续新增/调整分类只需修改该文件。

### 5. 删除旧组件

- `components/system-push-message.vue`（原系统消息卡片）
- `components/chat-room-message.vue`（原聊天室列表）

二者仅被旧消息页引用，重构后已无使用方，已移入废纸篓。如需恢复，请打开废纸篓并先将 `sboxbackup` 中的文件确认后拖回原目录。

---

## 三、时刻页配色切换

### 1. `pages/moment/moment.vue`

- 页面背景由 `#f4f5f7 → #f0f2ff → #f4f5f7`（紫调）改为 `#f4f5f7 → #fff0ee → #f4f5f7`（主题红浅晕）。

### 2. `components/moment-feed.vue`

- Stories 容器底色、阴影由紫色改为红色系。
- 故事环渐变由紫粉改为 `#ff8a6a → #ff9e8f → #ff3b30`。
- 卡片渐变、光晕、阴影、分隔线统一改为红色系。
- 文案高亮（用户名、评论用户、查看全部评论）改为主题红。
- 点赞红心改为 `#ff3b30`；未点赞、评论、分享、收藏、更多图标改为中性灰 `#8a8a8a / #6b6b6b`。
- 文本帖背景、评论展开区、虚线分隔线由紫色改为红色浅底。
- 深色文字由紫黑 `#1b1732` 改为中性 `#1a1a1a`。
- 媒体区深色底由紫黑改为中性深灰 `#141414 → #232323`。

布局与交互逻辑未改动，仅调整配色。

---

## 四、修改文件清单

| 文件 | 说明 |
| --- | --- |
| `pages/message/message.vue` | 消息页完全重写 |
| `constants/message-tabs.js` | 新增消息分类 Tab 配置 |
| `mock/messages.js` | 会话 mock 与聊天记录生成重写 |
| `api/modules/message.js` | 新增会话列表接口，调整聊天记录接口 |
| `pages/moment/moment.vue` | 时刻页背景改为主题红 |
| `components/moment-feed.vue` | 时刻信息流配色改为主题红 |
| `components/system-push-message.vue` | 已删除（无引用） |
| `components/chat-room-message.vue` | 已删除（无引用） |

---

## 五、验证建议

1. 消息页首屏：标题、铃铛、搜索框、三个 Tab 与会话卡片布局符合 `消息.png`。
2. 搜索「阿泽」「咖啡」等关键词，列表按名称 / 预览正确过滤；清空按钮可恢复。
3. 切换「系统通知 / 小队聊天室」，列表分别只展示 `notice` / `squad` 分类。
4. 存在未读会话时，铃铛与系统通知 Tab 显示红点。
5. 点击聊天会话可进入聊天室；点击活动通知提示「通知详情开发中」。
6. 下拉刷新正常停止；列表底部不被自定义底栏遮挡。
7. 时刻页：故事环、卡片阴影、高亮文字、点赞红心均为主题红，页面无残留紫色元素。

---

## 六、注意点

1. **Tab 配置不要放回 mock 文件**：`mock/messages.js` 后续接入真实接口时可能被替换，配置应保留在 `constants/message-tabs.js`。
2. **会话接口仍为 mock**：`fetchMessageConversations()` 目前直接返回本地数据，后端就绪后改为 `request()`，并保留 mock 字段以兼容 `useMock` 开关。
3. **私聊 Tab 为全部会话**：当前设计下「私信消息」展示所有会话，若后续只想展示 `private`，把 `categories` 改为 `['private']` 即可。
4. **通知详情未接入**：活动通知点击目前仅 toast 占位。
5. **旧组件已删除**：`system-push-message.vue`、`chat-room-message.vue` 已无引用；恢复时需同步恢复旧消息页逻辑或改造成新卡片。
6. 本次改动未提交，未执行 HBuilderX 编译预览；已完成相关 JS 脚本语法校验。
