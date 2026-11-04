<template>
	<view class="bottomTabbarWrapper">
		<view class="bottomTabbar">
			<view
				v-for="(item, index) in tabs"
				:key="item.pagePath || 'publish'"
				class="tabItem"
				:class="{ tabItemActive: index === current }"
				@click="onTap(item, index)"
			>
				<view v-if="item.isPublish" class="tabPublishBtn" :class="{ isBubbling: isBubbling }">
					<view class="bubbleLayer">
						<view v-for="n in 6" :key="n" class="bubbleItem">
							<text class="bubbleText">HiGo</text>
						</view>
					</view>
					<text class="tabPublishPlus">+</text>
					<text class="tabPublishText">发布</text>
				</view>
				<image
					v-else
					class="tabIcon"
					:src="index === current ? item.selectedIconPath : item.iconPath"
					mode="widthFix"
				/>
				<text v-if="!item.isPublish" class="tabText">{{ item.text }}</text>
			</view>
		</view>
	</view>
</template>

<script>
export default {
	name: 'BottomTabBar',
	props: {
		// 当前选中的 tab 下标（0~4，发布按钮本身不可选中）
		current: {
			type: Number,
			default: 0
		}
	},
	data() {
		return {
			// 发布按钮的冒泡动画状态
			isBubbling: false,
			isNavigating: false,
			bubbleTimer: null,
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
					// 发布入口：位于「时刻」和「消息」之间的独立功能按钮
					isPublish: true,
					text: '发布'
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
		/** 点击 tab：发布走发布流程，其余跳转对应主页面 */
		onTap(item, index) {
			if (item.isPublish) {
				this.onPublish();
				return;
			}
			if (index === this.current) return;
			// 使用 reLaunch 切换主页面，避免系统 tabbar 依赖
			uni.reLaunch({
				url: '/' + item.pagePath
			});
		},

		/** 发布活动：先校验登录态，播放冒泡动画后进入创建活动页 */
		onPublish() {
			const token = uni.getStorageSync('token');
			if (!token) {
				uni.showModal({
					title: '提示',
					content: '请先登录后再发布活动',
					confirmText: '去登录',
					cancelText: '取消',
					success: (res) => {
						if (res.confirm) {
							uni.navigateTo({ url: '/src/login/login' });
						}
					}
				});
				return;
			}
			if (this.isNavigating) return;
			this.isNavigating = true;
			this.isBubbling = false;

			if (this.bubbleTimer) {
				clearTimeout(this.bubbleTimer);
			}

			this.$nextTick(() => {
				this.isBubbling = true;
			});

			// 与冒泡动画时长一致，动画结束后再跳转
			this.bubbleTimer = setTimeout(() => {
				uni.redirectTo({
					url: '/src/create-activity/create-activity',
					fail: () => {
						this.isNavigating = false;
						this.isBubbling = false;
						uni.showToast({ title: '页面打开失败', icon: 'none' });
					}
				});
			}, 3000);
		}
	},

	/** 组件销毁：清理冒泡定时器与动画状态 */
	beforeDestroy() {
		if (this.bubbleTimer) {
			clearTimeout(this.bubbleTimer);
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

/* 居中的发布按钮：沿用原「我的」页悬浮按钮的红色圆形样式，向上突出底栏范围 */
.tabPublishBtn {
	position: relative;
	width: 116rpx;
	height: 116rpx;
	/* tabItem 是 88rpx 高的纵向 flex，默认 flex-shrink:1 会把圆压成椭圆 */
	flex-shrink: 0;
	min-height: 116rpx;
	border-radius: 50%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: linear-gradient(150deg, #ff6a5c 0%, #ff3b30 58%, #f32a22 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.7);
	box-shadow: 0 14rpx 30rpx rgba(255, 59, 48, 0.3), 0 6rpx 14rpx rgba(255, 106, 92, 0.22);
	overflow: visible;
	/* 上移使圆形高出底栏上沿 */
	transform: translateY(-26rpx);
}

/* 吐泡泡层：动画期间从按钮上方升起 */
.bubbleLayer {
	position: absolute;
	left: 50%;
	bottom: 84rpx;
	width: 180rpx;
	height: 160rpx;
	transform: translateX(-50%);
	pointer-events: none;
	z-index: 1;
}

.bubbleItem {
	position: absolute;
	bottom: 20rpx;
	left: 50%;
	min-width: 44rpx;
	height: 28rpx;
	padding: 0 10rpx;
	border-radius: 999rpx;
	opacity: 0;
	transform: translateX(-50%) scale(0.6);
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(145deg, rgba(255, 255, 255, 0.96) 0%, rgba(255, 236, 233, 0.96) 60%, rgba(255, 196, 189, 0.9) 100%);
	box-shadow: 0 4rpx 12rpx rgba(255, 59, 48, 0.26);
	border: 1rpx solid rgba(255, 255, 255, 0.85);
}

.bubbleText {
	font-size: 14rpx;
	line-height: 1;
	font-weight: 700;
	color: #ff3b30;
	letter-spacing: 1rpx;
}

.tabPublishBtn.isBubbling .bubbleItem {
	animation-name: bubbleRise;
	animation-duration: 3s;
	animation-timing-function: cubic-bezier(0.2, 0.55, 0.2, 1);
	animation-fill-mode: forwards;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(1) {
	--dx: -56rpx;
	--dy: -126rpx;
	--s: 1.1;
	animation-delay: 0s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(2) {
	--dx: -26rpx;
	--dy: -148rpx;
	--s: 0.95;
	min-width: 40rpx;
	height: 26rpx;
	animation-delay: 0.15s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(3) {
	--dx: 0rpx;
	--dy: -136rpx;
	--s: 1.2;
	min-width: 52rpx;
	height: 30rpx;
	animation-delay: 0.32s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(4) {
	--dx: 24rpx;
	--dy: -154rpx;
	--s: 0.9;
	min-width: 38rpx;
	height: 24rpx;
	animation-delay: 0.55s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(5) {
	--dx: 50rpx;
	--dy: -128rpx;
	--s: 1;
	min-width: 46rpx;
	height: 28rpx;
	animation-delay: 0.8s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(6) {
	--dx: 14rpx;
	--dy: -116rpx;
	--s: 0.78;
	min-width: 34rpx;
	height: 22rpx;
	animation-delay: 1.05s;
}

@keyframes bubbleRise {
	0% {
		opacity: 0;
		transform: translate(-50%, 0) scale(0.5);
	}
	15% {
		opacity: 1;
	}
	100% {
		opacity: 0;
		transform: translate(calc(-50% + var(--dx, 0rpx)), var(--dy, -120rpx)) scale(var(--s, 1));
	}
}

.tabPublishPlus {
	position: relative;
	z-index: 3;
	color: #ffffff;
	font-size: 44rpx;
	line-height: 42rpx;
	font-weight: 700;
	text-shadow: 0 2rpx 8rpx rgba(150, 20, 15, 0.24);
}

.tabPublishText {
	position: relative;
	z-index: 3;
	margin-top: 2rpx;
	color: #ffffff;
	font-size: 22rpx;
	line-height: 22rpx;
	font-weight: 600;
	letter-spacing: 2rpx;
	text-shadow: 0 2rpx 8rpx rgba(150, 20, 15, 0.2);
}
</style>

