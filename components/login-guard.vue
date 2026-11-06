<template>
	<LoginModal
		:visible="visible"
		:title="modalOptions.title"
		:content="modalOptions.content"
		:confirm-text="modalOptions.confirmText"
		:cancel-text="modalOptions.cancelText"
		:show-cancel="modalOptions.showCancel"
		:login-mode="modalOptions.loginMode"
		@update:visible="onVisibleChange"
		@confirm="$emit('confirm')"
		@cancel="$emit('cancel')"
	/>
</template>

<script>
import LoginModal from '@/components/login-modal.vue'
import { isTokenExpired } from '@/utils/token.js'

/**
 * 登录拦截组件：统一封装登录态校验与登录提示弹窗。
 *
 * 使用方式：
 *   <LoginGuard ref="loginGuard" />
 *   if (!this.$refs.loginGuard.ensureLogin({ content: '登录后即可报名活动' })) return
 *
 * 支持按调用场景覆盖标题、文案、按钮、取消按钮显隐与登录页跳转方式；
 * token 过期时会自动清理本地登录缓存，并提示重新登录。
 */
export default {
	name: 'LoginGuard',
	components: { LoginModal },
	props: {
		title: {
			type: String,
			default: '需要登录',
		},
		content: {
			type: String,
			default: '该操作需要登录，是否前往登录？',
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
	data() {
		return {
			visible: false,
			activeOptions: null,
		}
	},
	computed: {
		/** 当前弹窗配置：调用时传入的参数优先于组件 props */
		modalOptions() {
			const base = {
				title: this.title,
				content: this.content,
				confirmText: this.confirmText,
				cancelText: this.cancelText,
				showCancel: this.showCancel,
				loginMode: this.loginMode,
			}
			return Object.assign(base, this.activeOptions || {})
		},
	},
	methods: {
		/** 读取本地 token */
		getToken() {
			try {
				return uni.getStorageSync('token') || ''
			} catch (_) {
				return ''
			}
		},
		/** 清理本地登录缓存 */
		clearLoginCache() {
			try {
				uni.removeStorageSync('token')
				uni.removeStorageSync('userId')
				uni.removeStorageSync('username')
				uni.removeStorageSync('userInfo')
				uni.removeStorageSync('squads')
			} catch (_) {}
		},
		/** 当前是否处于有效登录态（token 存在且未过期） */
		isLoggedIn() {
			const token = this.getToken()
			return Boolean(token) && !isTokenExpired(token)
		},
		/**
		 * 需要登录的操作统一入口。
		 * @param {Object} [options] 覆盖弹窗默认配置（title/content/confirmText/cancelText/showCancel/loginMode）
		 * @returns {boolean} 已登录返回 true；未登录会弹出登录提示并返回 false
		 */
		ensureLogin(options = {}) {
			const token = this.getToken()
			if (token && !isTokenExpired(token)) return true
			if (token) {
				// token 已过期：清理缓存并提示重新登录
				this.clearLoginCache()
				this.open(
					Object.assign(
						{
							title: '请重新登录',
							content: '登录已过期，请重新登录后再操作',
							showCancel: false,
							loginMode: 'navigateTo',
						},
						options
					)
				)
				return false
			}
			this.open(options)
			return false
		},
		/** 打开登录提示弹窗（用于非登录拦截场景，如 token 过期提示） */
		open(options = {}) {
			this.activeOptions = { ...options }
			this.visible = true
		},
		/** 关闭登录提示弹窗 */
		close() {
			this.visible = false
		},
		/** 同步弹窗显隐 */
		onVisibleChange(visible) {
			this.visible = visible
		},
	},
}
</script>
