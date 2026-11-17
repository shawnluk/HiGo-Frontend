# 会话日志

> 生成时间：2026-11-17
> 项目：HiGo-Frontend（uni-app / Vue 3 选项式） + HiGo-Backend（Node.js / Koa）
> 主题：「我的」页登录态判断修复、访客默认头像回退、HTTP 401 统一处理、首页轮播图 COS 权限恢复

---

## 一、会话概览

本次会话围绕「登录态一致性与静态资源可用性」展开，包含五块：

1. **登录态判断修复**：「我的」页原先只在 `onLoad` 校验 token，且登录态依赖 `userId` / `userInfo` 缓存。页面停留期间 token 过期、从其他页面返回时已过期、缓存残留等场景都会误判为已登录。改为每次 `onShow` 校验 token，登录态以 token 为准。
2. **登录失效不再被静默吞掉**：小队列表接口普通失败仍回退缓存，登录态失效（未登录 / 过期 / 401）改为向上抛出，页面捕获后立即切回访客态。
3. **访客 401 请求修复**：未登录时不再请求需要鉴权的 `GET /api/v1/user/profile`，消除控制台 401。
4. **默认头像回退**：访客或 token 过期时，首页顶部与「我的」头像框显示默认 logo；默认头像资源由 COS 改为本地 `/static/logo.png`。
5. **COS 轮播图权限恢复**：首页轮播图 403 排查。当前密钥无 ACL 管理权限，采用「原图下载 + 带 `public-read` 重新上传」恢复；桶策略配置后完成最终验证。

---

## 二、修改文件

### 前端（HiGo-Frontend）

| 文件 | 说明 |
| --- | --- |
| `pages/user/user.vue` | 登录态校验移至 `onShow`；登录态以 token 为准；访客态重置头像与小队数据；过期提示改用 `LoginGuard`；设置按钮增加登录拦截 |
| `pages/index/index.vue` | 顶部头像改为「token 存在且未过期」才展示，否则回退默认 logo |
| `api/http.js` | 登录过期错误附带 `code` / `statusCode`；鉴权接口 401 统一清缓存并提示；新增导出 `isAuthError()` |
| `api/modules/user.js` | `fetchMySquads` 对登录态错误向上抛出，普通失败仍回退缓存 |
| `src/create-activity/create-activity.vue` | 捕获小队列表登录态错误并清空小队选项 |
| `mock/user-display.js` | `MOCK_USER_DEFAULT_AVATAR` 改为本地 `/static/logo.png` |

### 服务端 / 云资源

| 资源 | 说明 |
| --- | --- |
| COS `swiper/1.png`、`swiper/2.png`、`swiper/3.png` | 原样重新上传并设置对象 ACL `public-read` |
| COS 桶策略 | 由桶管理员在控制台配置，放开 `swiper/*` 与 `TopBar/logo.png` 的匿名读 |

---

## 三、「我的」页登录态判断修复

### 1. 生命周期调整

- `onLoad` 仅读取 `user_id` 页面参数，不再做登录校验与数据加载。
- `onShow` 统一执行：`checkTokenExpired()` → `loadLocalUser()` → `loadUserData()`。
- 这样既避免了首次进入时 `onLoad` + `onShow` 重复请求，也覆盖了：
  - 页面停留期间 token 过期；
  - 从其他页面返回时 token 已过期；
  - 从个人资料页返回后昵称 / 头像变更。

### 2. 登录态以 token 为准

`loadLocalUser()` 读取 `token`，未登录判断改为：

```js
if (!token || isTokenExpired(token) || (!userId && !userInfo)) {
	// 按访客处理
}
```

访客态下同时重置：

- `isLoggedIn = false`
- `userId`、`user_no`
- `squads`、`squadItems`（清空小队区域）
- `avatarUrl = MOCK_USER_DEFAULT_AVATAR`
- `header = { ...MOCK_USER_HEADER }`

并修复了 `userInfo` 为空时访问 `userInfo.user_no` 的潜在报错。

### 3. 过期提示统一

`checkTokenExpired()` 不再调用原生 `uni.showModal`，改为复用项目统一的 `LoginGuard` 弹窗：

```js
this.$refs.loginGuard.open({
	title: '请重新登录',
	content: '登录已过期，请重新登录后再操作',
	confirmText: '去登录',
	showCancel: false,
	loginMode: 'navigateTo',
})
```

### 4. 设置按钮登录拦截

`goProfilePage()` 未登录时不再静默 `return`，改为：

```js
const guard = this.$refs.loginGuard
if (!guard || !guard.ensureLogin({ content: '登录后即可查看和编辑个人资料' })) {
	this.loadLocalUser()
	return
}
```

`ensureLogin` 可能已清理过期 token，因此同步刷新一次页面登录态。

---

## 四、登录态失效错误链路

### 1. `api/http.js`

- `rejectExpiredToken()` 抛出的错误增加 `code: 'TOKEN_EXPIRED'`、`statusCode: 401`。
- 非 2xx 响应统一附带 `statusCode`。
- 鉴权接口返回 401 时（排除登录、注册等公开接口）：
  - 清理登录缓存；
  - 提示重新登录；
  - 错误标记为 `TOKEN_EXPIRED`。
- 新增导出：

```js
export function isAuthError(err) {
	if (!err) return false
	return err.code === 'TOKEN_EXPIRED' || err.statusCode === 401
}
```

### 2. `api/modules/user.js`

