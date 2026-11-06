# 会话日志

> 生成时间：2026-11-06
> 项目：HiGo-Frontend（uni-app / Vue 3）
> 主题：登录提示弹窗组件化、首页活动卡片信息布局调整、Tabbar 样式优化

---

## 一、会话概览

本次会话围绕以下四块内容展开：

1. **首页活动卡片报名跳转统一**：首页活动卡片「立即报名」与活动详情页报名入口对齐，统一登录拦截与报名确认页跳转。
2. **登录提示弹窗组件化**：新增可复用的 `LoginModal` 组件，样式复用「我的」页退出登录弹窗；替换页面层 9 处登录提示，API 层 `http.js` 保留原生 `uni.showModal`。
3. **活动卡片信息布局**：报名人数移动到参与用户头像右侧；活动时间与活动地点合并到同一行展示。
4. **Tabbar 样式优化**：底栏高度与选中态胶囊一致、左右增加边距、发布按钮改为长方形并限制在底栏高度内。

> 说明：会话中途执行过一次回退，定位图标 PNG → SVG 的组件接入改动未保留在当前代码中；`static/icons/index/location.svg` 资源文件已生成但当前未被引用。

---

## 二、修改文件

| 文件 | 说明 |
| --- | --- |
| `components/login-modal.vue` | 新增：可复用登录提示弹窗组件 |
| `components/home-activity-card.vue` | 报名跳转加登录拦截；报名人数移至头像右侧；活动时间与地点同行；接入 `LoginModal` |
| `src/activity-detail/activity-detail.vue` | 收藏/报名登录提示改用 `LoginModal` |
| `src/create-activity/create-activity.vue` | 两处登录拦截改用 `LoginModal`，保留 `redirectTo` / `navigateTo` 两种跳转 |
| `components/bottom-tab-bar.vue` | 发布拦截改用 `LoginModal`；底栏高度/左右边距/发布按钮样式调整 |
| `components/moment-feed.vue` | `requireLogin` 登录提示改用 `LoginModal`，保留「返回时刻」文案 |
| `pages/user/user.vue` | token 过期提示改用单按钮 `LoginModal` |
| `static/icons/index/location.svg` | 已生成的定位图标 SVG（当前未接入，见文首说明） |

`api/http.js` **未改动**，token 过期提示继续使用原生 `uni.showModal`。

---

## 三、详细改动

### 1. 首页「立即报名」跳转统一

原先首页卡片的「立即报名」只弹出「报名流程开发中」Toast，没有登录拦截，也不会进入报名页；活动详情页则会先校验登录再跳转。

现已对齐为同一套逻辑：

```js
// components/home-activity-card.vue
handleSignup(data) {
	const activityId = data && (data.activity_id || data.id)
	let token = ''
	try {
		token = uni.getStorageSync('token')
	} catch (_) {}
	if (!token) {
		this.promptLogin('登录后即可报名活动')
		return
	}
	if (!activityId) {
		uni.showToast({ title: '缺少活动编号', icon: 'none' })
		return
	}
	uni.navigateTo({
		url: `/src/activity-enroll/activity-enroll?activity_id=${encodeURIComponent(activityId)}`,
	})
}
```

两个入口最终都进入 `src/activity-enroll/activity-enroll.vue`，通过同一个 `fetchActivityDetail(id)` 获取活动信息。

### 2. 登录提示弹窗组件化

新增 `components/login-modal.vue`，样式复刻「我的」页退出登录弹窗：

- 遮罩：`rgba(17, 17, 17, 0.45)`，`z-index: 1300`
- 卡片：白底、`border-radius: 32rpx`、缩放进入动画
- 按钮：灰底取消 + 红橙渐变主按钮（`#ff6a5c → #ff3b30`）

组件 API：

| 类型 | 名称 | 说明 |
| --- | --- | --- |
| prop | `visible` | 是否显示 |
| prop | `title` | 标题，默认「提示」 |
| prop | `content` | 说明文案 |
| prop | `confirmText` | 主按钮文案，默认「去登录」 |
| prop | `cancelText` | 次按钮文案，默认「取消」 |
| prop | `showCancel` | 是否显示次按钮，默认 `true` |
| prop | `loginMode` | 主按钮跳转方式：`navigateTo` / `redirectTo` / `none` |
| event | `update:visible` | 显隐状态变更 |
| event | `confirm` | 点击主按钮（登录页跳转由组件处理） |
| event | `cancel` | 点击次按钮，供调用方追加逻辑 |

