<template>
	<view class="squadSection">
		<view class="squadHeader" :class="{ 'squadHeader--empty': !items.length }">
			<view class="squadTitleWrap">
				<view class="squadTitleMark"></view>
				<text class="squadTitle">{{ title }}</text>
			</view>
			<view
				class="squadCreate"
				hover-class="squadCreate--hover"
				hover-stay-time="120"
				@tap="goCreateSquad"
			>
				<uni-icons type="plusempty" size="13" color="#ff3b30" />
				<text class="squadCreateText">创建新小队</text>
			</view>
		</view>
		<scroll-view v-if="items.length" class="squadScroll" scroll-x :show-scrollbar="false">
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
		<!-- 登录拦截组件：创建小队 / 查看小队详情前统一校验登录态 -->
		<LoginGuard ref="loginGuard" content="登录后即可管理小队" />
	</view>
</template>

<script>
import { MOCK_USER_SQUAD_PANEL, MOCK_USER_SQUAD_EMPTY_ITEM } from '@/mock/user-display.js'
import LoginGuard from '@/components/login-guard.vue'

export default {
	name: 'UserSquadPanel',
	components: { LoginGuard },
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
		/** 跳转创建小队页面 */
		goCreateSquad() {
			if (!this.$refs.loginGuard.ensureLogin({ content: '登录后即可创建小队' })) return
			uni.navigateTo({
				url: '/src/create-unit/create-unit',
				fail: () => {
					uni.showToast({ title: '页面打开失败', icon: 'none' })
				},
			})
		},
		/** 跳转小队详情页 */
		goSquadDetail(item) {
			if (!this.$refs.loginGuard.ensureLogin({ content: '登录后即可查看小队详情' })) return
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
	justify-content: space-between;
	margin-bottom: 22rpx;
}

/* 无小队时不渲染列表，同时去掉头部下方留白 */
.squadHeader--empty {
	margin-bottom: 0;
}

/* 标题左侧红色竖条，增强区块识别度 */
.squadTitleWrap {
	display: flex;
	align-items: center;
	gap: 14rpx;
}

.squadTitleMark {
	width: 8rpx;
	height: 32rpx;
	border-radius: 999rpx;
	background: linear-gradient(180deg, #ff6b5e 0%, #ff3b30 100%);
	box-shadow: 0 4rpx 10rpx rgba(255, 59, 48, 0.26);
}

.squadTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	letter-spacing: 0.2rpx;
}

/* 右侧「创建小队」胶囊按钮：浅红底 + 细边框 */
.squadCreate {
	display: flex;
	align-items: center;
	gap: 6rpx;
	padding: 10rpx 22rpx;
	border-radius: 999rpx;
	background: rgba(255, 59, 48, 0.08);
	border: 1rpx solid rgba(255, 59, 48, 0.2);
	transition: transform 0.15s ease, background 0.15s ease;
}

.squadCreate--hover {
	background: rgba(255, 59, 48, 0.16);
	transform: scale(0.96);
}

.squadCreateText {
	font-size: 24rpx;
	font-weight: 600;
	color: #ff3b30;
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
