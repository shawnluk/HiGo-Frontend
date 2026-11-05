<template>
	<view class="itineraryPage" :style="{ paddingTop: statusBarHeight + 'px' }">
		<!-- 顶部：返回 + 标题 + 筛选入口 -->
		<view class="pageHeader">
			<view class="headerLeft">
				<view class="backBtn" hover-class="backBtn--hover" @tap="goBack">
					<uni-icons type="left" size="18" color="#333333" />
				</view>
				<text class="pageTitle">行程</text>
			</view>
			<view class="filterBtn" hover-class="filterBtn--hover" @tap="onFilterTap">
				<view class="filterLine filterLine--long"></view>
				<view class="filterLine filterLine--short"></view>
				<view class="filterLine filterLine--mid"></view>
			</view>
		</view>

		<!-- 状态切换：待开始 / 已结束 -->
		<view class="tabsTrack">
			<view
				v-for="tab in tabs"
				:key="tab.key"
				class="tabItem"
				:class="{ tabItemActive: activeTab === tab.key }"
				@tap="onTabTap(tab.key)"
			>
				<text class="tabTxt">{{ tab.label }}</text>
			</view>
		</view>

		<!-- 本周日期条 -->
		<scroll-view class="weekScroll" scroll-x :show-scrollbar="false">
			<view class="weekRow">
				<view
					v-for="(day, index) in weekDays"
					:key="day.label"
					class="dayCard"
					:class="{ dayCardActive: selectedIndex === index }"
					@tap="selectedIndex = index"
				>
					<text class="dayLabel">{{ day.label }}</text>
					<text class="dayDate">{{ day.date }}</text>
				</view>
			</view>
		</scroll-view>

		<!-- 当日行程 -->
		<view class="sectionHeader">
			<text class="sectionTitle">本周{{ selectedDayLabel }}·{{ filteredItems.length }}场活动</text>
			<text class="pendingTag">（待接入）</text>
		</view>

		<view v-if="filteredItems.length" class="timeline">
			<view v-for="(item, index) in filteredItems" :key="item.id" class="timelineItem">
				<view class="timeCol">
					<text class="timeTxt">{{ item.time }}</text>
				</view>

				<view class="railCol">
					<view class="dot" :class="item.status === 'upcoming' ? 'dotUpcoming' : 'dotEnded'"></view>
					<view v-if="index !== filteredItems.length - 1" class="railLine"></view>
				</view>

				<view class="itemMain">
					<text class="statusTxt" :class="item.status === 'upcoming' ? 'statusUpcoming' : 'statusEnded'">
						{{ item.status === 'upcoming' ? '待开始' : '已结束' }}
					</text>

					<view class="tripCard" hover-class="tripCard--hover" hover-stay-time="120" @tap="onItemTap">
						<view class="cover" :style="{ background: item.cover }"></view>
						<view class="cardBody">
							<view class="titleRow">
								<text class="cardTitle">{{ item.title }}</text>
								<text class="priceTag" :class="priceClass(item.badgeType)">{{ item.priceText }}</text>
							</view>
							<view class="locationRow">
								<uni-icons type="location-filled" size="13" color="#ff3b30" />
								<text class="locationTxt">
									{{ item.location }}<text v-if="item.joined">·已报名 {{ item.joined }} 人</text>
								</text>
							</view>
							<view class="sourceRow">
								<text class="sourceLabel">来自·</text>
								<text class="sourceTxt">{{ item.source }}</text>
							</view>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view v-else class="emptyState">
			<text class="emptyTitle">这一天暂时没有行程</text>
			<text class="emptySub">行程数据（待接入）</text>
		</view>

		<view class="safeBottom"></view>
	</view>
</template>

<script>
import { ITINERARY_TABS, WEEK_LABELS } from '@/constants/itinerary.js'
import { MOCK_ITINERARY_ITEMS } from '@/mock/itineraries.js'

/** 按本周一为起点生成周日期条 */
function buildWeekDays() {
	const now = new Date()
	const weekday = now.getDay() || 7
	const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - weekday + 1)
	return WEEK_LABELS.map((label, index) => {
		const date = new Date(monday.getTime() + index * 24 * 60 * 60 * 1000)
		return { label, date: date.getDate(), dayIndex: index }
	})
}

