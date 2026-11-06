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
				<text v-if="!item.isPublish" class="tabText">{{ item.text }}</text>
			</view>
		</view>

		<!-- 发布选择弹层：冒泡动画结束后展示 -->
		<view v-if="showPublishSheet" class="publishMask" @click="closePublishSheet"></view>
		<view v-if="showPublishSheet" class="publishSheet" @click.stop>
			<view class="sheetGrabBar"></view>
			<view class="sheetHeader">
				<text class="sheetTitle">发布</text>
				<view class="sheetClose" @click="closePublishSheet">
					<uni-icons type="closeempty" size="18" color="#999999"></uni-icons>
				</view>
			</view>
			<view class="sheetOptions">
				<view class="optionCard" @click="goPublish('activity')">
					<view class="optionIcon optionIconActivity">
						<uni-icons type="notification-filled" size="26" color="#ff3b30"></uni-icons>
					</view>
					<text class="optionTitle">发布活动</text>
					<text class="optionSub">创建线下活动</text>
				</view>
				<view class="optionCard" @click="goPublish('moment')">
					<view class="optionIcon optionIconMoment">
						<uni-icons type="camera-filled" size="26" color="#7d5fff"></uni-icons>
					</view>
					<text class="optionTitle">发布动态</text>
					<text class="optionSub">图文记录出行</text>
				</view>
				<view class="optionCard" @click="goPublish('unit')">
					<view class="optionIcon optionIconUnit">
						<uni-icons type="staff-filled" size="26" color="#3cc36b"></uni-icons>
					</view>
					<text class="optionTitle">创建小队</text>
					<text class="optionSub">成为小队主理人</text>
				</view>
			</view>
			<view class="cancelBtn" @click="closePublishSheet">
				<text class="cancelTxt">取消</text>
			</view>
		</view>

		<!-- 登录提示弹窗（统一复用登录弹窗组件） -->
		<LoginModal
			:visible="loginVisible"
			content="请先登录后再发布内容"
			@update:visible="loginVisible = $event"
		/>
	</view>
</template>

<script>
import LoginModal from '@/components/login-modal.vue'

