<template>
	<view class="pageScaffold">
		<TopBar v-if="showTopBar" />
		<!-- 内容区保留至少一屏高度，保证底栏在内容不足一屏时也贴在最底部 -->
		<view class="pageBody">
			<slot />
		</view>
		<BottomTabBar v-show="showBottomTabBar" :current="tabIndex" />
	</view>
</template>

<script>
import TopBar from '@/components/top-bar.vue'
import BottomTabBar from '@/components/bottom-tab-bar.vue'

/**
 * 主 Tab 页统一骨架：顶栏 + 主内容 slot + 自定义底栏。
 * @prop {number} tabIndex 当前 Tab 下标 0~3，与 bottom-tab-bar 一致
 * @prop {boolean} showTopBar 是否显示顶图
 * @prop {boolean} showBottomTabBar 是否显示底栏（如裁剪全屏时可 false）
 */
export default {
	name: 'PageScaffold',
	components: { TopBar, BottomTabBar },
	props: {
		tabIndex: {
			type: Number,
			default: 0,
		},
		showTopBar: {
			type: Boolean,
			default: false,
		},
		showBottomTabBar: {
			type: Boolean,
			default: true,
		},
	},
}
</script>

<style scoped>
.pageScaffold {
	min-height: 100vh;
}

.pageBody {
	/* 预留底栏自身高度（120rpx 胶囊 + 10rpx 间隙），内容较短时底栏仍在屏幕底部 */
	min-height: calc(100vh - 50rpx);
}
</style>
