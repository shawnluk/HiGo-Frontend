<template>
	<view>
		<PageScaffold :tab-index="4" :show-bottom-tab-bar="!showCropper">
			<view class="userList">
				<!-- 顶部区域 + 快捷入口合成一组，二者无间隙相接 -->
				<view class="userTop">
					<UserHeaderPanel
						:avatar-url="avatarUrl"
						:display-name="displayName"
						:is-logged-in="isLoggedIn"
						:partner-id="header.partnerId"
						:partner-id-tag="header.partnerIdTag"
						:badges="header.badges"
						:member-title="header.memberTitle"
						:member-desc="header.memberDesc"
						:member-link="header.memberLink"
						@avatar-click="handleCrop"
						@username-click="onUsernameClick"
						@settings-click="goProfilePage"
					/>
					<!-- <UserStatsPanel
						:stats="statsItems"
						:star-value="starValue"
					/> -->
					<UserQuickEntryPanel />
				</view>
				<!-- <UserDataPanel :items="dataItems" /> -->
				<!-- <UserServiceEntryPanel /> -->
				<UserSquadPanel :items="squadItems" />
				<UserListCard :items="contentList" />
				<UserListCard :items="accountList" />
				<view v-if="isLoggedIn" class="logoutCard" @tap="handleLogout">
					<text class="logoutText">退出登录</text>
				</view>
				<view v-else class="logoutCard" @tap="goLoginPage">
					<text class="logoutText">去登录</text>
				</view>
			</view>
		</PageScaffold>

		<!-- 登录拦截弹窗：统一处理未登录 / 登录过期提示 -->
		<LoginGuard ref="loginGuard" />

		<!-- 退出登录确认弹窗（自定义样式，替代默认 showModal） -->
		<view v-if="showLogoutModal" class="logoutModalMask" @tap="cancelLogout">
			<view class="logoutModalCard" @tap.stop>
				<text class="logoutModalTitle">退出登录</text>
				<text class="logoutModalDesc">确定要退出当前账号吗？</text>
				<view class="logoutModalActions">
					<view
						class="logoutModalBtn logoutModalBtnGhost"
						hover-class="logoutModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelLogout"
					>取消</view>
					<view
						class="logoutModalBtn logoutModalBtnPrimary"
						hover-class="logoutModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmLogout"
					>退出</view>
				</view>
			</view>
		</view>

		<QfImageCropper
			v-if="showCropper"
			ref="cropper"
			:src="cropperImg"
			:width="300"
			:height="300"
			:radius="150"
			:z-index="9999"
			fileType="png"
			@crop="onCropperCrop"
		>
			<view class="cropCancel" @click="cancelCrop">取消</view>
		</QfImageCropper>
	</view>
</template>

<script>
import PageScaffold from '@/components/page-scaffold.vue'
import UserHeaderPanel from './components/user-header-panel.vue'
// import UserStatsPanel from './components/user-stats-panel.vue'
import UserQuickEntryPanel from './components/user-quick-entry-panel.vue'
// import UserServiceEntryPanel from './components/user-service-entry-panel.vue'
// import UserDataPanel from './components/user-data-panel.vue'
import UserSquadPanel from './components/user-squad-panel.vue'
import UserListCard from './components/user-list-card.vue'
// 发布按钮已迁移到 tabbar 中，保留组件文件以备后续使用
// import UserPublishButton from './components/user-publish-button.vue'
import QfImageCropper from '@/uni_modules/qf-image-cropper/components/qf-image-cropper/qf-image-cropper.vue'
import {
	MOCK_USER_DEFAULT_AVATAR,
	MOCK_USER_DISPLAY_NAME_GUEST,
	MOCK_USER_DISPLAY_NAME_LOGGED_IN,
	MOCK_USER_HEADER,
	MOCK_USER_DATA_ITEMS,
	MOCK_USER_CONTENT_LIST,
	MOCK_USER_ACCOUNT_LIST,
} from '@/mock/user-display.js'
import {
	fetchUserSquadPanel,
	updateProfile,
} from '@/api/modules/user.js'
import { isAuthError } from '@/api/http.js'
import { uploadAvatar } from '@/utils/cos-upload.js'
import { isTokenExpired } from '@/utils/token.js'
import { pickSingleImage } from '@/utils/image-picker.js'
import LoginGuard from '@/components/login-guard.vue'

