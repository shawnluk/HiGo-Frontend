<template>
	<view class="listCard">
		<view
			v-for="item in items"
			:key="item.label"
			class="listRow"
			hover-class="listRow--hover"
			hover-stay-time="120"
			@tap="onTap(item)"
		>
			<view class="rowIconWrap" :style="{ background: item.bg }">
				<text class="rowIcon">{{ item.icon }}</text>
			</view>
			<text class="rowLabel">{{ item.label }}</text>
			<text v-if="item.value" class="rowValue">{{ item.value }}</text>
			<text class="rowArrow">›</text>
		</view>
	</view>
</template>

<script>
/**
 * 通用功能列表卡片：左侧小图标方块 + 标题 + 右侧数值 + 箭头。
 * 供「我的行程/动态/收藏」与「券票与订单/客服/设置」两组卡片复用。
 */
export default {
	name: 'UserListCard',
	props: {
		items: {
			type: Array,
			default: () => [],
		},
	},
	methods: {
		/** 我的行程进入行程页，其余入口暂未接入 */
		onTap(item) {
			if (item.label === '我的行程') {
				uni.navigateTo({ url: '/src/itinerary/itinerary' })
				return
			}
			uni.showToast({
				title: `${item.label}功能开发中`,
				icon: 'none',
			})
		},
	},
}
</script>

<style scoped>
/* 沿用旧的白色圆角卡片样式 */
.listCard {
	margin-top: 30rpx;
	background: #ffffff;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
}

.listRow {
	display: flex;
	align-items: center;
	padding: 21rpx 22rpx;
}

.listRow + .listRow {
	border-top: 1rpx solid #f2f2f2;
}

.listRow--hover {
	background: #fafafa;
}

.rowIconWrap {
	width: 56rpx;
	height: 56rpx;
	border-radius: 14rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	margin-right: 18rpx;
	flex-shrink: 0;
}

.rowIcon {
	font-size: 30rpx;
	line-height: 1;
}

.rowLabel {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	font-weight: 500;
	color: #1a1a1a;
}

.rowValue {
	font-size: 24rpx;
	color: #999999;
	margin-right: 12rpx;
}

.rowArrow {
	font-size: 26rpx;
	color: #c8c8c8;
	line-height: 1;
}
</style>
