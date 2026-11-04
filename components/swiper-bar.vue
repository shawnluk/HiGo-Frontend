<template>
	<view>
		<!-- 配置轮播图属性 -->
		<view class="banner">
			<swiper
			:indicator-dots="true"
			:autoplay="true"
			:interval="3000"
			:duration="1000"
			circular>			
				<swiper-item v-for="(item, index) in swiperList" :key="index">
					<!-- <image :src="item.url" mode="aspectFill" /> -->
				<image :src="item.url" />
				</swiper-item>
			</swiper>
		</view>
	</view>
</template>

<script>
export default {
	name: 'Swiper',
	props: {
		// 轮播图数据
		swiperList: {
			type: Array,
			default: () => [
			{url:"https://unitone-1310134019.cos.ap-guangzhou.myqcloud.com/swiper/1.png"},
			{url:"https://unitone-1310134019.cos.ap-guangzhou.myqcloud.com/swiper/2.png"},
			{url:"https://unitone-1310134019.cos.ap-guangzhou.myqcloud.com/swiper/3.png"},
		]
		},
	},
	data() {
		return {
			// currentIndex: 0
		}
	},
	methods: {
		// 点击轮播图项
		onItemClick(item, index) {
			this.$emit('itemClick', {
				item,
				index
			})
		}
	}
}
</script>

<style scoped>
	.banner {
		padding-top: 10rpx;
		/* 左右与下方卡片保持一致的 24rpx 边距 */
		padding-left: 24rpx;
		padding-right: 24rpx;
		width: 100%;
		box-sizing: border-box;
		/* height: 280rpx; */
		/* 轮播图四角圆角，并裁切内部图片 */
		border-radius: 24rpx;
		overflow: hidden;
	}
	/* swiper / swiper-item 同步圆角，避免 H5 与小程序下图片溢出直角 */
	.banner swiper,
	.banner swiper-item {
		border-radius: 24rpx;
		overflow: hidden;
	}
	.banner image {
		width: 100%;
		height: 100%;
		border-radius: 24rpx;
	}	

</style> 