已替换的 9 处登录提示：

| 入口 | 数量 | 说明 |
| --- | --- | --- |
| `src/activity-detail/activity-detail.vue` | 2 | 收藏、报名 |
| `components/home-activity-card.vue` | 2 | 收藏、报名 |
| `components/bottom-tab-bar.vue` | 1 | 发布拦截 |
| `components/moment-feed.vue` | 1 | 需登录操作，保留「返回时刻」取消文案 |
| `src/create-activity/create-activity.vue` | 2 | 页面直入 `redirectTo` + 取消回首页；发布拦截 `navigateTo` + 取消关闭面板 |
| `pages/user/user.vue` | 1 | token 过期，仅显示「去登录」 |

### 3. 活动卡片信息布局

- **报名人数**：从地址行移到卡片底部参与用户头像右侧，新增 `.joinCount`，`margin-left: 20rpx`，不参与压缩。
- **活动时间**：从封面左下角移除，与活动地点合并到同一行：

```html
<view class="metaLine">
	<text class="metaIcon">📍</text>
	<text class="metaLocation" :number-of-lines="1">{{ data.location_text }}</text>
	<text v-if="shortTime(data)" class="metaSeperator">·</text>
	<text v-if="shortTime(data)" class="metaTime">🕐 {{ shortTime(data) }}</text>
</view>
```

- 清理了不再使用的 `.coverTime`、`.coverTimeText`、`.metaCount` 样式。

### 4. Tabbar 样式优化

当前样式（`components/bottom-tab-bar.vue`）：

```css
.bottomTabbarWrapper {
	padding-left: 40rpx;
	padding-right: 40rpx;
	padding-bottom: calc(10rpx + env(safe-area-inset-bottom));
}

.bottomTabbar {
	height: 100rpx;
	padding: 0;
	gap: 16rpx;
	border-radius: 80rpx;
}

.tabItem {
	height: 100rpx;
	margin: 0;
	border-radius: 60rpx;
}

.tabPublishBtn {
	width: 120rpx;
	height: 80rpx;
	border-radius: 20rpx;
	/* 取消原来的 translateY(-26rpx) 上移 */
}
```

调整要点：

- 底栏高度与选中态胶囊高度一致（最终由用户微调为 `100rpx`），消除选中效果上下的空白。
- 去掉底栏左右内边距，改用 `gap: 16rpx` 控制图标间隔，使首个/末个胶囊边缘与底栏边缘对齐。
- 外层左右内边距由 `20rpx` 增至 `40rpx`，避免底栏几乎铺满屏幕。
- 发布按钮由 `116rpx × 116rpx` 圆形改为 `120rpx × 80rpx` 长方形，四角圆角 `20rpx`，取消上移偏移，在底栏内垂直居中且不超出底栏高度。

---

## 四、验证记录

| 项目 | 结果 |
| --- | --- |
| Vite 模块编译 | 修改文件均返回 HTTP 200 |
| 底栏与选中胶囊高度 | 均为 104.54px，差值为 0 |
| 首尾胶囊与底栏边缘 | left / right 差值均为 0 |
| 底栏左右留白 | 视口 891px 时左右各约 47.5px，底栏占视口约 89.3% |
| 发布按钮 | 约 146.6px × 99.0px，底栏约 118.8px，上下间距均约 9.9px，完全位于底栏内 |

过程中修复过一次 Vite 动态导入失败：新建的 `login-modal.vue` 末尾残留一个多余的 `</content>` 标签，导致 SFC 解析报 `Invalid end tag`；删除后首页恢复正常加载。

---

## 五、注意事项

- `api/http.js` 的 token 过期提示仍为原生 `uni.showModal`，如需统一为用户选择的弹窗样式，需额外提供非组件环境的命令式调用入口。
- 原定位 PNG（`static/address.png`）仍被首页顶栏引用；`static/icons/index/location.svg` 当前未被使用。
- 「我的」页退出登录弹窗仍是独立样式实现，与 `LoginModal` 视觉一致但未合并。
- 项目无 `package.json` / `node_modules`，验证依赖 HBuilderX 内置 Vite 开发服务。
