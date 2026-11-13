# 会话日志

> 生成时间：2026-11-13
> 项目：HiGo-Frontend（uni-app / Vue 3）+ HiGo-Backend（Node.js ESM）
> 主题：个人资料页、头像上传接入 COS、首页顶部头像与「我的」页修复

---

## 一、会话概览

1. **个人资料入口**：「我的」页顶部红色区域右侧新增圆形设置按钮，仅登录用户可见，点击进入个人资料页。
2. **个人资料页**：展示登录接口返回的资料字段，空值统一显示「暂无」；性别、用户类型按枚举渲染；补充手机号字段。
3. **资料编辑**：昵称、手机号、头像、生日、性别可修改并调用 `POST /api/v1/user/profile` 落库；真实姓名暂不接入（实名认证接口待接入）；只读字段置灰。
4. **头像上传链路**：H5 接入腾讯云 COS 浏览器 SDK，与小程序分支按条件编译隔离；修复 STS 签名缺 `X-TC-Region`、浏览器 SDK 无 `postObject`、对象私有读导致头像空白等问题。
5. **文件选择与裁剪**：新增 `utils/image-picker.js` 规避 uni-app H5 首次调起文件选择器的误报；裁剪遮罩层级提升到 9999；裁剪操作栏改为白底 + 品牌红。
6. **首页顶部**：铃铛右侧由固定 logo 改为「有头像显示头像，否则显示 logo」；返回首页时 `onShow` 同步缓存。
7. **缺陷修复**：退出登录后「去登录」入口消失、无小队用户的灰色占位块复现、小队管理标题区样式缺失。

---

## 二、修改文件

### 前端（HiGo-Frontend）

| 文件 | 说明 |
| --- | --- |
| `pages/user/components/user-header-panel.vue` | 顶部新增圆形设置按钮，点击发出 `settings-click`；昵称区预留右侧间距 |
| `pages/user/user.vue` | 接入设置按钮跳转；恢复「去登录」卡片与 `goLoginPage`；小队占位过滤；头像上传改用 `pickSingleImage`；裁剪层 `z-index`；loading 与 toast 配对修复 |
| `src/user-profile/user-profile.vue` | 新增个人资料页：资料展示、可编辑字段、枚举映射、空值「暂无」、头像裁剪上传 |
| `pages.json` | 注册 `src/user-profile/user-profile`，默认导航栏、标题「个人资料」、背景 `#E8F4FF` |
| `utils/image-picker.js` | 新增：H5 用原生 `<input type="file">`，其他端用 `uni.chooseImage` |
| `utils/cos-upload.js` | H5 使用浏览器版 SDK + `putObject` + Blob；上传时设置 `x-cos-acl: public-read` |
| `utils/cos-js-sdk-v5.js` | 新增浏览器版 COS SDK（UMD） |
| `pages/index/index.vue` | 顶部传入登录用户头像；`onShow` 读取缓存 |
| `pages/index/components/index-top-bar.vue` | 铃铛右侧：有头像显示圆形头像，否则显示 logo |
| `pages/user/components/user-squad-panel.vue` | 小队管理标题区重设计：红色竖条标题 + 胶囊「创建新小队」按钮 |
| `uni_modules/qf-image-cropper/.../qf-image-cropper.vue` | 操作栏白底 + 品牌红；「重选」接入 `pickSingleImage` |

### 后端（HiGo-Backend）

| 文件 | 说明 |
| --- | --- |
| `src/lib/sts.js` | STS 签名与请求头补充 `X-TC-Region`；`getCosCredentials` 支持 `region` 参数；策略新增 `cos:PutObjectACL` |
| `src/routes/upload.js` | 调用 STS 时传入 `cosRegion` |

---

## 三、详细改动

### 1. 个人资料入口与页面

「我的」页头部按钮：

```html
<view v-if="isLoggedIn" class="settingsBtn" @click="$emit('settings-click')">
	<uni-icons type="gear" size="20" color="#ffffff" />
</view>
```

跳转前走统一登录校验：

```js
goProfilePage() {
	if (!this.$refs.loginGuard.ensureLogin({ content: '登录后可查看个人资料' })) return
	uni.navigateTo({ url: '/src/user-profile/user-profile' })
}
```

资料页字段来源：本地缓存 `userInfo`（登录 / 注册接口返回的 `profile`）。

- 可编辑：头像、昵称、手机号、生日、性别
- 只读（浅灰 `#a8a8a8`）：趣玩号、用户名、身份证号、用户类型、注册时间、最后登录
- 真实姓名：点击提示「实名认证接口待接入」
- 空值统一「暂无」；生日为空显示灰色占位「请选择生日」

枚举映射：

```js
gender: 1 → 男, 2 → 女, 其余 → 暂无
user_type: 0 → 普通用户, 1 → 管理员, 2 → VIP, 其余 → 暂无
```

保存逻辑（`POST /api/v1/user/profile`）：

```js
async saveField(key, value) {
	uni.showLoading({ title: '保存中...', mask: true })
	try {
		await updateProfile({ [key]: value })
		this.userInfo = { ...this.userInfo, [key]: value }
		uni.setStorageSync('userInfo', this.userInfo)
		uni.hideLoading()
		uni.showToast({ title: '已保存', icon: 'none' })
		return true
	} catch (err) {
		uni.hideLoading()
		uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
		return false
	}
}
```

