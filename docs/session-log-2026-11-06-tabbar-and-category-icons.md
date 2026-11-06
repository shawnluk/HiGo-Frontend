# 会话日志

> 生成时间：2026-11-06
> 项目：HiGo-Frontend（uni-app / Vue 3）
> 主题：底栏四个 Tab 图标改为灰色/主题色 SVG 方案、首页活动分类五个图标改为分类色/选中白色 SVG 方案

---

## 一、会话概览

本次会话包含两块图标改造：

1. **底栏 Tab 图标**：四个图标统一改为灰色线性 SVG，点击选中后切换为主题红色；原有 PNG 双色图标逻辑注释保留不删除。
2. **首页活动分类图标**：五个分类图标改为与活动卡片标签配色一致的线性 SVG，图标底色取同色系浅色，分类文字统一灰色；点击选中后图标变白、底色变主题红、文字变黑；原有图标与样式注释保留不删除。

iconfont.cn 的检索与下载接口需要登录且为纯前端渲染，无法直接抓取 SVG，因此本次按 iconfont 常见线性描边风格自绘了同语义图标，文件命名固定，后续可直接用 iconfont 下载的同款 SVG 覆盖。

---

## 二、修改文件

| 文件 | 说明 |
| --- | --- |
| `components/bottom-tab-bar.vue` | Tab 图标改用 SVG；旧 PNG 模板与 `iconPath/selectedIconPath` 配置注释保留；图标尺寸改为 40rpx × 40rpx（`aspectFit`） |
| `pages/index/components/home-category-bar.vue` | 分类图标改用本地 SVG；新增选中态图标/底色/文字切换；旧图标模板与旧样式整段注释保留 |
| `constants/category-visuals.js` | 新增：五个分类的图标路径、选中态图标路径、图标底色配置 |
| `static/icons/tabbar/*.svg` | 新增 8 个：activity / moment / message / mine 各一份灰色版与主题色版 |
| `static/icons/categories/*.svg` | 新增 10 个：sport / movie / outdoor / chat / art 各一份分类色版与白色选中版 |

活动卡片上的分类标签配色（`components/home-activity-card.vue` 中的 `categoryTagBg` / `categoryTagColor`）**未做任何改动**。

---

## 三、底栏 Tab 图标改造

### 1. 图标与配色

| Tab | 灰色默认 | 主题色选中 | 语义 |
| --- | --- | --- | --- |
| 活动 | `activity.svg` | `activity-active.svg` | 房子 |
| 时刻 | `moment.svg` | `moment-active.svg` | 相框/照片 |
| 消息 | `message.svg` | `message-active.svg` | 气泡 |
| 我的 | `mine.svg` | `mine-active.svg` | 人像 |

- 默认色：`#9A9A9A`
- 选中色：`#E8453C`（与底栏选中文字颜色一致）
- 图标文件目录：`/static/icons/tabbar/`

### 2. 组件实现

模板中旧逻辑注释保留：

```html
<!-- 旧图标逻辑（PNG 双色图）已注释保留，后续需要可随时还原 -->
<!-- <image
	v-else
	class="tabIcon"
	:src="index === current ? item.selectedIconPath : item.iconPath"
	mode="widthFix"
/> -->
<!-- 新图标逻辑：默认灰色，选中后切换为主题色 SVG -->
<image
	v-else
	class="tabIcon"
	:src="index === current ? item.activeIcon : item.icon"
	mode="aspectFit"
/>
```

`tabs` 配置中的旧字段同样注释保留，新增 `icon` / `activeIcon`：

```js
{
	pagePath: 'pages/index/index',
	text: '活动',
	// 旧图标（PNG 双色图）配置，暂时保留不删除
	// iconPath: '/static/home-1.png',
	// selectedIconPath: '/static/home-0.png',
	icon: '/static/icons/tabbar/activity.svg',
	activeIcon: '/static/icons/tabbar/activity-active.svg'
}
```

样式调整：`.tabIcon` 由仅设置宽度（`widthFix`）改为固定宽高 `40rpx × 40rpx`，避免 SVG 在不同端高度塌陷。

---

## 四、首页分类图标改造

### 1. 分类图标与配色

| 分类 | key | 图标 | 语义 | 图标色（同卡片标签） | 图标底色 |
| --- | --- | --- | --- | --- | --- |
| 约球 | `sport` | `sport.svg` | 足球 | `#2F80ED` | `#E8F4FD` |
| 观影 | `movie` | `movie.svg` | 爆米花 | `#7B61FF` | `#F0EBFD` |
| 户外 | `outdoor` | `outdoor.svg` | 山与太阳 | `#27AE60` | `#E8F7EF` |
| 闲聊 | `chat` | `chat.svg` | 咖啡杯 | `#F2994A` | `#FDF0E8` |
| 艺术 | `art` | `art.svg` | 画笔 | `#EB5757` | `#FDEFEF` |

