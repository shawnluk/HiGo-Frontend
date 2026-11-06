# 会话日志

> 生成时间：2026-11-06
> 项目：HiGo-Frontend（uni-app / Vue）
> 主题：首页活动卡片新增小队信息行、箭头按钮交互、全局字体与 Tabbar 发布按钮圆形化

---

## 一、会话概览

本次会话围绕首页活动卡片的重新排版与相关样式调整展开：

1. **首页活动卡片重新排版**：图片下方信息区改为三行——标题、小队信息行、地点与时间行。
2. **小队信息行**：新增 SVG 小队图标 + 后端返回的 `squad_name`，同行右侧新增主题色 `>` 按钮，点击与点击整张卡片走同一跳转逻辑。
3. **箭头按钮细节调整**：文字 `>` 改为圆头描边 SVG 箭头，按钮固定为正圆且箭头水平垂直居中，与小队名称保持同一水平线。
4. **箭头悬停交互**：鼠标或手势移入红色圆形区域时，圆形背景尺寸不变、箭头等比例放大 2 倍。
5. **全局字体**：全局公共样式补充 `view` / `text`，项目文字统一使用微软雅黑字体族。
6. **Tabbar 发布按钮**：在「高度与底栏一致、向上突出」的基础上改为圆形显示。

---

## 二、修改文件

| 文件 | 说明 |
| --- | --- |
| `components/home-activity-card.vue` | 卡片信息区改为三行；新增小队信息行与箭头按钮；新增悬停放大交互 |
| `static/icons/index/squad.svg` | 新增：小队图标（两名队员剪影 + 小队旗帜，主题红线条） |
| `static/icons/ui/chevron-right.svg` | 新增：右向箭头图标（白色圆头圆角描边） |
| `App.vue` | 全局字体选择器补充 `view` / `text` |
| `components/bottom-tab-bar.vue` | 发布按钮改为圆形，高度与底栏一致并向上突出 |

---

## 三、详细改动

### 1. 首页活动卡片重新排版

信息区结构由「标题 → 地点/时间 → 底部报名区」调整为：

| 行 | 内容 |
| --- | --- |
| 第一行 | 活动标题（最多两行，原有样式不变） |
| 第二行 | 小队图标 + 小队名称 + 右侧 `>` 按钮 |
| 第三行 | 活动地点 · 活动时间（同一行，沿用原有布局） |

小队名称读取 `squad_name`，同时兼容驼峰写法 `squadName`，缺失时展示「暂无小队」；名称过长自动单行省略。

```js
/** 所属小队名称：兼容后端 squad_name 与驼峰写法 */
squadName(data) {
    return (data && (data.squad_name || data.squadName)) || '暂无小队'
},
```

### 2. 小队信息行与 `>` 按钮

- 左侧小队图标为新建的 `static/icons/index/squad.svg`：两名队员剪影 + 头顶小队旗帜，线条色使用主题红 `#E8453C`。
- 右侧 `>` 按钮调用 `handleCardClick(data)`，与点击整张活动卡片完全一致：先上报热度，再跳转活动详情页；按钮上使用 `@click.stop` 避免事件冒泡导致重复触发。
- 按钮尺寸 44rpx × 44rpx、`border-radius: 50%`、`box-sizing: border-box`，使用 flex 居中，并设置 `line-height: 0` 消除文字行高带来的偏移。
- 按钮与小队名称处于 `.squadRow` 内，`align-items: center` 保证同一水平线。

```html
<view class="squadRow">
    <view class="squadInfo">
        <image class="squadIcon" :src="squadIcon" mode="aspectFit" />
        <text class="squadName" :number-of-lines="1">{{ squadName(data) }}</text>
    </view>
    <view class="squadArrow" @click.stop="handleCardClick(data)">
        <image class="squadArrowIcon" :src="squadArrowIcon" mode="aspectFit" />
    </view>
</view>
```

### 3. 箭头按钮交互

迭代过程：

1. 初版使用文字 `>`，实际渲染偏扁、字符在圆内不居中；
2. 改为白色圆头描边 SVG 箭头（`static/icons/ui/chevron-right.svg`），彻底解决字形偏移；
3. 交互由「按住时放大 1.35 倍」改为「悬停即放大 2 倍」。

最终样式（`components/home-activity-card.vue`）：

```css
.squadArrowIcon {
    width: 20rpx;
    height: 20rpx;
    transition: transform 0.15s ease;
}

/* 鼠标或手势移入圆形背景区域时，仅内部箭头等比例放大 */
.squadArrow:hover .squadArrowIcon {
    transform: scale(2);
}
```

放大只作用于箭头图片，红色圆形背景的宽高与位置保持不变。

### 4. 全局字体

`App.vue` 全局公共样式中，除原有的 `page` / `button` / `input` 等选择器外，补充 `view`、`text`，确保所有页面文字统一使用微软雅黑字体族：

```css
page,
view,
text,
button,
input,
textarea,
scroll-view,
picker,
label {
    font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Arial, sans-serif;
}
```

### 5. Tabbar 发布按钮

在「高度与底栏 100rpx 一致、向上突出」的基础上，由 120rpx × 100rpx 的圆角矩形改为正圆：

| 属性 | 值 |
| --- | --- |
| 宽 × 高 | 100rpx × 100rpx |
| 圆角 | `50%` |
| 上移偏移 | `translateY(-20rpx)` |
| 布局 | `flex-shrink: 0`，避免被纵向 flex 压扁 |

按钮高度与底栏 `tabItem` 高度一致，通过 `translateY` 向上移动，使其上沿高出底栏上沿。

---

## 四、验证情况

- 浏览器实测首页活动卡片：标题、小队信息行、地点与时间行层级顺序正确；小队图标、名称与右侧红色圆形按钮同行显示。
- 箭头按钮为正圆，箭头水平垂直居中；悬停时箭头放大而圆形背景尺寸不变。
- Tabbar 发布按钮为正圆，上沿高于底栏上沿。
- 页面控制台无报错。

---

## 五、备注

- 小队图标与箭头图标均为新增 SVG 资源，未影响原有图标引用。
- 箭头放大的悬停态在移动端 H5 由浏览器模拟 hover 触发；如需小程序端一致的按压反馈，可后续改用 `hover-class`。
