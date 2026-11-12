<template>
	<view v-if="visible" class="loginModalMask" @tap.stop>
		<view class="loginModalCard" @tap.stop>
			<text v-if="title" class="loginModalTitle">{{ title }}</text>
			<text v-if="content" class="loginModalDesc">{{ content }}</text>
			<view class="loginModalActions">
				<view
					v-if="showCancel"
					class="loginModalBtn loginModalBtnGhost"
					hover-class="loginModalBtnPressed"
					hover-stay-time="120"
					@tap="onCancel"
				>{{ cancelText }}</view>
				<view
					class="loginModalBtn loginModalBtnPrimary"
					hover-class="loginModalBtnPressed"
					hover-stay-time="120"
					@tap="onConfirm"
				>{{ confirmText }}</view>
			</view>
		</view>
	</view>
</template>

<script>
/**
 * 登录提示弹窗：统一复用「退出登录」弹窗的白底圆角卡片样式。
 * @prop {boolean} visible 是否显示
 * @prop {string} title 标题
 * @prop {string} content 说明文案
 * @prop {string} confirmText 主按钮文案
 * @prop {string} cancelText 次按钮文案
 * @prop {boolean} showCancel 是否显示次按钮
 * @prop {string} loginMode 主按钮跳转方式：navigateTo / redirectTo / none
 * @event update:visible 显隐状态变更
 * @event confirm 点击主按钮（跳转已由组件处理）
 * @event cancel 点击次按钮，供调用方追加逻辑
 */
export default {
	name: 'LoginModal',
	props: {
		visible: {
			type: Boolean,
			default: false,
		},
		title: {
			type: String,
			default: '提示',
		},
		content: {
			type: String,
			default: '',
		},
		confirmText: {
			type: String,
			default: '去登录',
		},
		cancelText: {
			type: String,
			default: '取消',
		},
		showCancel: {
			type: Boolean,
			default: true,
		},
		loginMode: {
			type: String,
			default: 'navigateTo',
		},
	},
	emits: ['update:visible', 'confirm', 'cancel'],
	methods: {
		/** 关闭弹窗 */
		close() {
			this.$emit('update:visible', false)
		},
		/** 主按钮：关闭后按配置跳转登录页 */
		onConfirm() {
			this.close()
			this.$emit('confirm')
			if (this.loginMode === 'navigateTo') {
				uni.navigateTo({ url: '/src/login/login' })
			} else if (this.loginMode === 'redirectTo') {
				uni.redirectTo({ url: '/src/login/login' })
			}
		},
		/** 次按钮：关闭并交由调用方处理额外逻辑 */
		onCancel() {
			this.close()
			this.$emit('cancel')
		},
	},
}
</script>

<style scoped>
.loginModalMask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1300;
	/* 弹窗可能挂在 pointer-events: none 的容器内（如自定义底栏），需显式恢复可交互 */
	pointer-events: auto;
	background: rgba(17, 17, 17, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 60rpx;
	box-sizing: border-box;
}

.loginModalCard {
	width: 100%;
	max-width: 560rpx;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 44rpx 40rpx 32rpx;
	box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.18);
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	animation: loginModalIn 0.18s ease-out;
}

.loginModalTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
	line-height: 48rpx;
}

.loginModalDesc {
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #999999;
	text-align: center;
}

.loginModalActions {
	margin-top: 36rpx;
	width: 100%;
	display: flex;
	gap: 20rpx;
}

.loginModalBtn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 24rpx;
	font-size: 30rpx;
	font-weight: 600;
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.loginModalBtnGhost {
	background: #f3f3f5;
	color: #666666;
}

.loginModalBtnPrimary {
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.28);
}

.loginModalBtnPressed {
	transform: scale(0.97);
	opacity: 0.82;
}

@keyframes loginModalIn {
	from {
		opacity: 0;
		transform: scale(0.92);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
