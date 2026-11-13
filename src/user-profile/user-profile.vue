<template>
	<view class="pageRoot">
		<!-- 顶部资料摘要：头像可点击更换 -->
		<view class="heroCard">
			<view class="heroAvatarWrap" @tap="onAvatarTap">
				<image class="heroAvatar" :src="avatarUrl" mode="aspectFill" />
				<view class="avatarBadge">
					<uni-icons type="camera-filled" size="12" color="#ffffff" />
				</view>
			</view>
			<view class="heroInfo">
				<text class="heroName">{{ displayName }}</text>
				<text class="heroSub">趣玩号：{{ partnerId }}</text>
			</view>
		</view>

		<!-- 资料明细：可编辑项右侧带箭头，只读项置灰 -->
		<view class="infoCard">
			<template v-for="row in profileRows">
				<!-- 生日使用原生日期选择器（picker 外层包装，内部保持与其他行一致的布局） -->
				<picker
					v-if="row.field === 'birthday'"
					:key="row.label"
					class="infoRowPicker"
					mode="date"
					:value="row.rawValue"
					:end="today"
					@change="onBirthdayChange"
				>
					<view
						class="infoRow"
						hover-class="infoRow--hover"
						hover-stay-time="120"
					>
						<text class="infoLabel">{{ row.label }}</text>
						<view class="infoValueWrap">
							<text class="infoValue" :class="{ empty: row.empty }">{{ row.value }}</text>
							<uni-icons type="right" size="14" color="#c0c0c0" />
						</view>
					</view>
				</picker>
				<view
					v-else
					:key="row.label"
					class="infoRow"
					:class="{ 'infoRow--tappable': !row.readonly }"
					:hover-class="row.readonly ? 'none' : 'infoRow--hover'"
					:hover-stay-time="120"
					@tap="onRowTap(row)"
				>
					<text class="infoLabel">{{ row.label }}</text>
					<view class="infoValueWrap">
						<text
							class="infoValue"
							:class="{ empty: row.empty, 'infoValue--readonly': row.readonly }"
						>{{ row.value }}</text>
						<uni-icons v-if="!row.readonly" type="right" size="14" color="#c0c0c0" />
					</view>
				</view>
			</template>
		</view>

		<!-- 昵称 / 手机号编辑弹窗 -->
		<view v-if="showEditModal" class="editModalMask" @tap="cancelEdit">
			<view class="editModalCard" @tap.stop>
				<text class="editModalTitle">{{ editTitle }}</text>
				<input
					class="editModalInput"
					:value="editInput"
					:type="editField === 'phone' ? 'number' : 'text'"
					:maxlength="editField === 'phone' ? 11 : 20"
					:placeholder="editPlaceholder"
					placeholder-class="editModalPlaceholder"
					@input="onEditInput"
				/>
				<view class="editModalActions">
					<view
						class="editModalBtn editModalBtnGhost"
						hover-class="editModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelEdit"
					>取消</view>
					<view
						class="editModalBtn editModalBtnPrimary"
						hover-class="editModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmEdit"
					>保存</view>
				</view>
			</view>
		</view>

		<!-- 头像裁剪：裁剪完成后上传 COS 并更新资料 -->
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
import { MOCK_USER_DEFAULT_AVATAR } from '@/mock/user-display.js'
import { updateProfile } from '@/api/modules/user.js'
import { uploadAvatar } from '@/utils/cos-upload.js'
import { pickSingleImage } from '@/utils/image-picker.js'
import QfImageCropper from '@/uni_modules/qf-image-cropper/components/qf-image-cropper/qf-image-cropper.vue'

const EMPTY_TEXT = '暂无'

/**
 * 格式化日期时间：兼容 "2026-08-21 00:00:00" 与 ISO 字符串。
 * @param {*} value 后端时间字段
 * @param {boolean} withTime 是否输出时分（生日等仅日期字段传 false）
 * @returns {string} 格式化后的时间文案；无法解析时原样返回
 */