### 2. 头像上传（H5 / 小程序）

问题与处理：

| 问题 | 处理 |
| --- | --- |
| `cos-wx-sdk-v5.js` 无 `default` 导出 | 命名空间导入，按 `default → COS → window.COS` 依次取构造函数 |
| 微信版 SDK 依赖 `wx`，H5 不可用 | 新增浏览器版 `utils/cos-js-sdk-v5.js`，条件编译分流 |
| `POST /api/v1/upload/credentials` 500 | STS `GetFederationToken` 缺 `X-TC-Region`，后端补齐 |
| `postObject is not a function` | 浏览器版 1.8.7 无该方法，H5 改 `putObject` + `Body(Blob)`；小程序统一 `putObject` + `FilePath` |
| 上传成功但头像空白 | 桶为私有读（匿名访问 403），上传时设置 `x-cos-acl: public-read`，STS 策略补 `cos:PutObjectACL` |
| `showLoading / hideLoading` 未配对告警 | 成功、失败分支各自先 `hideLoading` 再 `showToast` |

上传关键参数：

```js
const params = {
	Bucket: c.bucket,
	Region: c.region,
	Key: key,
	Headers: { 'x-cos-acl': 'public-read' },
}
// #ifdef H5
params.Body = body
params.ContentType = body.type || 'image/png'
// #endif
// #ifndef H5
params.FilePath = filePath
params.ContentType = `image/${extOf(filePath)}`
// #endif
```

缓存同步：`updateProfile({ avatar })` 成功后写回 `userInfo`（含头像 URL），首页、我的页、资料页的 `onShow` 都能立即读取。

### 3. 文件选择与裁剪

- `uni.chooseImage` 首次调用时，uni-h5 运行时的交互监听在 `_createInput` 内才注册，导致 `userInteract` 判定为 0 并打印「文件选择器对话框只能在由用户激活时显示」。改为 H5 自建 `<input type="file">`，在点击的同步调用栈内 `click()`。
- 裁剪遮罩被「我的」页 `z-index: 1` 的头部 / 快捷入口面板覆盖，裁剪组件传 `:z-index="9999"`。
- 裁剪操作栏主题化：背景 `#ffffff`，「重选」`#ff3b30`，「确定」红底胶囊按钮。

### 4. 首页顶部头像

```html
<image v-if="avatarUrl" class="navAvatar" :src="avatarUrl" mode="aspectFill" />
<image v-else class="navLogo" src="/static/logo-nav.png" mode="aspectFit" />
```

```js
loadHeaderAvatar() {
	let userId = ''
	let userInfo = null
	try {
		userId = uni.getStorageSync('userId')
		userInfo = uni.getStorageSync('userInfo')
	} catch (_) {}
	this.headerAvatar = userId && userInfo && userInfo.avatar ? userInfo.avatar : ''
}
```

规则：未登录、新注册未设置头像的用户显示 logo；已设置头像的用户显示 72rpx 圆形头像。

### 5. 缺陷修复

- **退出后无「去登录」**：底部卡片模板缺少 `v-else` 分支，退出清空缓存后 `isLoggedIn=false`，整个卡片不渲染。已恢复「去登录」卡片与 `goLoginPage` 方法。
- **无小队灰色占位**：`fetchUserSquadPanel()` 在无小队时返回 `id` 为空的占位项，已在 `loadUserData` 过滤 `item.id !== ''`，并每次用接口结果覆盖列表。
- **小队标题区**：左侧红色渐变竖条 + 标题，右侧「＋ 创建新小队」胶囊按钮（浅红底、红边框、点击缩放反馈）。

---

## 四、联调验证

| 场景 | 结果 |
| --- | --- |
| 登录用户点击设置按钮 | 进入个人资料页 |
| 未登录用户 | 不显示设置按钮，登录校验拦截 |
| 资料空值 / 未取到字段 | 显示「暂无」，生日显示「请选择生日」 |
| 昵称 / 手机号 / 生日 / 性别修改 | 调接口成功后提示「已保存」，返回我的页即时刷新 |
| 真实姓名点击 | 提示「实名认证接口待接入」 |
| 头像裁剪上传 | 上传 → 更新资料 → 写缓存 → 页面头像刷新，重新进入仍可见 |
| 未设置头像 / 未登录 | 首页铃铛右侧显示 logo |
| 已有头像 | 首页铃铛右侧显示圆形头像 |
| 退出登录 | 底部显示「去登录」，点击进入登录页 |

COS 侧前置条件：

- 桶 CORS 允许 `POST / PUT / GET / HEAD`，`Allow-Headers` 含 `x-cos-*`，`Expose-Headers` 含 `ETag`
- 对象以上传时的 `public-read` ACL 提供匿名读；若桶开启了「阻止公共访问」，需改用「公有读私有写」

---

## 五、后续事项

- **实名认证**：真实姓名编辑依赖实名认证接口，暂不接入。
- **资料读取接口**：当前资料页只读本地缓存，后端提供 `GET /api/v1/user/profile` 后可改为实时拉取。
- **头像存储**：历史私有的头像对象不会自动转公共读，需要重新上传。
- 其余待接入能力以 `docs/pending-api-checklist.md` 为准。
