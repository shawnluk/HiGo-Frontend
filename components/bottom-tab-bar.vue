<template>
	<view class="bottomTabbarWrapper">
		<view class="bottomTabbar">
			<view
				v-for="(item, index) in tabs"
				:key="item.pagePath"
				class="tabItem"
				:class="{ tabItemActive: index === current }"
				@click="onTap(item, index)"
			>
				<image
					class="tabIcon"
					:src="index === current ? item.selectedIconPath : item.iconPath"
					mode="widthFix"
				/>
				<text class="tabText">{{ item.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'BottomTabBar',
	props: {
		// 当前选中的 tab 下标（0~3）
		current: {
			type: Number,
			default: 0
		}
	},
	data() {
		return {
			// 直接复用 pages.json 中的图标配置
			tabs: [
				{
					pagePath: 'pages/index/index',
					text: '活动',
					iconPath: '/static/home-1.png',
					selectedIconPath: '/static/home-0.png'
				},
				{
					pagePath: 'pages/moment/moment',
					text: '时刻',
					iconPath: '/static/moment-1.png',
					selectedIconPath: '/static/moment-0.png'
				},
				{
					pagePath: 'pages/message/message',
					text: '消息',
					iconPath: '/static/message-1.png',
					selectedIconPath: '/static/message-0.png'
				},
				{
					pagePath: 'pages/user/user',
					text: '我的',
					iconPath: '/static/mine-1.png',
					selectedIconPath: '/static/mine-0.png'
				}
			]
		};
	},
	methods: {
		/** 点击 tab：跳转到对应主页面 */
		onTap(item, index) {
			if (index === this.current) return;
			// 使用 reLaunch 切换主页面，避免系统 tabbar 依赖
			uni.reLaunch({
				url: '/' + item.pagePath
			});
		}
	}
};
</script>

<style scoped>
/* 贴底方案：用 sticky 跟随页面滚动容器定位，不再依赖 position: fixed。
   部分 H5 / 5+App 机型上 fixed 会失效（相对页面内容而不是视口定位），
   sticky 则始终相对滚动容器的可视区域贴底，因此任何机型都能显示。 */
.bottomTabbarWrapper {
	/* 兜底：不支持 sticky 的老 WebView 退回 fixed，老 iOS 用 -webkit-sticky */
	position: fixed;
	position: -webkit-sticky;
	position: sticky;
	left: 0;
	right: 0;
	bottom: 0;
	box-sizing: border-box;
	width: 100%;
	display: flex;
	justify-content: center;
	align-items: flex-end;
	z-index: 999;
	pointer-events: none;
	padding-left: 20rpx;
	padding-right: 20rpx;
	/* 悬浮间隙 10rpx + 底部安全区（刘海屏 / 手势条 / 虚拟按键） */
	padding-bottom: 10rpx;
	padding-bottom: calc(10rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(10rpx + env(safe-area-inset-bottom));
	background-color: transparent;
}

.bottomTabbar {
	box-sizing: border-box;
	width: 100%;
	max-width: 700rpx;
	height: 120rpx;
	background: #ffffff;
	border-radius: 80rpx;
	/* 内圈 2rpx 浅灰描边，替代原来的外层渐变边框 */
	box-shadow: inset 0 0 0 2rpx #e6e6e6, 0 18rpx 40rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 40rpx;
	pointer-events: auto;
}

.tabItem {
	flex: 1;
	height: 88rpx;
	margin: 0 8rpx;
	border-radius: 60rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	color: #222222;
	font-size: 24rpx;
}

.tabItemActive {
	background: #fff0ef;
	color: #e8453c;
}

.tabIcon {
	width: 40rpx;
	margin-bottom: 8rpx;
}

.tabText {
	line-height: 1;
}
</style>