export default {
	components: {
		PageScaffold,
		UserHeaderPanel,
		// UserStatsPanel,
		UserQuickEntryPanel,
		// UserServiceEntryPanel,
		// UserDataPanel,
		UserSquadPanel,
		UserListCard,
		QfImageCropper,
		LoginGuard,
	},
	data() {
		return {
			avatarUrl: MOCK_USER_DEFAULT_AVATAR,
			displayNameGuest: MOCK_USER_DISPLAY_NAME_GUEST,
			displayNameLoggedIn: MOCK_USER_DISPLAY_NAME_LOGGED_IN,
			header: { ...MOCK_USER_HEADER },
			dataItems: MOCK_USER_DATA_ITEMS.map((row) => ({ ...row })),
			contentList: MOCK_USER_CONTENT_LIST.map((row) => ({ ...row })),
			accountList: MOCK_USER_ACCOUNT_LIST.map((row) => ({ ...row })),
			squadItems: [],
			showCropper: false,
			showLogoutModal: false,
			cropperImg: '',
			cropCanceled: false,
			isLoggedIn: false,
			userId: '',
			user_no: '',
			squads: [],
		};
	},

	computed: {
		displayName() {
			return this.isLoggedIn
				? this.displayNameLoggedIn
				: this.displayNameGuest
		},
	},

	/** 页面加载：仅读取页面参数，登录态校验与数据加载统一放到 onShow */
	onLoad(options) {
		if (options && options.user_id) {
			this.userId = options.user_id
		}
	},

	/**
	 * 每次进入 / 返回页面：先校验 token 是否过期，再同步本地缓存并刷新小队数据。
	 * 覆盖「页面停留期间 token 过期」「从其他页返回时已过期」「资料页改过昵称/头像」等场景。
	 */
	onShow() {
		if (this.checkTokenExpired()) return
		this.loadLocalUser()
		this.loadUserData()
	},

	methods: {
		/** 校验 token 是否过期，过期则清理登录态并引导重新登录 */
		checkTokenExpired() {
			let token = ''
			try {
				token = uni.getStorageSync('token') || ''
			} catch (_) {}
			if (!token) return false
			if (!isTokenExpired(token)) return false
			this.clearLoginCache()
			this.loadLocalUser()
			// 统一复用 LoginGuard 弹窗，保持登录提示样式一致
			this.$nextTick(() => {
				if (!this.$refs.loginGuard) return
				this.$refs.loginGuard.open({
					title: '请重新登录',
					content: '登录已过期，请重新登录后再操作',
					confirmText: '去登录',
					showCancel: false,
					loginMode: 'navigateTo',
				})
			})
			return true
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
		loadLocalUser() {
			let token = ''
			let userId = ''
			let username = ''
			let userInfo = null
			let squads = []
			try {
				token = uni.getStorageSync('token') || ''
				userId = uni.getStorageSync('userId')
				username = uni.getStorageSync('username')
				userInfo = uni.getStorageSync('userInfo')
				squads = uni.getStorageSync('squads') || []
			} catch (_) {}

			// 登录态以 token 为准：token 缺失或已过期（未登录 / 已退出 / 过期未清理）时一律按未登录处理，
			// 避免残留的 userId、userInfo 缓存造成误判
			if (!token || isTokenExpired(token) || (!userId && !userInfo)) {
				this.isLoggedIn = false
				this.userId = ''
				this.user_no = ''
				this.squads = []
				this.squadItems = []
				this.avatarUrl = MOCK_USER_DEFAULT_AVATAR
				this.header = { ...MOCK_USER_HEADER }
				return
			}

			this.squads = squads
			this.userId = userId !== undefined && userId !== '' ? userId : this.userId
			if (userInfo && userInfo.user_no !== undefined) {
				this.user_no = userInfo.user_no
			}
			this.isLoggedIn = true
			// 登录后：数据宫格「小队」数量 = 缓存 squads 条数
			const squadCount = Array.isArray(squads) ? squads.length : 0
			const dataItems = (this.dataItems || []).map((row) => ({ ...row }))
			const squadIdx = dataItems.findIndex((row) => row.label === '小队')
			if (squadIdx !== -1) dataItems[squadIdx].value = squadCount
			this.dataItems = dataItems
			if (this.userId) {
				this.header = { ...this.header, partnerId: String(this.user_no) }
			}
			if (userInfo) {
				this.avatarUrl = userInfo.avatar || this.avatarUrl
				this.displayNameLoggedIn =
					userInfo.nickname || userInfo.username || username || this.displayNameLoggedIn
			} else if (username) {
				this.displayNameLoggedIn = username
			}
		},
		/** 异步加载用户资料与小队列表数据 */
		async loadUserData() {
			// 未登录用户：使用 data 中的访客默认资料，小队区域不展示任何数据。
			// 注意不能请求 GET /api/v1/user/profile：该接口需要鉴权，访客调用会返回 401。
			if (!this.isLoggedIn) {
				this.squadItems = []
				return
			}

			try {
				const squadItems = await fetchUserSquadPanel()
				// 过滤接口返回的空占位项（id 为空）：新用户 / 无小队用户不渲染灰色占位块
				this.squadItems = (Array.isArray(squadItems) ? squadItems : []).filter(
					(item) => item && item.id !== ''
				)
			} catch (err) {
				// 登录态失效（token 过期 / 401）：接口层已清缓存并提示，这里同步切回访客态
				if (isAuthError(err)) {
					this.loadLocalUser()
					this.squadItems = []
				}
			}
		},

		/** 切换小队置顶状态：置顶时取消其他置顶并移到首位 */
		onTogglePin(item) {
			if (!item || item.id === '') return
			const list = this.squadItems.slice()
			const idx = list.findIndex((t) => String(t.id) === String(item.id))
			if (idx === -1) return
			const current = list[idx].pinned
			// 取消置顶
			list[idx] = { ...list[idx], pinned: false }
			// 若本次为置顶动作：先取消其他所有已置顶，再置顶该项并移到首位
			if (!current) {
				list.forEach((t, i) => {
					if (i !== idx && t.pinned) list[i] = { ...t, pinned: false }
				})
				const target = { ...list[idx], pinned: true }
				list.splice(idx, 1)
				list.unshift(target)
			}
			this.squadItems = list
		},

		/** 点击用户名：未登录时跳转登录页 */
		onUsernameClick() {
			if (this.isLoggedIn) return
			uni.navigateTo({
				url: '/src/login/login',
			})
		},

		/** 跳转登录页 */
		goLoginPage() {
			uni.navigateTo({
				url: '/src/login/login',
			})
		},

		/** 点击顶部设置按钮：未登录 / token 过期时走登录拦截，登录后进入个人资料页 */
		goProfilePage() {
			const guard = this.$refs.loginGuard
			if (!guard || !guard.ensureLogin({ content: '登录后即可查看和编辑个人资料' })) {
				// ensureLogin 可能已清理过期 token，同步一次页面登录态
				this.loadLocalUser()
				return
			}
			uni.navigateTo({
				url: '/src/user-profile/user-profile',
			})
		},

		/** 退出登录：打开自定义确认弹窗 */
		handleLogout() {
			this.showLogoutModal = true
		},

		/** 取消退出登录 */
		cancelLogout() {
			this.showLogoutModal = false
		},

		/** 确认退出登录：清理缓存并刷新页面 */
		confirmLogout() {
			this.showLogoutModal = false
			this.clearLoginCache()
			uni.redirectTo({
				url: '/pages/user/user',
			})
		},

		/** 打开头像裁剪组件并选择图片（需登录） */
		async handleCrop() {
			if (!this.isLoggedIn) {
				uni.navigateTo({
					url: '/src/login/login',
				})
				return
			}
			const path = await pickSingleImage()
			if (!path) return
			this.cropCanceled = false
			this.cropperImg = path
			this.showCropper = true
		},

		/** 取消裁剪并复位裁剪状态 */
		cancelCrop() {
			this.cropCanceled = true
			if (this.$refs.cropper && this.$refs.cropper.resetData) {
				this.$refs.cropper.resetData()
			}
			this.showCropper = false
			this.cropperImg = ''
		},

		/** 裁剪完成：关闭裁剪组件，上传裁剪图到 COS，再用返回的 URL 更新头像 */
		async onCropperCrop(e) {
			if (this.cropCanceled) return
			const tempFilePath = e && e.tempFilePath
			this.showCropper = false
			this.cropperImg = ''
			this.cropCanceled = false
			if (!tempFilePath) return

			uni.showLoading({ title: '上传中...', mask: true })
			try {
				const avatarUrl = await uploadAvatar(tempFilePath)
				await updateProfile({ avatar: avatarUrl })
				this.avatarUrl = avatarUrl
				this.persistAvatar(avatarUrl)
				uni.hideLoading()
				uni.showToast({ title: '头像已更新', icon: 'success' })
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && err.message) || '头像更新失败', icon: 'none' })
			}
		},

		/** 将新头像 URL 写回本地缓存，供其他页面（个人资料页等）读取 */
		persistAvatar(avatarUrl) {
			try {
				const userInfo = uni.getStorageSync('userInfo')
				if (userInfo && typeof userInfo === 'object') {
					userInfo.avatar = avatarUrl
					uni.setStorageSync('userInfo', userInfo)
				}
			} catch (_) {}
		}

		/** 发布活动已迁移到 tabbar（见 components/bottom-tab-bar.vue 的 onPublish） */
	},
}
</script>

