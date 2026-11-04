<template>
	<view class="quickSection">
		<view class="quickInner">
			<view
				v-for="item in items"
				:key="item.label"
				class="quickItem"
				hover-class="quickItem--hover"
				hover-stay-time="120"
				@tap="onTap(item)"
			>
				<view class="quickIconWrap" :style="{ background: item.bg }">
					<text class="quickIcon">{{ item.icon }}</text>
				</view>
				<text class="quickLabel">{{ item.label }}</text>
			</view>
		</view>
	</view>
</template>

<script>
import { MOCK_USER_QUICK_ENTRIES } from '@/mock/user-display.js'

export default {
	name: 'UserQuickEntryPanel',
	props: {
		items: {
			type: Array,
			default: () => MOCK_USER_QUICK_ENTRIES.map((row) => ({ ...row })),
		},
	},
	methods: {
		/** 快捷入口：暂只提示，后续接入具体跳转 */
		onTap(item) {
			uni.showToast({
				title: `${item.label}功能开发中`,
				icon: 'none',
			})
		},
	},
}
</script>

<style scoped>
.quickSection {
	/* 与顶部红色卡片无间隙相接（父级 .userTop 无 gap），左右比顶部区域再内收一截；
	   上沿紧贴红卡，故左上/右上为直角，仅下方两角圆角 */
	margin: 0 30rpx;
	position: relative;
	overflow: hidden;
	background: #ffffff;
	border-radius: 0 0 32rpx 32rpx;
	padding: 26rpx 12rpx 22rpx;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
}

.quickInner {
	position: relative;
	z-index: 1;
	display: flex;
	justify-content: space-around;
}

.quickItem {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 16rpx;
	flex: 1;
	min-width: 0;
	border-radius: 24rpx;
	padding: 8rpx 0;
	transition: background 0.15s ease;
}

.quickItem--hover {
	background: #f7f7f8;
}

.quickIconWrap {
	width: 96rpx;
	height: 96rpx;
	border-radius: 26rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid rgba(0, 0, 0, 0.03);
	box-shadow: 0 6rpx 14rpx rgba(0, 0, 0, 0.04);
}

.quickIcon {
	font-size: 48rpx;
	line-height: 1;
}

.quickLabel {
	font-size: 24rpx;
	font-weight: 500;
	color: #1a1a1a;
}
</style>
