# 会话日志

> 生成时间：2026-11-12
> 项目：HiGo-Frontend（uni-app / Vue 2）+ HiGo-Backend（Node.js ESM）
> 主题：登录弹窗点击穿透修复、创建活动小队选择接入与右侧选择抽屉

---

## 一、会话概览

1. **登录弹窗点击穿透修复**：首页点「发布」→「去登录」直接进入活动详情、「我的」页点「去登录」提示「我的动态分享功能开发中」，根因为底栏容器 `pointer-events: none` 被登录弹窗继承，弹窗不可点击导致点击穿透。
2. **小队列表接口封装**：新增 `fetchMySquads()` 统一请求 `GET /api/v1/squads/mine`，`fetchUserSquadPanel()` 复用它。
3. **创建活动接入小队选择**：创建活动页加载当前用户小队，支持按用户记住上次选择、唯一小队自动选中、已退出小队自动清空、小队重命名同步。
4. **小队选择交互重构**：由底部原生 picker 改为右侧滑出抽屉，小队选项双列并排展示，抽屉底部增加「＋ 新建小队」入口。
5. **创建小队返回回填**：从创建活动页进入创建小队页时携带 `?from=create-activity`，创建成功后写入待回填缓存，返回创建活动页自动选中新小队。
6. **头像显示排查**：确认登录与头像逻辑无 bug，默认头像来自调试浏览器中早期脚本注入的不完整 `userInfo`；用真实登录数据验证头像正常（未改代码）。
7. **待接入清单更新**：`docs/pending-api-checklist.md` 合计由 40 项更新为 39 项，补充创建活动小队选择为已接入能力。

---

## 二、修改文件

### 前端（HiGo-Frontend）

| 文件 | 说明 |
| --- | --- |
| `components/login-modal.vue` | 登录弹窗遮罩增加 `pointer-events: auto`，修复弹窗不可点击导致的穿透 |
| `api/modules/user.js` | 新增 `fetchMySquads()`；`fetchUserSquadPanel()` 改为复用该函数 |
| `constants/create-activity.js` | 新增「上次选中 squad」与「待回填 squad」两个缓存键常量 |
| `src/create-activity/create-activity.vue` | 小队选择逻辑与 UI 改造（右侧抽屉、双列卡片、新建小队入口） |
| `src/create-unit/create-unit.vue` | 记录来源场景；创建成功后写入待回填小队缓存 |
| `docs/pending-api-checklist.md` | 更新待接入统计与已接入说明 |

### 后端（HiGo-Backend）

无代码改动，本次仅使用已有接口：

- `GET /api/v1/squads/mine`
- `POST /api/v1/squads`
- `POST /api/v1/activities`（`squad_id` 必填）

---

## 三、详细改动

### 1. 登录弹窗点击穿透

根因：`components/bottom-tab-bar.vue` 的 `.bottomTabbarWrapper` 设置了 `pointer-events: none`，登录弹窗挂载在其内部时继承了该属性，弹窗可见但不可点击，点击事件穿透到下层活动卡片 /「我的动态」行。

修复：

```css
.loginModalMask {
	position: fixed;
	left: 0; right: 0; top: 0; bottom: 0;
	z-index: 1300;
	/* 弹窗可能挂在 pointer-events: none 的容器内（如自定义底栏），需显式恢复可交互 */
	pointer-events: auto;
	background: rgba(17, 17, 17, 0.45);
}
```

### 2. 小队列表接口封装

```js
export async function fetchMySquads() {
	try {
		const list = await request({
			url: ApiPaths.squadMine,
			method: 'GET',
			mock: () => readStoredSquads(),
		})
		return Array.isArray(list) ? list : []
	} catch (_) {
		return readStoredSquads()
	}
}

export async function fetchUserSquadPanel() {
	const list = await fetchMySquads()
	return mapSquadsToPanelItems(list)
}
```

### 3. 创建活动小队选择逻辑

`loadSquadOptions()` 的选中优先级：

1. 创建小队返回的待回填小队（`hiGoPendingSquadSelection`，消费后立即清除）
2. 当前用户上次选中的小队（`hiGoActivitySelectedSquad`，按 `userId` 隔离）
3. 仅有一个可选小队时默认选中
4. 已选小队不在最新列表（如已退出）时清空选择
5. 已选小队名称以接口返回为准（处理重命名）

