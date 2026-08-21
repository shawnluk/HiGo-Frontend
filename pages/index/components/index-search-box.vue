<template>
	<view class="searchBox">
		<!-- <image class="searchIcon" src="/static/search.png" mode="aspectFit" /> -->
		<input
			:value="innerKeyword"
			class="searchInput"
			placeholder="搜索活动、地点或感兴趣的主题"
			placeholder-class="searchPlaceholder"
			confirm-type="search"
			@input="handleSearchInput"
			@confirm="handleSearchConfirm"
		/>
		<view class="filterEntry" @click="handleFilter">
			<text class="filterIcon">▾</text>
			<text class="filterText">筛选</text>
		</view>
	</view>
</template>

<script>
export default {
	name: 'IndexSearchBox',
	props: {
		initialKeyword: {
			type: String,
			default: '',
		},
	},
	data() {
		return {
			innerKeyword: this.initialKeyword,
		}
	},
	methods: {
		/** 搜索关键字输入：同步内部值 */
		handleSearchInput(e) {
			const value = (e && e.detail && e.detail.value) || ''
			this.innerKeyword = value
		},
		/** 确认搜索：校验并向外发送搜索事件 */
		handleSearchConfirm() {
			const keyword = (this.innerKeyword || '').trim()
			if (!keyword) return
			this.innerKeyword = keyword
			this.$emit('search', { keyword })
		},
		/** 点击筛选 */
		handleFilter() {
			this.$emit('filter')
		},
	},
}
</script>

<style scoped>
.searchBox {
	display: flex;
	align-items: center;
	height: 80rpx;
	padding: 0 22rpx;
	border-radius: 999rpx;
	background: #f5f5f5;
	border: 1rpx solid rgba(0, 0, 0, 0.04);
}

.searchIcon {
	width: 32rpx;
	height: 32rpx;
	margin-right: 14rpx;
	flex-shrink: 0;
}

.searchInput {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	font-size: 28rpx;
	color: #111111;
}

.searchPlaceholder {
	color: #999999;
}

.filterEntry {
	display: flex;
	align-items: center;
	flex-shrink: 0;
	padding-left: 16rpx;
	border-left: 1rpx solid rgba(0, 0, 0, 0.08);
}

.filterIcon {
	margin-right: 6rpx;
	font-size: 26rpx;
	color: #e8453c;
}

.filterText {
	font-size: 26rpx;
	font-weight: 600;
	color: #e8453c;
}
</style>