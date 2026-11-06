<template>
	<view class="topBar">
		<!-- 城市/区域定位 -->
		<!-- #ifndef H5 -->
		<picker mode="region" :value="innerRegion" @change="handleRegionChange">
		<!-- #endif -->
			<!-- H5 端 uni-picker 不支持 region 模式，仅保留展示 -->
			<view class="locationBox" @click="handleLocationTap">
				<view class="locTextWrap">
					<view class="locLabelRow">
						<image class="locIcon" src="/static/address.png" mode="aspectFit" />
						<text class="locLabel">当前城市</text>
					</view>
					<view class="locCityRow">
						<text class="locCity">{{ displayCity }}</text>
						<text class="locArrow">▾</text>
					</view>
				</view>
			</view>
		<!-- #ifndef H5 -->
		</picker>
		<!-- #endif -->

		<!-- 右侧：通知铃铛 + LOGO（纯展示，无点击跳转） -->
		<view class="actions">
			<view class="bellBtn" @click="handleBell">
				<text class="bellIcon">🔔</text>
				<view v-if="unread" class="bellDot" />
			</view>
			<image
				class="navLogo"
				src="/static/logo-nav.png"
				mode="aspectFit"
			/>
		</view>
	</view>
</template>

<script>
import { MOCK_INDEX_INITIAL_CITY, MOCK_INDEX_INITIAL_REGION } from '@/mock/index-page.js'

export default {
	name: 'IndexTopBar',
	props: {
		initialCity: {
			type: String,
			default: MOCK_INDEX_INITIAL_CITY,
		},
		initialRegion: {
			type: Array,
			default: () => [...MOCK_INDEX_INITIAL_REGION],
		},
		/** 通知未读红点 */
		unread: {
			type: Boolean,
			default: true,
		},
	},
	data() {
		return {
			innerCity: this.initialCity,
			innerRegion: this.initialRegion,
		}
	},
	computed: {
		/** 展示「城市 · 区县」 */
		displayCity() {
			const district = Array.isArray(this.innerRegion) ? this.innerRegion[2] : ''
			return district && this.innerCity ? `${this.innerCity} · ${district}` : this.innerCity
		},
	},
	methods: {
		/** 地区选择：更新城市与地区并通知外部 */
		handleRegionChange(e) {
			const value = (e && e.detail && e.detail.value) || []
			if (!Array.isArray(value) || value.length < 2) return
			this.innerRegion = value
			const nextCity = value[1] ? String(value[1]).replace(/市$/, '') : this.innerCity
			this.innerCity = nextCity
			this.$emit('region-change', { city: this.innerCity, region: this.innerRegion })
		},
		/** H5 端没有 region 选择器，点击定位区域仅提示（小程序/App 由 picker 接管） */
		handleLocationTap() {
			// #ifdef H5
			uni.showToast({ title: 'H5 端暂不支持城市选择', icon: 'none' })
			// #endif
		},
		/** 点击通知铃铛 */
		handleBell() {
			this.$emit('bell')
		},
	},
}
</script>

<style scoped>
.topBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	/* 全局 navigationStyle 为 custom，需主动避让系统状态栏（时间 / 电量） */
	padding-top: var(--status-bar-height, 50rpx);
	padding-right: 8rpx;
	padding-left: 8rpx;
}

.locationBox {
	display: flex;
	align-items: center;
	flex: 1;
	min-width: 0;
	overflow: hidden;
}

.locIcon {
	width: 30rpx;
	height: 30rpx;
}

.locLabelRow {
	display: flex;
	align-items: center;
}

.locTextWrap {
	display: flex;
	flex-direction: column;
	min-width: 0;
	overflow: hidden;
}

.locLabel {
	font-size: 22rpx;
	color: #999999;
	line-height: 1.2;
}

.locCityRow {
	display: flex;
	align-items: center;
	margin-top: 4rpx;
}

.locCity {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
	line-height: 1.2;
	max-width: 230rpx;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.locArrow {
	margin-left: 8rpx;
	font-size: 26rpx;
	color: #777777;
}

.actions {
	display: flex;
	align-items: center;
	gap: 20rpx;
	flex-shrink: 0;
}

.bellBtn {
	position: relative;
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: #ffffff;
	border: 1rpx solid rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.06);
}

.bellIcon {
	font-size: 32rpx;
}

.bellDot {
	position: absolute;
	top: 8rpx;
	right: 10rpx;
	width: 16rpx;
	height: 16rpx;
	border-radius: 50%;
	background: #e8453c;
	border: 2rpx solid #ffffff;
}

.navLogo {
	width: 122rpx;
	height: 60rpx;
	flex-shrink: 0;
	transform: translateY(-10rpx);
}
</style>