export default {
	data() {
		return {
			statusBarHeight: 0,
			tabs: ITINERARY_TABS,
			activeTab: 'upcoming',
			weekDays: [],
			selectedIndex: 0,
			todayIndex: 0,
			items: MOCK_ITINERARY_ITEMS,
		}
	},
	computed: {
		/** 把 mock 的相对天偏移换算成当前周的星期下标 */
		allItems() {
			return this.items.map((item) => ({
				...item,
				dayIndex: (this.todayIndex + item.dayOffset) % 7,
			}))
		},
		filteredItems() {
			return this.allItems.filter(
				(item) => item.dayIndex === this.selectedIndex && item.status === this.activeTab
			)
		},
		selectedDayLabel() {
			const day = this.weekDays[this.selectedIndex]
			return day ? day.label : WEEK_LABELS[0]
		},
	},
	onLoad() {
		const info = uni.getSystemInfoSync()
		this.statusBarHeight = info.statusBarHeight || 0

		const now = new Date()
		const weekday = now.getDay() || 7
		this.todayIndex = weekday - 1
		this.selectedIndex = this.todayIndex
		this.weekDays = buildWeekDays()
	},
	methods: {
		goBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
				return
			}
			uni.reLaunch({ url: '/pages/index/index' })
		},
		onTabTap(key) {
			if (this.activeTab === key) return
			this.activeTab = key
		},
		onFilterTap() {
			uni.showToast({ title: '行程筛选功能待接入', icon: 'none' })
		},
		onItemTap() {
			uni.showToast({ title: '行程详情待接入', icon: 'none' })
		},
		priceClass(type) {
			if (type === 'free') return 'priceFree'
			if (type === 'checked') return 'priceChecked'
			return 'pricePaid'
		},
	},
}
</script>

<style scoped>
.itineraryPage {
	min-height: 100vh;
	box-sizing: border-box;
	padding-left: 28rpx;
	padding-right: 28rpx;
	background: #f5f5f7;
}

/* 顶部标题 */
.pageHeader {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding-top: 36rpx;
}

.headerLeft {
	display: flex;
	align-items: center;
}

