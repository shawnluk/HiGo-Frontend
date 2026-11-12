# 会话日志

> 生成时间：2026-11-11
> 项目：HiGo-Frontend（uni-app / Vue 2）+ HiGo-Backend（Node.js ESM）
> 主题：首页分类服务端筛选、小队创建 / 加入 / 退出 / 转让全流程接入与联调

---

## 一、会话概览

本次会话围绕「首页活动分类筛选」与「小队管理闭环」展开：

1. **首页活动分类筛选**：列表默认加载 10 条；点击分类时按 `category_id` 重新发起后端请求，不再只过滤内存中已加载的数据。
2. **待接入接口梳理**：按页面核对前后端能力，形成 `docs/pending-api-checklist.md`，最终统计为 40 项（2 项可直接联调、2 项仅缺前端入口、36 项需后端新增）。
3. **小队 API 封装**：新增创建、加入、退出、转让队长接口封装；「我的」页小队列表改为调用 `GET /api/v1/squads/mine` 实时刷新。
4. **创建小队页接入**：登录拦截、表单校验、提交创建、成功提示后返回。
5. **小队详情页三态入口**：队长显示「转让队长」、成员显示「退出小队」、非成员显示「加入小队」，均使用自定义确认弹窗。
6. **后端详情权限放开**：`GET /api/v1/squads/:id` 对已登录用户开放（含非成员），使「非成员查看详情 → 加入」流程可行。
7. **浏览器实测**：加入、退出（含取消）、转让队长、「我的」页列表刷新全部通过，并核对数据库状态。
8. **测试数据清理**：删除临时账号、测试小队与成员记录，清除浏览器测试登录态，停止后端服务。

---

## 二、修改文件

### 前端（HiGo-Frontend）

| 文件 | 说明 |
| --- | --- |
| `components/home-activity-card.vue` | 分类切换改为按 `category_id` 重新请求；默认每页 10 条；`applyCategoryFilter` 不再前端二次过滤 |
| `api/modules/activity.js` | 列表请求透传 `category_id`；Mock 分支支持按分类过滤 |
| `api/modules/user.js` | 新增 `joinSquad` / `leaveSquad` / `transferCaptain`；`createSquad`；`fetchUserSquadPanel` 优先请求 `/squads/mine` |
| `constants/api-paths.js` | 新增 `squadMine: '/api/v1/squads/mine'` |
| `src/create-unit/create-unit.vue` | 创建小队页接入 `POST /api/v1/squads` |
| `pages/user/user.vue` | 小队列表加载移至 `onShow`，返回「我的」页即重新拉取 `/squads/mine` |
| `pages/user/components/squad-detail.vue` | 新增加入 / 退出 / 转让队长三种入口与确认弹窗 |
| `mock/user-display.js` | 详情归一化补齐 `captainId`、成员 `userId` 与角色文本 |
| `docs/pending-api-checklist.md` | 更新待接入接口清单与统计 |

### 后端（HiGo-Backend）

| 文件 | 说明 |
| --- | --- |
| `src/routes/squads.js` | 移除详情接口的成员校验，允许非成员查看小队详情 |

---

## 三、详细改动

### 1. 首页活动分类筛选

改造前：分类切换只过滤 `activityList` 中已加载的前 10 条，缓存未命中的分类会显示为空。

改造后：分类切换通过全局事件 `index:category-change` 交给列表组件处理，记录 `currentCategoryId` 后重置分页并重新请求。

```js
/** 接收分类切换事件：优先按分类 id 发起请求，重置分页后重新加载 */
handleCategoryFilter(payload) {
    const category_id = payload && payload.category_id ? payload.category_id : null
    this.currentCategoryId = category_id
    this.refresh()
}
```

```js
/** 按当前偏移量请求一页活动数据 */
async fetchPage() {
    const query = { offset: this.offset, limit: this.pageSize }
    // 选中分类时，优先按分类 id 请求后端，而不是仅读取本地缓存/内存列表
    if (this.currentCategoryId != null) {
        query.category_id = this.currentCategoryId
    }
    const res = await fetchHomeActivityList(query)
    // ...
}
```

- 默认每页 `pageSize = 10`；下拉刷新重置 `offset` 并保留当前分类。
- `applyCategoryFilter()` 仅做视图映射（`isActive: true`），不再按分类过滤数组。
- Mock 模式下列表接口按 `category_id` 过滤，保证未接后端时行为一致。

### 2. 小队接口封装

统一收敛到 `api/modules/user.js`，并保留 Mock 分支：

| 方法 | 接口 | 说明 |
| --- | --- | --- |
| `createSquad(payload)` | `POST /api/v1/squads` | 创建小队，返回 `squad_id` |
| `fetchSquadDetail(id)` | `GET /api/v1/squads/:id` | 小队详情（基础信息 + 成员 + 活动） |
| `fetchUserSquadPanel()` | `GET /api/v1/squads/mine` | 我的小队列表，失败回退登录缓存 |
| `joinSquad(id)` | `POST /api/v1/squads/:id/join` | 加入小队，返回最新详情 |
| `leaveSquad(id)` | `POST /api/v1/squads/:id/leave` | 退出小队，队长会被后端拦截 |
| `transferCaptain(id, targetUserId)` | `POST /api/v1/squads/:id/captain` | 转让队长，目标须为在队成员 |

