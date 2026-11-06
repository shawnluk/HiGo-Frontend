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
					<view
						class="hcIconBox"
						:class="{ hcIconBoxActive: item.isActive }"
						:style="{
							background: item.isActive ? '#e8453c' : item.iconBg,
							borderColor: item.isActive ? 'rgba(232, 69, 60, 0.55)' : 'rgba(0, 0, 0, 0.06)'
						}"
					>
						<!-- 旧图标：直接使用后端返回的 icon（暂时保留不删除）
						<image class="hcIcon" :src="item.icon" mode="aspectFit" />
						-->
						<!-- 新图标：默认显示分类色，点击选中后显示白色 -->
						<image class="hcIcon" :src="item.isActive ? item.activeIcon : item.icon" mode="aspectFit" />
						<view v-if="item.badge" class="hcBadge" />
					</view>
					<text class="hcText" :class="{ hcTextActive: item.isActive }">{{ item.name }}</text>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { fetchCategories } from '@/api/modules/category.js'
import { CATEGORY_VISUALS, CATEGORY_KEY_BY_ID } from '@/constants/category-visuals.js'

function normalizeCategory(item) {
	if (!item || typeof item !== 'object') return null
	const categoryId = item.category_id || item.id
	const categoryKey = item.category_key || CATEGORY_KEY_BY_ID[categoryId] || ''
	const visual = CATEGORY_VISUALS[categoryKey]
	// 后端返回的原始图标，仅在本地未配置对应分类时兜底使用
	const fallbackIcon = item.icon || item.icon_url || ''
	return {
		category_id: categoryId,
		category_key: item.category_key || '',
		name: item.category_name || item.text || item.name || '',
		// 旧图标逻辑（直接使用后端 icon），暂时保留不删除
		// icon: fallbackIcon,
		// 新图标：默认分类色，选中态为白色版本
		icon: visual ? visual.icon : fallbackIcon,
		activeIcon: visual ? visual.activeIcon : fallbackIcon,
		// 图标容器背景：与图标同色系的浅色
		iconBg: visual ? visual.bg : '#f5f5f7',
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

/* 旧分类图标与文字样式（暂时保留不删除）
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
*/

/* ===== 新分类图标样式：图标色与背景色由分类配置驱动 ===== */
.hcIconBox {
	position: relative;
	width: 100rpx;
	height: 64rpx;
	border-radius: 22rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	border: 1rpx solid rgba(0, 0, 0, 0.06);
	box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
	transition: background-color 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

/* 选中态：背景主题红，图标切换为白色 */
.hcIconBoxActive {
	box-shadow: 0 6rpx 16rpx rgba(232, 69, 60, 0.18);
}

.hcIcon {
	width: 48rpx;
	height: 48rpx;
}

/* 分类文字统一灰色，选中后变黑 */
.hcText {
	margin-top: 6rpx;
	font-size: 24rpx;
	line-height: 1.2;
	font-weight: 500;
	color: #999999;
	text-align: center;
	max-width: 112rpx;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.hcTextActive {
	font-weight: 600;
	color: #1f1f1f;
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
