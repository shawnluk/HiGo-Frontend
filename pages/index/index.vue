<template>
	<PageScaffold :tab-index="0">
		<view class="indexHeader">
			<!-- 顶部：城市定位 + 通知铃铛 + 用户头像 / LOGO -->
			<IndexTopBar
				:avatar-url="headerAvatar"
				@bell="onBell"
				@region-change="onRegionChange"
			></IndexTopBar>
			<!-- 首页搜索框 + 筛选 -->
			<IndexSearchBox @search="onSearch" @filter="onFilter"></IndexSearchBox>
		</view>

		<!-- 轮播图组件 -->
		<SwiperBar></SwiperBar>

		<!-- 广播消息（弹幕式循环滚动） -->
		<IndexMarquee></IndexMarquee>

		<!-- 分类列表 -->
		<HomeCategoryBar></HomeCategoryBar>

		<!-- 活动列表 -->
		<view class="activityList">
			<view class="refreshingBar" v-if="refreshing">
				<view class="spinner"></view>
				<text class="refreshingText">刷新中...</text>
			</view>
			<HomeActivityCard ref="activityCard"></HomeActivityCard>
		</view>
	</PageScaffold>
</template>

<script>
import PageScaffold from '@/components/page-scaffold.vue'
import HomeActivityCard from '@/components/home-activity-card.vue'
import SwiperBar from '@/components/swiper-bar.vue'
import IndexTopBar from './components/index-top-bar.vue'
import IndexSearchBox from './components/index-search-box.vue'
import HomeCategoryBar from './components/home-category-bar.vue'
import IndexMarquee from './components/index-marquee.vue'

export default {
	components: { PageScaffold, SwiperBar, HomeActivityCard, HomeCategoryBar, IndexTopBar, IndexSearchBox, IndexMarquee },
	data() {
		return {
			/** 下拉刷新中标记，用于显示自定义转圈 */
			refreshing: false,
			/** 顶部展示的用户头像，为空时展示 logo */
			headerAvatar: '',
		}
	},
	/** 下拉刷新：触发活动卡片刷新，保证转圈动画至少持续 3 秒 */
	async onPullDownRefresh() {
		this.refreshing = true
		try {
			const card = this.$refs.activityCard
			const refreshTask = card && typeof card.refresh === 'function'
				? card.refresh()
				: Promise.resolve()
			// 保证下拉刷新的转圈动画至少持续 3 秒
			await Promise.all([refreshTask, this.delay(3000)])
		} finally {
			this.refreshing = false
			uni.stopPullDownRefresh()
		}
	},
	/** 触底加载：转发给活动卡片组件执行加载下一页 */
	onReachBottom() {
		const card = this.$refs.activityCard
		if (card && typeof card.loadMore === 'function') {
			card.loadMore()
		}
	},
	/** 页面显示/返回时：同步活动卡片的最新热度（如从详情页返回后热度 +1） */
	onShow() {
		this.loadHeaderAvatar()
		const card = this.$refs.activityCard
		if (card && typeof card.syncHotFromCache === 'function') {
			card.syncHotFromCache()
		}
	},
	methods: {
		/** 读取本地登录用户的头像：未登录或未设置头像时留空，顶部展示 logo */
		loadHeaderAvatar() {
			let userId = ''
			let userInfo = null
			try {
				userId = uni.getStorageSync('userId')
				userInfo = uni.getStorageSync('userInfo')
			} catch (_) {}
			this.headerAvatar = userId && userInfo && userInfo.avatar ? userInfo.avatar : ''
		},
		/** 延时工具，返回 Promise */
		delay(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms))
		},
		/** 搜索处理：提示当前搜索关键字 */
		onSearch(payload) {
			const keyword = payload && payload.keyword ? payload.keyword : ''
			if (!keyword) return
			uni.showToast({ title: `搜索：${keyword}`, icon: 'none' })
		},
		/** 点击筛选：预留筛选入口 */
		onFilter() {
			uni.showToast({ title: '筛选功能开发中', icon: 'none' })
		},
		/** 点击通知铃铛：跳转消息页 */
		onBell() {
			uni.navigateTo({ url: '/pages/message/message' })
		},
		/** 城市/区域切换 */
		onRegionChange(payload) {
			const city = payload && payload.city ? payload.city : ''
			if (!city) return
			uni.showToast({ title: `已切换到 ${city}`, icon: 'none' })
		}
	}
}
</script>

<style>
	.indexHeader {
		display: flex;
		flex-direction: column;
		gap: 20rpx;
		padding: 8rpx 24rpx 12rpx;
	}

	.activityList {
		display: flex;
		flex-direction: column;
		gap: 18rpx;
		padding: 10rpx 24rpx 24rpx;
		padding-bottom: calc(190rpx + env(safe-area-inset-bottom));
	}

	.refreshingBar {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 12rpx;
		padding: 12rpx 0;
	}

	.spinner {
		width: 32rpx;
		height: 32rpx;
		border: 4rpx solid #f0e3e2;
		border-top-color: #e8453c;
		border-radius: 50%;
		animation: refreshing-spin 0.8s linear infinite;
	}

	.refreshingText {
		font-size: 24rpx;
		color: #9b9b9b;
	}

	@keyframes refreshing-spin {
		to {
			transform: rotate(360deg);
		}
	}
</style>