提交前校验：`squad_id` 必填，缺失提示「请选择所在小队」。发布成功重置表单时保留已选小队，方便连续发布。

### 4. 小队选择改为右侧抽屉

- 「所在小队」行点击调用 `openSquadDrawer()`，不再使用原生 picker；活动分类仍保留原生底部 picker。
- 抽屉结构：`.squadDrawerRoot > .squadDrawerMask + .squadDrawerPanel`，通过 `translateX(100%) → 0` 从右侧滑入，宽度 `620rpx`、上限 `84vw`。
- 小队卡片使用 `flex-wrap` 双列布局，`width: calc(50% - 10rpx)`，展示头像（无头像时首字渐变占位）、名称、成员数，选中项红框高亮并显示 ✓。
- 抽屉底部常驻「＋ 新建小队」，跳转 `/src/create-unit/create-unit?from=create-activity`。

关键方法：

```js
openSquadDrawer() { this.squadDrawerOpen = true },
closeSquadDrawer() { this.squadDrawerOpen = false },
onSelectSquad(squad) {
	if (!squad) return
	this.applySelectedSquad(squad)
	this.closeSquadDrawer()
},
onCreateSquad() {
	this.closeSquadDrawer()
	uni.navigateTo({ url: '/src/create-unit/create-unit?from=create-activity' })
},
```

### 5. 创建小队返回自动回填

`src/create-unit/create-unit.vue`：

```js
onLoad(options) {
	this.fromScene = (options && options.from) || ''
},
```

创建成功且来源为 `create-activity` 时写入待回填缓存：

```js
if (this.fromScene === 'create-activity' && created) {
	const createdId = created.squad_id != null ? created.squad_id : created.id
	if (createdId != null) {
		uni.setStorageSync(PENDING_SQUAD_SELECTION_KEY, {
			squad_id: createdId,
			name: created.squad_name || created.name || name,
		})
	}
}
```

创建活动页 `onShow()` 会重新拉取小队列表，`loadSquadOptions()` 优先消费该缓存并选中新小队。

### 6. 缓存键常量

`constants/create-activity.js`：

```js
/** 最近一次选中的小队缓存键（按用户隔离，避免切换账号后误回填） */
export const ACTIVITY_SELECTED_SQUAD_KEY = 'hiGoActivitySelectedSquad'
/** 创建小队成功后待回填的临时小队缓存键（由创建小队页写入，创建活动页消费后清除） */
export const PENDING_SQUAD_SELECTION_KEY = 'hiGoPendingSquadSelection'
```

---

## 四、联调验证

使用真实账号 `zheng_hao`（user_id 17）在 H5 端实测：

| 场景 | 结果 |
| --- | --- |
| 首页「发布」→「去登录」 | 正常跳转登录页，不再穿透到活动详情 |
| 「我的」页「去登录」 | 正常跳转登录页，不再弹出「我的动态功能开发中」 |
| 打开小队抽屉 | 从右侧滑出，宽 331px（400px 视口下 620rpx），遮罩正常 |
| 小队双列展示 | 4 个小队两列排布，行内卡片 left 82 / 240，排列正确 |
| 选中小队 | 抽屉关闭并回填「摄影俱乐部」，选中卡片显示 ✓ |
| 记住选择 | 刷新页面后自动回填上次选择 |
| 新建小队 | 跳转 `#/src/create-unit/create-unit?from=create-activity` |
| 控制台 | 无报错 |

头像排查结论：登录接口返回的 `profile.avatar` 正常；调试浏览器此前的 `userInfo` 是脚本注入的 `{ user_id, username }`，缺少 `avatar` 才显示默认头像。用真实登录数据回填后头像正常加载（`naturalWidth = 300`），本次未修改相关代码。

---

## 五、后续事项

- **搜索功能**：暂时搁置，不纳入近期开发。
- **前端分享功能**：最后再接入（动态页、活动详情页两处入口）。
- 其余待接入能力以 `docs/pending-api-checklist.md` 为准，多数依赖后端新增接口。