.backBtn {
	width: 68rpx;
	height: 68rpx;
	margin-right: 18rpx;
	border-radius: 50%;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.backBtn--hover {
	background: #f0f0f2;
}

.pageTitle {
	font-size: 56rpx;
	font-weight: 800;
	color: #111111;
	letter-spacing: 2rpx;
}

.filterBtn {
	width: 76rpx;
	height: 76rpx;
	border-radius: 50%;
	background: #ffffff;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.06);
}

.filterBtn--hover {
	background: #f0f0f2;
}

.filterLine {
	height: 4rpx;
	border-radius: 4rpx;
	background: #333333;
}

.filterLine--long {
	width: 30rpx;
}

.filterLine--short {
	width: 18rpx;
}

.filterLine--mid {
	width: 24rpx;
}

/* 状态切换 */
.tabsTrack {
	margin-top: 32rpx;
	display: flex;
	align-items: center;
	padding: 8rpx;
	background: #ececee;
	border-radius: 999rpx;
}

.tabItem {
	flex: 1;
	height: 80rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 999rpx;
}

.tabItemActive {
	background: #ff3b30;
	box-shadow: 0 8rpx 20rpx rgba(255, 59, 48, 0.24);
}

.tabTxt {
	font-size: 28rpx;
	font-weight: 600;
	color: #8e8e93;
}

.tabItemActive .tabTxt {
	color: #ffffff;
}

/* 周日期条 */
.weekScroll {
	margin-top: 28rpx;
	white-space: nowrap;
}

.weekRow {
	display: flex;
	padding-bottom: 4rpx;
}

.dayCard {
	width: 108rpx;
	height: 124rpx;
	margin-right: 16rpx;
	background: #ffffff;
	border-radius: 22rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.dayCardActive {
	background: #ff3b30;
	box-shadow: 0 10rpx 24rpx rgba(255, 59, 48, 0.26);
}

.dayLabel {
	font-size: 22rpx;
	color: #9a9aa0;
	line-height: 1.2;
}

.dayDate {
	margin-top: 8rpx;
	font-size: 36rpx;
	font-weight: 800;
	color: #1a1a1a;
	line-height: 1.1;
}

.dayCardActive .dayLabel,
.dayCardActive .dayDate {
	color: #ffffff;
}

/* 区块标题 */
.sectionHeader {
	margin-top: 36rpx;
	display: flex;
	align-items: center;
}

.sectionTitle {
	font-size: 32rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.pendingTag {
	margin-left: 8rpx;
	font-size: 22rpx;
	color: #b0b0b5;
}

/* 时间轴 */
.timeline {
	margin-top: 24rpx;
}

.timelineItem {
	display: flex;
	padding-bottom: 28rpx;
}

.timeCol {
	width: 96rpx;
	flex-shrink: 0;
	padding-top: 2rpx;
}

.timeTxt {
	font-size: 28rpx;
	font-weight: 700;
	color: #1a1a1a;
}

.railCol {
	width: 36rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
	flex-shrink: 0;
}

.dot {
	width: 18rpx;
	height: 18rpx;
	border-radius: 50%;
	box-sizing: border-box;
	margin-top: 6rpx;
}

.dotUpcoming {
	border: 4rpx solid #ff3b30;
	background: #ffffff;
}

.dotEnded {
	background: #d6d6db;
}

.railLine {
	width: 2rpx;
	flex: 1;
	margin-top: 10rpx;
	background: #e3e3e6;
}

.itemMain {
	flex: 1;
	min-width: 0;
	padding-left: 8rpx;
}

.statusTxt {
	display: block;
	margin-bottom: 10rpx;
	font-size: 24rpx;
	font-weight: 600;
}

.statusUpcoming {
	color: #ff3b30;
}

.statusEnded {
	color: #a0a0a6;
}

/* 行程卡片 */
.tripCard {
	display: flex;
	align-items: stretch;
	padding: 20rpx;
	background: #ffffff;
	border-radius: 26rpx;
	box-shadow: 0 10rpx 28rpx rgba(0, 0, 0, 0.05);
}

.tripCard--hover {
	background: #fbfbfc;
}

.cover {
	width: 156rpx;
	height: 126rpx;
	border-radius: 18rpx;
	flex-shrink: 0;
}

.cardBody {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: space-between;
	padding-left: 20rpx;
}

.titleRow {
	display: flex;
	align-items: flex-start;
}

.cardTitle {
	flex: 1;
	min-width: 0;
	font-size: 30rpx;
	font-weight: 700;
	line-height: 1.35;
	color: #1a1a1a;
	overflow: hidden;
	text-overflow: ellipsis;
	display: -webkit-box;
	-webkit-line-clamp: 2;
	-webkit-box-orient: vertical;
}

.priceTag {
	margin-left: 12rpx;
	padding: 4rpx 14rpx;
	border-radius: 999rpx;
	font-size: 22rpx;
	font-weight: 600;
	line-height: 1.5;
	flex-shrink: 0;
}

.pricePaid {
	background: #ffe9ec;
	color: #ff5a6e;
}

.priceFree {
	background: #f0e9ff;
	color: #7d5fff;
}

.priceChecked {
	background: #f1f1f3;
	color: #9a9aa0;
}

.locationRow {
	display: flex;
	align-items: center;
	margin-top: 10rpx;
}

.locationTxt {
	margin-left: 6rpx;
	font-size: 24rpx;
	color: #6f6f75;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.sourceRow {
	margin-top: 12rpx;
	font-size: 24rpx;
	line-height: 1.4;
}

.sourceLabel {
	color: #9a9aa0;
}

.sourceTxt {
	color: #ff3b30;
	font-weight: 600;
}

/* 空状态 */
.emptyState {
	margin-top: 24rpx;
	padding: 64rpx 24rpx;
	background: #ffffff;
	border-radius: 26rpx;
	display: flex;
	flex-direction: column;
	align-items: center;
}

.emptyTitle {
	font-size: 28rpx;
	font-weight: 600;
	color: #4a4a4a;
}

.emptySub {
	margin-top: 10rpx;
	font-size: 24rpx;
	color: #b0b0b5;
}

.safeBottom {
	height: calc(40rpx + constant(safe-area-inset-bottom));
	height: calc(40rpx + env(safe-area-inset-bottom));
}
</style>
