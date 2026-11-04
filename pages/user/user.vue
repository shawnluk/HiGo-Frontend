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
			</view>
		</PageScaffold>

		<QfImageCropper
			v-if="showCropper"
			ref="cropper"
			:src="cropperImg"
			:width="300"
			:height="300"
			:radius="150"
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
	fetchUserProfile,
	fetchUserSquadPanel,
} from '@/api/modules/user.js'
import { isTokenExpired } from '@/utils/token.js'

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
		QfImageCropper
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

	/** 页面加载：读取参数、校验登录态并加载用户数据 */
	onLoad(options) {
		if (options && options.user_id) {
			this.userId = options.user_id
		}
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
			uni.showModal({
				title: '请重新登录',
				content: '登录已过期，请重新登录后再操作',
				confirmText: '去登录',
				showCancel: false,
				success: (res) => {
					if (res.confirm) {
						uni.navigateTo({
							url: '/src/login/login',
						})
					}
				},
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
			let userId = ''
			let username = ''
			let userInfo = null
			let squads = []
			try {
				userId = uni.getStorageSync('userId')
				username = uni.getStorageSync('username')
				userInfo = uni.getStorageSync('userInfo')
				squads = uni.getStorageSync('squads') || []
			} catch (_) {}
			this.squads = squads
			if (!userId && !userInfo) {
				this.isLoggedIn = false
				return
			}
			this.userId = userId !== undefined && userId !== '' ? userId : this.userId
			this.user_no = userInfo.user_no !== undefined && userInfo !== '' ? userInfo.user_no  : this.user_no
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
			if (!this.isLoggedIn) {
				try {
					const profile = await fetchUserProfile()
					if (profile) {
						this.avatarUrl = profile.avatarUrl || this.avatarUrl
						this.displayNameGuest = profile.displayNameGuest || this.displayNameGuest
						this.displayNameLoggedIn = profile.displayNameLoggedIn || this.displayNameLoggedIn
						this.isLoggedIn = profile.isLoggedIn || false
						if (profile.header) {
							this.header = { ...this.header, ...profile.header }
						}
						if (Array.isArray(profile.dataItems) && profile.dataItems.length) {
							this.dataItems = profile.dataItems
						}
					}
				} catch (_) {}
			}

			try {
				const squadItems = await fetchUserSquadPanel()
				if (Array.isArray(squadItems) && squadItems.length) {
					this.squadItems = squadItems
				}
			} catch (_) {}
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

		/** 退出登录：确认后清理缓存并刷新页面 */
		handleLogout() {
			uni.showModal({
				title: '退出登录',
				content: '确定要退出当前账号吗？',
				confirmText: '退出',
				confirmColor: '#e54d42',
				success: (res) => {
					if (!res.confirm) return
					this.clearLoginCache()
					uni.redirectTo({
						url: '/pages/user/user',
					})
				},
			})
		},

		/** 打开头像裁剪组件并选择图片 */
		handleCrop() {
			this.showCropper = true
			this.cropperImg = ''
			this.cropCanceled = false
			this.$nextTick(() => {
				this.$refs.cropper && this.$refs.cropper.chooseImage()
			})
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

		/** 裁剪完成：更新头像并关闭裁剪组件 */
		onCropperCrop(e) {
			if (this.cropCanceled) return
			if (e && e.tempFilePath) {
				this.avatarUrl = e.tempFilePath
			}
			this.showCropper = false
			this.cropperImg = ''
			this.cropCanceled = false
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
