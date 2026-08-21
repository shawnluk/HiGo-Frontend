<template>
	<view class="hcWrap">
		<scroll-view scroll-x class="hcScroll" :show-scrollbar="false">
			<view class="hcRow">
				<view
					v-for="(item, idx) in items"
					:key="idx"
					class="hcItem"
					:class="{ hcItemActive: item.isActive }"
					@click="handleSelect(item, idx)"
				>
					<view class="hcIconBox">
						<image class="hcIcon" :src="item.icon" mode="aspectFit" />
						<view v-if="item.badge" class="hcBadge" />
					</view>
					<text class="hcText">{{ item.name }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { fetchCategories } from '@/api/modules/category.js'

function normalizeCategory(item) {
	if (!item || typeof item !== 'object') return null
	return {
		category_id: item.category_id || item.id,
		category_key: item.category_key || '',
		name: item.category_name || item.text || item.name || '',
		icon: item.icon || item.icon_url || '',
		badge: Boolean(item.badge),
		isActive: false,
	}
}

export default {
	name: 'HomeCategoryBar',
	data() {
		return {
			items: [],
		}
	},
	/** 页面创建：加载分类数据 */
	async created() {
		await this.loadCategories()
	},
	methods: {
		/** 拉取分类列表并映射为展示项 */
		async loadCategories() {
			try {
				const list = await fetchCategories()
				// console.log(list);
				
				if (Array.isArray(list) && list.length) {
					const mapped = list.map(normalizeCategory).filter(Boolean)
					if (mapped.length) {
						this.items = mapped
						// console.log('[HiGo] 分类列表 items =>', this.items);					
					}
				}
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '分类加载失败',
					icon: 'none',
				})
			}
		},
		/** 选择分类：切换选中态并通过事件广播分类变化 */
		handleSelect(_, idx) {
			const nextItems = this.items.map((item, itemIdx) => ({
				...item,
				isActive: itemIdx === idx ? !item.isActive : false,
			}))
			this.items = nextItems
			const selectedItem = nextItems[idx]
			const category_id = selectedItem && selectedItem.isActive ? selectedItem.category_id : null
			if (uni && typeof uni.$emit === 'function') {
				uni.$emit('index:category-change', { category_id })
			}
		},
	},
}
</script>

<style scoped>
.hcWrap {
	padding: 12rpx 24rpx 18rpx;
	background: transparent;
}

.hcScroll {
	white-space: nowrap;
}

.hcRow {
	display: flex;
	align-items: flex-start;
	gap: 16rpx;
	padding-right: 8rpx;
}

.hcItem {
	display: flex;
	flex-direction: column;
	align-items: center;
	width: 124rpx;
	flex-shrink: 0;
	padding: 8rpx 6rpx 8rpx;
	border-radius: 24rpx;
	background: #ffffff;
	border: 2rpx solid rgba(0, 0, 0, 0.04);
	box-shadow: 0 6rpx 16rpx rgba(0, 0, 0, 0.04);
	transition: background 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.hcItemActive {
	background: #fff5f4;
	border-color: rgba(232, 69, 60, 0.5);
	box-shadow: 0 8rpx 22rpx rgba(232, 69, 60, 0.16);
}

.hcIconBox {
	position: relative;
	width: 100rpx;
	height: 64rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: #f5f5f7;
	border: 1rpx solid rgba(0, 0, 0, 0.06);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.hcItemActive .hcIconBox {
	background: #ffffff;
	border-color: rgba(232, 69, 60, 0.35);
	box-shadow: 0 6rpx 16rpx rgba(232, 69, 60, 0.14);
}

.hcIcon {
	width: 48rpx;
	height: 48rpx;
}

.hcText {
	margin-top: 6rpx;
	font-size: 24rpx;
	line-height: 1.2;
	font-weight: 500;
	color: #1f1f1f;
	text-align: center;
	max-width: 112rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hcItemActive .hcText {
	font-weight: 600;
	color: #e8453c;
}

.hcBadge {
	position: absolute;
	top: 8rpx;
	right: 10rpx;
	width: 14rpx;
	height: 14rpx;
	border-radius: 50%;
	background: linear-gradient(135deg, #ff5fb3 0%, #ff3b6e 100%);
	border: 2rpx solid #fff;
	box-shadow: 0 4rpx 10rpx rgba(255, 95, 179, 0.45);
}
</style>
