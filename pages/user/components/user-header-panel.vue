<template>
	<view class="profileCard">
		<view class="profileInner">
			<view class="profileHeader">
				<view class="userInfo">
					<image
						class="avatar"
						:src="avatarUrl"
						mode="aspectFill"
						@click="$emit('avatar-click')"
					/>
					<view class="userDetails">
						<view
							class="username"
							:class="{ guest: !isLoggedIn }"
							@click="$emit('username-click')"
						>{{ displayName }}</view>
						<view v-if="partnerId" class="userId">趣玩号：{{ partnerId }} <text class="idTag">{{ partnerIdTag }}</text></view>
					</view>
				</view>
			</view>

			<view class="memberStrip">
				<!-- 原「成为会员」入口，暂时隐藏，后续可能复用
				<view class="memberText">
					<text class="memberTitle">{{ memberTitle }}</text>
					<text class="memberDesc">{{ memberDesc }}</text>
				</view>
				<text class="memberLink">{{ memberLink }}</text>
				-->
				<view class="memberStats">
					<view class="memberStat" v-for="item in stats" :key="item.label">
						<text class="memberStatValue">{{ item.value }}</text>
						<text class="memberStatLabel">{{ item.label }}</text>
					</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { MOCK_USER_FOLLOW_STATS, MOCK_USER_HEADER } from '@/mock/user-display.js'

export default {
	name: 'UserHeaderPanel',
	props: {
		avatarUrl: {
			type: String,
			required: true,
		},
		displayName: {
			type: String,
			required: true,
		},
		isLoggedIn: {
			type: Boolean,
			default: false,
		},
		partnerId: {
			type: String,
			default: '',
		},
		partnerIdTag: {
			type: String,
			default: '',
		},
		badges: {
			type: Array,
			default: () => [],
		},
		// 关注 / 粉丝 / 获赞 / 场活动 统计
		stats: {
			type: Array,
			default: () => MOCK_USER_FOLLOW_STATS.map((row) => ({ ...row })),
		},
		// 原「成为会员」文案与入口，模板中暂时注释保留，后续可能复用
		memberTitle: {
			type: String,
			default: MOCK_USER_HEADER.memberTitle,
		},
		memberDesc: {
			type: String,
			default: MOCK_USER_HEADER.memberDesc,
		},
		memberLink: {
			type: String,
			default: MOCK_USER_HEADER.memberLink,
		},
	},
}
</script>

<style scoped>
/* 个人主页头部：设计稿红色渐变主视觉，铺满左右与顶部，仅下方两角圆角 */
.profileCard {
	position: relative;
	overflow: hidden;
	background: linear-gradient(150deg, #ff5c4d 0%, #ff3b30 55%, #f52a24 100%);
	border-radius: 0 0 32rpx 32rpx;
	box-shadow: 0 12rpx 30rpx rgba(255, 59, 48, 0.2);
}

.profileCard::before {
	content: '';
	position: absolute;
	top: -60rpx;
	right: -40rpx;
	width: 180rpx;
	height: 180rpx;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(255, 255, 255, 0.28) 0%, rgba(255, 255, 255, 0) 70%);
	pointer-events: none;
}

.profileInner {
	position: relative;
	z-index: 1;
}

.profileHeader {
	/* 顶部铺满后留出更充裕的上内边距 */
	padding: 48rpx 22rpx 20rpx;
}

.userInfo {
	display: flex;
	align-items: center;
	gap: 22rpx;
}

.avatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	border: 4rpx solid rgba(255, 255, 255, 0.95);
	box-shadow: 0 14rpx 28rpx rgba(150, 20, 15, 0.28);
	overflow: hidden;
	background: #ffffff;
}

.userDetails {
	flex: 1;
	min-width: 0;
}

.username {
	font-size: 36rpx;
	font-weight: 700;
	color: #ffffff;
	margin-bottom: 8rpx;
	letter-spacing: 0.2rpx;
}

.username.guest {
	text-decoration: underline;
	text-underline-offset: 6rpx;
	color: rgba(255, 255, 255, 0.92);
}

.userId {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.82);
	margin-bottom: 12rpx;
}

.idTag {
	font-size: 20rpx;
}

.memberStrip {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 20rpx;
	padding: 20rpx 22rpx 22rpx;
	margin: 0 6rpx 8rpx;
	border-radius: 24rpx;
	background: rgba(255, 255, 255, 0.16);
	border: 1rpx solid rgba(255, 255, 255, 0.3);
	box-shadow: 0 8rpx 20rpx rgba(150, 20, 15, 0.16);
}

/* 关注 / 粉丝 / 获赞 / 场活动：横向居中均分 */
.memberStats {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: space-around;
}

.memberStat {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 8rpx;
	min-width: 0;
}

.memberStatValue {
	font-size: 34rpx;
	font-weight: 700;
	line-height: 1.1;
	color: #ffffff;
}

.memberStatLabel {
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.82);
}

/* 以下为原「成为会员」条样式，模板已注释，保留备用 */
.memberText {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 8rpx;
}

.memberTitle {
	font-size: 30rpx;
	font-weight: 700;
	color: #ffffff;
}

.memberDesc {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.86);
	line-height: 1.45;
}

.memberLink {
	flex-shrink: 0;
	font-size: 24rpx;
	font-weight: 700;
	color: #ffffff;
}
</style>