`fetchMySquads()` 的异常分支区分错误类型：

- 普通网络错误：继续回退登录时缓存的 `squads`；
- 登录态错误：向上抛出，交由页面处理。

### 3. `pages/user/user.vue`

- 访客态不再请求 `GET /api/v1/user/profile`，直接使用 `data()` 中的访客默认资料。
- `loadUserData()` 捕获 `isAuthError(err)` 后重新执行 `loadLocalUser()` 并清空 `squadItems`，UI 立即切回未登录。

### 4. `src/create-activity/create-activity.vue`

小队选择抽屉加载失败时，若为登录态错误，清空 `squadOptions`，避免展示上一个账号或已失效会话的数据。

---

## 五、访客 / token 过期的默认 logo

### 1. 首页顶部头像（`pages/index/index.vue`）

原逻辑只判断 `userId` 和 `userInfo.avatar`，token 过期后缓存仍在时会继续展示旧头像。改为：

```js
const loggedIn = Boolean(token) && !isTokenExpired(token)
this.headerAvatar = loggedIn && userInfo && userInfo.avatar ? userInfo.avatar : ''
```

未登录或过期时 `headerAvatar` 为空，`index-top-bar` 自动渲染 `/static/logo-nav.png`。

### 2. 「我的」头像框（`pages/user/user.vue`）

访客 / 过期分支将 `avatarUrl` 重置为 `MOCK_USER_DEFAULT_AVATAR`，并同步清空用户信息与小队数据。

### 3. 默认头像资源本地化（`mock/user-display.js`）

```js
export const MOCK_USER_DEFAULT_AVATAR = '/static/logo.png'
```

该常量被「我的」页、个人资料页、聊天室 mock 与 `fetchUserProfile` mock 共用，统一改为本地资源后不再依赖 COS 公共读权限。

---

## 六、首页轮播图 COS 权限恢复

### 1. 现象

首页轮播图不显示。实测三条图片地址以及 `TopBar/logo.png` 全部返回：

```
HTTP 403 AccessDenied
```

轮播图地址写死在 `components/swiper-bar.vue`，组件最近提交为 11-04，与本次登录态改动无关。

### 2. 原因

桶 / 对象 ACL 不允许匿名读取。对象存在（不是 404），说明是权限配置问题，而非文件缺失或代码问题。

### 3. 处理过程

- 当前后端 `.env` 中的 COS 密钥：
  - `getObjectAcl`、`getBucketAcl`、`getBucketPolicy`、`putObjectAcl` 均返回 `AccessDenied`；
  - `putObject` 携带 `x-cos-acl: public-read` 可成功，且匿名访问返回 200。
- 因此采用「鉴权下载原图 → 原样重新上传并携带 `public-read` ACL」的方式恢复：

| 对象 | 大小 | 匿名访问 |
| --- | ---: | --- |
| `swiper/1.png` | 6,136,562 bytes | 200 `image/png` |
| `swiper/2.png` | 5,028,855 bytes | 200 `image/png` |
| `swiper/3.png` | 1,126,323 bytes | 200 `image/png` |

### 4. 桶策略方案

为避免以后换图再次出现 ACL 遗漏，推荐并已由桶管理员配置桶策略：

- 匿名主体：`qcs::cam::anyone:anyone`
- 动作：`cos:GetObject`、`cos:HeadObject`
- 资源：
  - `qcs::cos:ap-guangzhou:uid/1310134019:unitone-1310134019/swiper/*`
  - `qcs::cos:ap-guangzhou:uid/1310134019:unitone-1310134019/TopBar/logo.png`
- `user-avatar/*` 不在策略范围内。

配置后验证：

- `swiper/1-3.png`、`TopBar/logo.png` 匿名访问均返回 200；
- 向 `swiper/` 上传**不带** `x-cos-acl` 头的临时对象，匿名访问返回 200，确认策略对新增对象自动生效；
- 临时探测对象已删除。

---

## 七、验证记录

### 已执行

- 修改的 `.vue` 脚本与 `api/http.js` 均通过 Node 语法检查。
- COS 静态资源匿名访问验证通过（见上表）。
- 桶策略对新对象的覆盖验证通过。

### 待 HBuilderX / H5 手测

1. 未登录进入「我的」：头像显示默认 logo，无 `GET /api/v1/user/profile` 401。
2. 登录后停留至 token 过期，再切回「我的」：提示「请重新登录」，UI 切回访客态，头像恢复默认 logo。
3. token 过期后点击顶部设置按钮：弹出登录提示，不再静默无响应。
4. 小队接口返回 401：页面立即切回未登录，不残留小队数据。
5. 首页：未登录 / token 过期时顶部显示默认 logo；登录且设置头像后显示用户头像。
6. 首页轮播图正常展示三张图片。

---

## 八、注意事项

- `user-avatar/*` 目前仍通过上传时设置的对象 ACL `public-read` 实现匿名可读；若后续要求头像私有，需要改为签名 URL 或带鉴权的 CDN。
- 桶策略是整体覆盖写入。当前密钥缺少 `GetBucketPolicy` / `PutBucketPolicy` 权限，后续调整策略应在控制台操作，避免覆盖已有规则。
- 轮播图原图体积较大（约 6.1MB / 5.0MB / 1.1MB），若后续关注首屏加载速度，建议压缩或接入 CDN。
- `docs/pending-api-checklist.md` 中「用户资料」「头像保存」两项已完成，但清单尚未同步。