<style>
/* 个人页底色 / 卡片配色对齐设计稿「我的」：浅灰底 + 白卡片 + 红色点缀 */
page {
	background-color: #f5f5f6;
}

/* 与首页 activityList 一致，底部多留一截给自定义底栏 */
.userList {
	display: flex;
	flex-direction: column;
	gap: 18rpx;
	padding: 10rpx 24rpx 24rpx;
	padding-bottom: calc(260rpx + env(safe-area-inset-bottom));
}

/* 顶部红色卡片与快捷入口之间不留间距，避免负 margin 造成圆角被遮挡；
   红色区域铺满左右与顶部，故反向抵消 .userList 的左右/上内边距 */
.userTop {
	display: flex;
	flex-direction: column;
	gap: 0;
	margin: -10rpx -24rpx 0;
}

.logoutCard {
	display: flex;
	align-items: center;
	justify-content: center;
	height: 100rpx;
	border-radius: 32rpx;
	background: #ffffff;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
}

.logoutText {
	font-size: 30rpx;
	font-weight: 600;
	color: #ff3b30;
	letter-spacing: 4rpx;
}

/* 退出登录确认弹窗 */
.logoutModalMask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	background: rgba(17, 17, 17, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 60rpx;
	box-sizing: border-box;
}

.logoutModalCard {
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
	animation: logoutModalIn 0.18s ease-out;
}

.logoutModalTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
	line-height: 48rpx;
}

.logoutModalDesc {
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #999999;
	text-align: center;
}

.logoutModalActions {
	margin-top: 36rpx;
	width: 100%;
	display: flex;
	gap: 20rpx;
}

.logoutModalBtn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 24rpx;
	font-size: 30rpx;
	font-weight: 600;
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.logoutModalBtnGhost {
	background: #f3f3f5;
	color: #666666;
}

.logoutModalBtnPrimary {
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.28);
}

.logoutModalBtnPressed {
	transform: scale(0.97);
	opacity: 0.82;
}

@keyframes logoutModalIn {
	from {
		opacity: 0;
		transform: scale(0.92);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}

.cropCancel {
	position: fixed;
	top: 30rpx;
	right: 30rpx;
	z-index: 1001;
	background-color: rgba(0, 0, 0, 0.5);
	color: #fff;
	padding: 14rpx 20rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
}
</style>