export default {
	name: 'BottomTabBar',
	components: { LoginModal },
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
			// 冒泡结束后展示的发布选择弹层
			showPublishSheet: false,
			isNavigating: false,
			bubbleTimer: null,
			// 登录提示弹窗显隐
			loginVisible: false,
			// 图标配置：默认灰色 SVG，选中态为主题色 SVG
			tabs: [
				{
					pagePath: 'pages/index/index',
					text: '活动',
					// 旧图标（PNG 双色图）配置，暂时保留不删除
					// iconPath: '/static/home-1.png',
					// selectedIconPath: '/static/home-0.png',
					icon: '/static/icons/tabbar/activity.svg',
					activeIcon: '/static/icons/tabbar/activity-active.svg'
				},
				{
					pagePath: 'pages/moment/moment',
					text: '时刻',
					// 旧图标（PNG 双色图）配置，暂时保留不删除
					// iconPath: '/static/moment-1.png',
					// selectedIconPath: '/static/moment-0.png',
					icon: '/static/icons/tabbar/moment.svg',
					activeIcon: '/static/icons/tabbar/moment-active.svg'
				},
				{
					// 发布入口：位于「时刻」和「消息」之间的独立功能按钮
					isPublish: true,
					text: '发布'
				},
				{
					pagePath: 'pages/message/message',
					text: '消息',
					// 旧图标（PNG 双色图）配置，暂时保留不删除
					// iconPath: '/static/message-1.png',
					// selectedIconPath: '/static/message-0.png',
					icon: '/static/icons/tabbar/message.svg',
					activeIcon: '/static/icons/tabbar/message-active.svg'
				},
				{
					pagePath: 'pages/user/user',
					text: '我的',
					// 旧图标（PNG 双色图）配置，暂时保留不删除
					// iconPath: '/static/mine-1.png',
					// selectedIconPath: '/static/mine-0.png',
					icon: '/static/icons/tabbar/mine.svg',
					activeIcon: '/static/icons/tabbar/mine-active.svg'
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

		/** 发布活动：先校验登录态，播放冒泡动画后弹出发布选择面板 */
		onPublish() {
			const token = uni.getStorageSync('token');
			if (!token) {
				this.loginVisible = true;
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

			// 等待气泡动画全部播放完毕（CSS 时长 1.1s + 最后一个气泡延迟 0.4s = 1.5s）
			this.bubbleTimer = setTimeout(() => {
				this.isBubbling = false;
				this.showPublishSheet = true;
				this.isNavigating = false;
				this.bubbleTimer = null;
			}, 1500);
		},

		/** 关闭发布选择面板 */
		closePublishSheet() {
			this.showPublishSheet = false;
		},

		/** 选择发布类型后跳转对应创建页面 */
		goPublish(type) {
			const routes = {
				activity: '/src/create-activity/create-activity',
				moment: '/src/create-moment/create-moment',
				unit: '/src/create-unit/create-unit'
			};
			const url = routes[type];
			if (!url) return;
			this.closePublishSheet();
			uni.navigateTo({
				url,
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' });
				}
			});
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
	padding-left: 40rpx;
	padding-right: 40rpx;
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
	/* 高度与选中态胶囊一致，避免选中效果上下出现空白 */
	height: 100rpx;
	background: #ffffff;
	border-radius: 80rpx;
	/* 内圈 2rpx 浅灰描边，替代原来的外层渐变边框 */
	box-shadow: inset 0 0 0 2rpx #e6e6e6, 0 18rpx 40rpx rgba(0, 0, 0, 0.08);
	display: flex;
	align-items: center;
	/* 左右不留内边距，使选中态首尾与底栏两端对齐 */
	padding: 0;
	gap: 16rpx;
	pointer-events: auto;
}

.tabItem {
	flex: 1;
	height: 100rpx;
	margin: 0;
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
	height: 40rpx;
	margin-bottom: 8rpx;
}

.tabText {
	line-height: 1;
}

/* 居中的发布按钮：圆形，高度与底栏一致，整体上移使按钮向上突出底栏 */
.tabPublishBtn {
	position: relative;
	width: 100rpx;
	height: 100rpx;
	/* tabItem 是 100rpx 高的纵向 flex，默认 flex-shrink:1 会把按钮压扁 */
	flex-shrink: 0;
	border-radius: 50%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	background: linear-gradient(150deg, #ff6a5c 0%, #ff3b30 58%, #f32a22 100%);
	border: 2rpx solid rgba(255, 255, 255, 0.7);
	box-shadow: 0 14rpx 30rpx rgba(255, 59, 48, 0.3), 0 6rpx 14rpx rgba(255, 106, 92, 0.22);
	overflow: visible;
	/* 上移使按钮高出底栏上沿 */
	transform: translateY(-20rpx);
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
	animation-duration: 1.1s;
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
	animation-delay: 0.06s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(3) {
	--dx: 0rpx;
	--dy: -136rpx;
	--s: 1.2;
	min-width: 52rpx;
	height: 30rpx;
	animation-delay: 0.12s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(4) {
	--dx: 24rpx;
	--dy: -154rpx;
	--s: 0.9;
	min-width: 38rpx;
	height: 24rpx;
	animation-delay: 0.2s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(5) {
	--dx: 50rpx;
	--dy: -128rpx;
	--s: 1;
	min-width: 46rpx;
	height: 28rpx;
	animation-delay: 0.28s;
}

.tabPublishBtn.isBubbling .bubbleItem:nth-child(6) {
	--dx: 14rpx;
	--dy: -116rpx;
	--s: 0.78;
	min-width: 34rpx;
	height: 22rpx;
	animation-delay: 0.4s;
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

/* ===== 发布选择弹层 ===== */
.publishMask {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1100;
	background: rgba(0, 0, 0, 0.35);
	pointer-events: auto;
	animation: maskFade 0.2s ease-out;
}

.publishSheet {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1200;
	box-sizing: border-box;
	background: #ffffff;
	border-radius: 28rpx 28rpx 0 0;
	padding: 12rpx 24rpx 24rpx;
	padding-bottom: calc(24rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(24rpx + env(safe-area-inset-bottom, 0px));
	pointer-events: auto;
	animation: sheetUp 0.26s ease-out;
}

.sheetGrabBar {
	width: 72rpx;
	height: 8rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.12);
	margin: 8rpx auto 20rpx;
}

.sheetHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 0 4rpx;
	margin-bottom: 24rpx;
}

.sheetTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
}

.sheetClose {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	background: #f2f2f3;
	display: flex;
	align-items: center;
	justify-content: center;
}

.sheetClose:active {
	opacity: 0.8;
}

.sheetOptions {
	display: flex;
	align-items: stretch;
	gap: 16rpx;
}

.optionCard {
	flex: 1;
	box-sizing: border-box;
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 26rpx 8rpx 22rpx;
	border-radius: 20rpx;
	border: 1rpx solid #ececec;
	background: #ffffff;
}

.optionCard:active {
	opacity: 0.85;
}

.optionIcon {
	width: 88rpx;
	height: 88rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 16rpx;
}

.optionIconActivity {
	background: #ffe9e6;
}

.optionIconMoment {
	background: #efeafd;
}

.optionIconUnit {
	background: #e7f8ec;
}

.optionTitle {
	font-size: 28rpx;
	font-weight: 600;
	color: #1f1f1f;
	line-height: 1.3;
}

.optionSub {
	margin-top: 6rpx;
	font-size: 22rpx;
	color: #a8a8a8;
	line-height: 1.3;
	text-align: center;
}

.cancelBtn {
	margin-top: 24rpx;
	height: 92rpx;
	border-radius: 20rpx;
	background: #f5f5f6;
	display: flex;
	align-items: center;
	justify-content: center;
}

.cancelBtn:active {
	opacity: 0.85;
}

.cancelTxt {
	font-size: 30rpx;
	font-weight: 500;
	color: #333333;
}

@keyframes sheetUp {
	from {
		transform: translateY(100%);
	}
	to {
		transform: translateY(0);
	}
}

@keyframes maskFade {
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>