function formatDateTime(value, withTime) {
	if (value === null || value === undefined) return ''
	const text = String(value).trim()
	if (!text) return ''
	// iOS 对 "yyyy-MM-dd HH:mm:ss" 解析不稳定，统一转为 "/" 分隔
	const normalized = text.replace(/T/, ' ').replace(/-/g, '/').replace(/\.\d+Z?$/, '')
	const date = new Date(normalized)
	if (Number.isNaN(date.getTime())) return text
	const pad = (n) => String(n).padStart(2, '0')
	const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
	if (!withTime) return datePart
	return `${datePart} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/** 今天的日期字符串（yyyy-MM-dd），用于生日选择器上限 */
function todayString() {
	const d = new Date()
	const pad = (n) => String(n).padStart(2, '0')
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/**
 * 性别文案：1=男，2=女，其余视为未填写。
 * @param {*} value 后端 gender 字段
 * @returns {string} 性别文案，未填写时返回空串
 */
function formatGender(value) {
	const v = value === null || value === undefined ? '' : String(value).trim().toLowerCase()
	if (v === '1' || v === '男' || v === 'male') return '男'
	if (v === '2' || v === '女' || v === 'female') return '女'
	return ''
}

/**
 * 用户类型文案：0=普通用户，1=管理员，2=VIP，其余视为未填写。
 * @param {*} value 后端 user_type 字段（数字枚举）
 * @returns {string} 用户类型文案，未填写时返回空串
 */
function formatUserType(value) {
	const v = value === null || value === undefined ? '' : String(value).trim()
	if (v === '0') return '普通用户'
	if (v === '1') return '管理员'
	if (v === '2') return 'VIP'
	return ''
}

export default {
	name: 'UserProfile',
	components: {
		QfImageCropper,
	},
	data() {
		return {
			userInfo: {},
			username: '',
			avatarUrl: MOCK_USER_DEFAULT_AVATAR,
			showEditModal: false,
			editField: '',
			editInput: '',
			showCropper: false,
			cropperImg: '',
			cropCanceled: false,
		}
	},
	computed: {
		/** 昵称优先，其次用户名；都为空时显示「暂无」 */
		displayName() {
			const info = this.userInfo || {}
			return info.nickname || info.username || this.username || EMPTY_TEXT
		},
		/** 趣玩号（user_no） */
		partnerId() {
			const info = this.userInfo || {}
			const no = info.user_no
			return no === null || no === undefined || String(no).trim() === ''
				? EMPTY_TEXT
				: String(no).trim()
		},
		/** 生日选择器可选的最大日期（不允许选未来） */
		today() {
			return todayString()
		},
		/** 编辑弹窗标题 */
		editTitle() {
			return this.editField === 'phone' ? '修改手机号' : '修改昵称'
		},
		/** 编辑弹窗占位文案 */
		editPlaceholder() {
			return this.editField === 'phone' ? '请输入手机号' : '请输入昵称'
		},
		/**
		 * 资料明细行：
		 * - 可编辑：昵称、手机号、性别、生日
		 * - 真实姓名：可点击，但实名认证接口暂未接入
		 * - 其余字段只读置灰
		 */
		profileRows() {
			const info = this.userInfo || {}
			const rows = [
				{ label: '昵称', value: info.nickname, field: 'nickname' },
				{ label: '趣玩号', value: info.user_no, readonly: true },
				{ label: '用户名', value: this.username || info.username, readonly: true },
				{ label: '真实姓名', value: info.real_name, field: 'real_name' },
				{ label: '手机号', value: info.phone, field: 'phone' },
				{ label: '性别', value: formatGender(info.gender), field: 'gender' },
				{ label: '生日', value: formatDateTime(info.birthday, false), field: 'birthday' },
				{ label: '身份证号', value: info.identity_card, readonly: true },
				{ label: '用户类型', value: formatUserType(info.user_type), readonly: true },
				{ label: '注册时间', value: formatDateTime(info.register_time, true), readonly: true },
				{ label: '最后登录', value: formatDateTime(info.last_login_time, true), readonly: true },
			]
			return rows.map((row) => {
				const text = row.value === null || row.value === undefined ? '' : String(row.value).trim()
				// 生日为空时展示选择提示，其它字段为空统一展示「暂无」
				const emptyText = row.field === 'birthday' ? '请选择生日' : EMPTY_TEXT
				return {
					...row,
					value: text || emptyText,
					empty: !text,
					rawValue: text,
				}
			})
		},
	},
	/** 每次进入页面都重新读取本地缓存，保证资料为最新登录结果 */
	onShow() {
		this.loadProfile()
	},
	methods: {
		/** 从本地缓存读取登录接口返回的资料对象 */
		loadProfile() {
			let userInfo = null
			let username = ''
			try {
				userInfo = uni.getStorageSync('userInfo')
				username = uni.getStorageSync('username')
			} catch (_) {}
			this.userInfo = userInfo && typeof userInfo === 'object' ? userInfo : {}
			this.username = typeof username === 'string' ? username : ''
			this.avatarUrl = this.userInfo.avatar || MOCK_USER_DEFAULT_AVATAR
		},
		/** 保存单个字段：调用资料更新接口，成功后写入本地缓存 */
		async saveField(key, value) {
			uni.showLoading({ title: '保存中...', mask: true })
			try {
				await updateProfile({ [key]: value })
				this.userInfo = { ...this.userInfo, [key]: value }
				try {
					uni.setStorageSync('userInfo', this.userInfo)
				} catch (_) {}
				uni.hideLoading()
				uni.showToast({ title: '已保存', icon: 'none' })
				return true
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && err.message) || '保存失败', icon: 'none' })
				return false
			}
		},
		/** 点击资料行：按字段分发到对应编辑方式 */
		onRowTap(row) {
			if (!row || row.readonly) return
			if (row.field === 'real_name') {
				uni.showToast({ title: '实名认证接口待接入', icon: 'none' })
				return
			}
			if (row.field === 'nickname' || row.field === 'phone') {
				this.openEditModal(row.field)
				return
			}
			if (row.field === 'gender') {
				this.openGenderPicker()
			}
		},
		/** 更换头像：选择图片后打开裁剪组件 */
		async onAvatarTap() {
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
		/** 裁剪完成：上传到 COS，再更新头像资料 */
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
				this.userInfo = { ...this.userInfo, avatar: avatarUrl }
				try {
					uni.setStorageSync('userInfo', this.userInfo)
				} catch (_) {}
				uni.hideLoading()
				uni.showToast({ title: '头像已更新', icon: 'success' })
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && err.message) || '头像更新失败', icon: 'none' })
			}
		},
		/** 打开昵称 / 手机号编辑弹窗 */
		openEditModal(field) {
			const info = this.userInfo || {}
			this.editField = field
			this.editInput = field === 'phone' ? String(info.phone || '') : String(info.nickname || '')
			this.showEditModal = true
		},
		/** 关闭编辑弹窗 */
		cancelEdit() {
			this.showEditModal = false
		},
		/** 同步弹窗输入内容 */
		onEditInput(e) {
			this.editInput = e && e.detail ? e.detail.value : ''
		},
		/** 保存昵称 / 手机号 */
		async confirmEdit() {
			const value = String(this.editInput || '').trim()
			let saved = false
			if (this.editField === 'nickname') {
				if (!value) {
					uni.showToast({ title: '昵称不能为空', icon: 'none' })
					return
				}
				saved = await this.saveField('nickname', value)
			} else if (this.editField === 'phone') {
				if (!/^1[3-9]\d{9}$/.test(value)) {
					uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
					return
				}
				saved = await this.saveField('phone', value)
			}
			if (saved) this.showEditModal = false
		},
		/** 选择性别：1=男，2=女，写入数字枚举 */
		openGenderPicker() {
			uni.showActionSheet({
				itemList: ['男', '女'],
				success: (res) => {
					const gender = res.tapIndex === 0 ? 1 : 2
					this.saveField('gender', gender)
				},
			})
		},
		/** 选择生日 */
		onBirthdayChange(e) {
			const value = e && e.detail ? e.detail.value : ''
			if (!value) return
			this.saveField('birthday', value)
		},
	},
}
</script>

<style scoped>
.pageRoot {
	min-height: 100vh;
	background: #f5f5f6;
	padding: 24rpx;
	box-sizing: border-box;
}

/* 顶部资料摘要 */
.heroCard {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 32rpx 28rpx;
	border-radius: 32rpx;
	background: #ffffff;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
}

.heroAvatarWrap {
	position: relative;
	flex-shrink: 0;
}

.heroAvatar {
	width: 120rpx;
	height: 120rpx;
	border-radius: 50%;
	background: #f2f2f3;
	border: 4rpx solid rgba(255, 59, 48, 0.12);
}

/* 头像右下角相机角标，提示可更换 */
.avatarBadge {
	position: absolute;
	right: 0;
	bottom: 0;
	width: 40rpx;
	height: 40rpx;
	border-radius: 50%;
	background: #ff3b30;
	border: 3rpx solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 4rpx 12rpx rgba(255, 59, 48, 0.3);
}

.heroInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.heroName {
	font-size: 36rpx;
	font-weight: 700;
	color: #222222;
}

.heroSub {
	font-size: 24rpx;
	color: #999999;
}

/* 资料明细卡片 */
.infoCard {
	margin-top: 20rpx;
	padding: 8rpx 28rpx;
	border-radius: 32rpx;
	background: #ffffff;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
}

.infoRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 24rpx;
	padding: 28rpx 0;
	border-bottom: 1rpx solid #f2f2f3;
	border-radius: 16rpx;
}

.infoRow:last-child {
	border-bottom: none;
}

/* picker 默认非块级元素，撑满整行以保证与其它资料行一致 */
.infoRowPicker {
	display: block;
	width: 100%;
}

/* 可编辑行点击反馈 */
.infoRow--hover {
	background: #faf7f7;
}

.infoLabel {
	flex-shrink: 0;
	font-size: 28rpx;
	color: #666666;
}

.infoValueWrap {
	flex: 1;
	min-width: 0;
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 8rpx;
}

.infoValue {
	font-size: 28rpx;
	color: #222222;
	text-align: right;
	word-break: break-all;
}

.infoValue.empty {
	color: #bbbbbb;
}

/* 不可修改字段的值置灰 */
.infoValue--readonly {
	color: #a8a8a8;
}

/* 昵称 / 手机号编辑弹窗 */
.editModalMask {
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

.editModalCard {
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
	animation: editModalIn 0.18s ease-out;
}

.editModalTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	margin-bottom: 28rpx;
}

.editModalInput {
	width: 100%;
	height: 88rpx;
	padding: 0 24rpx;
	box-sizing: border-box;
	background: #f7f7f8;
	border-radius: 20rpx;
	font-size: 28rpx;
	color: #222222;
}

.editModalPlaceholder {
	color: #b5b5b5;
}

.editModalActions {
	display: flex;
	gap: 20rpx;
	width: 100%;
	margin-top: 36rpx;
}

.editModalBtn {
	flex: 1;
	height: 84rpx;
	border-radius: 42rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}

.editModalBtnGhost {
	background: #f2f2f3;
	color: #666666;
}

.editModalBtnPrimary {
	background: linear-gradient(135deg, #ff6b5e 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 8rpx 20rpx rgba(255, 59, 48, 0.24);
}

.editModalBtnPressed {
	opacity: 0.85;
}

/* 裁剪组件右上角取消按钮 */
.cropCancel {
	position: fixed;
	top: 30rpx;
	right: 30rpx;
	z-index: 1001;
	background-color: rgba(0, 0, 0, 0.5);
	color: #ffffff;
	padding: 14rpx 20rpx;
	border-radius: 999rpx;
	font-size: 28rpx;
}

@keyframes editModalIn {
	from {
		transform: scale(0.92);
		opacity: 0;
	}
	to {
		transform: scale(1);
		opacity: 1;
	}
}
</style>
