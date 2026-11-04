<template>
	<view class="squadSection">
		<view class="squadHeader">
			<text class="squadTitle">{{ title }}</text>
		</view>
		<scroll-view class="squadScroll" scroll-x :show-scrollbar="false">
			<view class="squadRow">
				<view
					v-for="(it, i) in items"
					:key="it.id || i"
					class="squadAvatarItem"
					hover-class="squadAvatarItem--hover"
					hover-stay-time="120"
					@tap="goSquadDetail(it)"
				>
					<image v-if="it.cover" class="squadAvatar" :src="it.cover" mode="aspectFill" />
					<view v-else class="squadAvatar squadAvatar--empty"></view>
				</view>
			</view>
		</scroll-view>
	</view>
</template>

<script>
import { MOCK_USER_SQUAD_PANEL, MOCK_USER_SQUAD_EMPTY_ITEM } from '@/mock/user-display.js'

export default {
	name: 'UserSquadPanel',
	props: {
		title: {
			type: String,
			default: MOCK_USER_SQUAD_PANEL.title,
		},
		items: {
			type: Array,
			default: () => [{ ...MOCK_USER_SQUAD_EMPTY_ITEM }],
		},
	},
	methods: {
		/** 跳转小队详情页 */
		goSquadDetail(item) {
			const id = item && item.id ? item.id : ''
			if (id === '') {
				uni.showToast({ title: '请先创建小队', icon: 'none' })
				return
			}
			const q = `?squadId=${encodeURIComponent(id)}`
			uni.navigateTo({
				url: `/pages/user/components/squad-detail${q}`,
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' })
				},
			})
		},
	},
}
</script>

<style scoped>
/* 与参考图「我的圈子」一致：标题 + 横向头像列表，不再使用白色卡片 */
.squadSection {
	margin-top: 36rpx;
}

.squadHeader {
	display: flex;
	align-items: center;
	margin-bottom: 22rpx;
}

.squadTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	letter-spacing: 0.2rpx;
}

.squadScroll {
	width: 100%;
	white-space: nowrap;
}

.squadRow {
	display: inline-flex;
	align-items: center;
}

.squadAvatarItem {
	display: inline-flex;
	flex-shrink: 0;
	margin-right: 22rpx;
	transition: transform 0.15s ease;
}

.squadAvatarItem--hover {
	transform: scale(0.96);
}

.squadAvatar {
	width: 140rpx;
	height: 140rpx;
	border-radius: 28rpx;
	overflow: hidden;
	background: #ededed;
	box-shadow: 0 10rpx 22rpx rgba(0, 0, 0, 0.08);
}

.squadAvatar--empty {
	background: #ededed;
}
</style>