- 图标文件目录：`/static/icons/categories/`
- 每个分类额外提供 `*-active.svg`，内容形状一致、颜色为 `#FFFFFF`，用于选中态。

### 2. 配置抽离

新增 `constants/category-visuals.js`，按 `category_key` 组织图标与底色；后端未返回 `category_key` 时按 `category_id` 兜底映射：

```js
export const CATEGORY_VISUALS = {
	sport: {
		icon: '/static/icons/categories/sport.svg',
		activeIcon: '/static/icons/categories/sport-active.svg',
		bg: '#e8f4fd'
	},
	// movie / outdoor / chat / art 同理
}

export const CATEGORY_KEY_BY_ID = {
	1: 'sport',
	2: 'movie',
	3: 'outdoor',
	4: 'chat',
	5: 'art'
}
```

### 3. 组件实现

- 分类数据归一化时优先使用本地配置的图标与底色，未命中配置（例如后续新增分类）才回退到后端 `icon`：

```js
const categoryKey = item.category_key || CATEGORY_KEY_BY_ID[categoryId] || ''
const visual = CATEGORY_VISUALS[categoryKey]
const fallbackIcon = item.icon || item.icon_url || ''

return {
	// 旧图标逻辑（直接使用后端 icon），暂时保留不删除
	// icon: fallbackIcon,
	icon: visual ? visual.icon : fallbackIcon,
	activeIcon: visual ? visual.activeIcon : fallbackIcon,
	iconBg: visual ? visual.bg : '#f5f5f7',
	// ...
}
```

- 图标容器底色与描边通过内联样式按选中态切换：

```html
<view
	class="hcIconBox"
	:class="{ hcIconBoxActive: item.isActive }"
	:style="{
		background: item.isActive ? '#e8453c' : item.iconBg,
		borderColor: item.isActive ? 'rgba(232, 69, 60, 0.55)' : 'rgba(0, 0, 0, 0.06)'
	}"
>
```

- 图标切换：`:src="item.isActive ? item.activeIcon : item.icon"`。
- 文字状态：默认 `#999999`；选中时加 `.hcTextActive`，颜色 `#1F1F1F`、字重 600。

### 4. 旧样式保留

`home-category-bar.vue` 中原有的 `.hcIconBox`、`.hcItemActive .hcIconBox`、`.hcIcon`、`.hcText`、`.hcItemActive .hcText` 规则已整段注释保留，新样式紧随其后。

外层分类卡片 `.hcItem` / `.hcItemActive`（白底、选中淡红底与红描边）未改动。

---

## 五、关于 iconfont 图标替换

iconfont.cn 需登录后才能下载 SVG，本次未直接获取站内文件。若后续需要替换为 iconfont 图标：

1. 在 iconfont.cn 按关键词搜索并下载 **线性/描边** 风格 SVG（24px 或 64px 均可）；
2. 保持文件名不变，直接覆盖 `static/icons/tabbar/` 与 `static/icons/categories/` 下同名文件；
3. 每个图标需准备两份：默认色版、选中色版（底栏选中色 `#E8453C`；分类选中色 `#FFFFFF`，默认版按上表分类色）；
4. 不要在 SVG 中使用百分比单位和 `<style>` 标签（微信小程序 `image` 组件不支持）。

搜索关键词参考：

- 底栏：首页/活动、时刻/相册、消息/聊天、我的/用户
- 分类：足球/球类、爆米花/电影、户外/山、咖啡/闲聊、画笔/艺术

---

## 六、验证情况

- 使用 macOS `qlmanage` 将全部 SVG 渲染为 PNG 预览，确认图标形状完整、线条闭合、颜色正确。
- 微信小程序官方文档确认 `image` 组件支持 JPG、PNG、SVG、WEBP、GIF，本次 SVG 未使用百分比单位与 `<style>`，符合限制。
- 项目为 HBuilderX 工程（无 npm dev 脚本），未在本地启动 H5/小程序编译，需在 HBuilderX 重新编译后查看实际效果。

---

## 七、回滚方式

- 底栏：取消 `components/bottom-tab-bar.vue` 中模板与 `tabs` 配置的注释，同时注释掉新增的 SVG `<image>` 即可恢复 PNG 方案。
- 分类栏：取消 `pages/index/components/home-category-bar.vue` 中旧 `<image>` 与旧样式整段注释，并还原 `icon: fallbackIcon` 即可恢复后端图标方案。
- 新增的 SVG 文件与 `constants/category-visuals.js` 可按需删除。