「我的」页优先读取接口，未登录 / 请求失败时回退登录时缓存的 `squads`：

```js
export async function fetchUserSquadPanel() {
    try {
        const list = await request({
            url: ApiPaths.squadMine,
            method: 'GET',
            mock: () => readStoredSquads(),
        })
        return mapSquadsToPanelItems(Array.isArray(list) ? list : [])
    } catch (_) {
        return mapSquadsToPanelItems(readStoredSquads())
    }
}
```

### 3. 创建小队页接入

`src/create-unit/create-unit.vue` 提交逻辑：

- 先经 `LoginGuard` 校验登录态；
- 校验头像、名称、简介长度；
- `submitting` 防止重复提交，按钮文案切换「创建中...」；
- 头像上传接口尚未接入，暂提交本地临时路径；
- 成功后 Toast 并返回上一页，「我的」页 `onShow` 自动刷新列表。

```js
await createSquad({
    name,
    avatar: this.avatarTempPath,
    intro,
    category_id: this.squadCategoryId || 0,
    join_type: this.needReview ? 1 : 0,
})
```

### 4. 「我的」页小队列表刷新

- 数据加载从 `onLoad` 调整到 `onShow`，创建 / 退出小队返回后都会重新请求 `GET /api/v1/squads/mine`。
- 小队数量徽标按接口返回的真实列表（排除空占位项）更新。
- 点击小队头像进入详情页，参数为 `squadId`。

### 5. 小队详情页三态入口

角色判断：

```js
isCaptain() {
    return !!this.currentUserId &&
        String(this.detail.captainId) === String(this.currentUserId)
},
isMember() {
    return (this.detail.members || []).some(
        (m) => m.userId && String(m.userId) === String(this.currentUserId)
    )
},
canJoin() {
    return this.detailLoaded && !!this.currentUserId && !this.isMember
},
```

| 角色 | 底部按钮 | 行为 |
| --- | --- | --- |
| 队长 | 转让队长 | 弹窗选择目标成员 → `POST /captain` |
| 成员 | 退出小队 | 确认后 `POST /leave`，成功后返回「我的」 |
| 非成员 | 加入小队 | 确认后 `POST /join`，成功后刷新详情 |

- 三处操作均使用自定义弹窗（`.leaveModalMask` / `.leaveModalCard`），带提交中状态防重复。
- 接口成功后使用 `normalizeSquadDetail(data)` 直接刷新详情，避免二次请求。
- 退出成功后 `onBack()`：有页面栈则 `navigateBack()`，否则 `reLaunch` 到「我的」页。

### 6. 后端详情权限放开

`HiGo-Backend/src/routes/squads.js`：移除详情接口的 `assertSquadMemberAccess` 调用，详情对已登录用户开放（含非成员），加入入口才可正常展示。

### 7. 待接入接口清单

`docs/pending-api-checklist.md` 已更新：

- 合计 **40** 项：**2** 项可直接联调、**2** 项仅缺前端入口、**36** 项需后端新增。
- 已接入小队能力：详情（对非成员开放）、我的小队、创建、加入、退出、转让队长。
- 剩余可直接联调：首页搜索 `GET /api/v1/activities?keyword=`、创建活动小队选择 `GET /api/v1/squads/mine`。

---

## 四、联调验证

环境：前端 `http://localhost:5173`（H5 hash 路由），后端 `http://localhost:3000`，`useMock: false`。

| 场景 | 操作 | 结果 |
| --- | --- | --- |
| 非成员加入 | 打开小队详情 → 加入小队 → 确认 | Toast「已加入小队」，成员数 +1，按钮变为「退出小队」 |
| 成员退出（取消） | 点击退出 → 弹窗点「取消」 | 弹窗关闭，成员状态与按钮不变 |
| 成员退出（确认） | 再次打开 → 确认退出 | Toast「已退出小队」，返回「我的」，成员数 -1 |
| 队长转让 | 队长打开详情 → 转让队长 → 选择成员 → 确认 | Toast「已转让队长」，角色实时更新，本人按钮变为「退出小队」 |
| 我的页刷新 | 返回「我的」页 | 重新请求 `/squads/mine`，新小队出现在列表并可进入详情 |

数据库核对：

- 退出后 `squad_member.member_status = 0`，`squad.member_count` 回退；
- 转让后 `squad.captain_id` 已变更，`squad_member.member_role` 同步更新。

---

## 五、测试数据清理

联调产生的临时数据已全部清理：

- 删除测试账号 2 个及对应 `user_profiles`；
- 删除测试小队 1 个（含 3 条 `squad_member` 记录，其中包含在既有小队中的退出记录）；
- 核对既有种子小队成员数恢复为 7；
- 清除浏览器中的测试登录态（`token` / `userId` / `username` / `userInfo` / `squads`）；
- 联调结束后已停止后端服务，端口 3000 无监听进程。

---

## 六、后续事项

1. 待接入清单剩余 40 项，优先处理 2 项可直接联调项（首页搜索、创建活动小队选择）。
2. 头像上传接口待接入：创建小队目前提交本地临时路径，后端需补文件上传能力。
3. 队长退出由后端拦截，前端已通过角色判断只展示「转让队长」，后续如需「解散小队」需新增接口。
4. 本地联调需保持 `config/env.js` 中 `useMock: false`，并先启动 `HiGo-Backend`（`node src/server.js`）。
