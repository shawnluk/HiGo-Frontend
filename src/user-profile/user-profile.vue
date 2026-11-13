<template>
	<view class="pageRoot" :class="{ 'pageRoot--withDraftBar': hasDraft }">
		<!-- 顶部资料摘要：头像可点击更换 -->
		<view class="heroCard">
			<view class="heroAvatarWrap" @tap="onAvatarTap">
				<image class="heroAvatar" :src="displayAvatarUrl" mode="aspectFill" />
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
			<template v-for="row in profileRows" :key="row.label">
				<view
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

		<!-- 昵称 / 手机号 / 邮箱编辑弹窗 -->
		<view v-if="showEditModal" class="editModalMask" @tap="cancelEdit">
			<view class="editModalCard" @tap.stop>
				<text class="editModalTitle">{{ editTitle }}</text>
				<input
					class="editModalInput"
					:value="editInput"
					:type="editField === 'phone' ? 'number' : 'text'"
					:maxlength="editMaxlength"
					:placeholder="editPlaceholder"
					placeholder-class="editModalPlaceholder"
					@input="onEditInput"
				/>
				<text v-if="editError" class="editModalError">{{ editError }}</text>
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
					>确定</view>
				</view>
			</view>
		</view>

		<!-- 性别选择弹窗（自定义样式，替代默认 actionSheet） -->
		<view v-if="showGenderModal" class="editModalMask" @tap="cancelGender">
			<view class="editModalCard" @tap.stop>
				<text class="editModalTitle">选择性别</text>
				<view class="genderOptions">
					<view
						v-for="item in genderOptions"
						:key="item.value"
						class="genderOption"
						:class="{ 'genderOptionActive': genderValue === item.value }"
						hover-class="genderOptionHover"
						hover-stay-time="100"
						@tap="selectGender(item.value)"
					>
						<text class="genderOptionText">{{ item.label }}</text>
						<uni-icons
							v-if="genderValue === item.value"
							type="checkmarkempty"
							size="16"
							color="#ff3b30"
						/>
					</view>
				</view>
				<view
					class="editModalBtn editModalBtnGhost genderCancelBtn"
					hover-class="editModalBtnPressed"
					hover-stay-time="120"
					@tap="cancelGender"
				>取消</view>
			</view>
		</view>

		<!-- 生日选择弹窗（复用通用日期选择组件） -->
		<DatePickerModal
			v-model:visible="showBirthdayPicker"
			:value="birthdayValue"
			title="选择生日"
			:end="latestBirthday"
			@confirm="onBirthdayConfirm"
		/>

		<!-- 头像裁剪：裁剪完成后仅本地预览，随草稿一起提交 -->
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

		<!-- 草稿操作栏：存在未提交修改时固定显示在底部 -->
		<view v-if="hasDraft" class="draftBar">
			<view
				class="draftBarBtn draftBarBtnGhost"
				:class="{ 'draftBarBtnDisabled': submitting }"
				hover-class="draftBarBtnPressed"
				:hover-stay-time="120"
				@tap="cancelDraft"
			>取消修改</view>
			<view
				class="draftBarBtn draftBarBtnPrimary"
				:class="{ 'draftBarBtnDisabled': submitting }"
				hover-class="draftBarBtnPressed"
				:hover-stay-time="120"
				@tap="submitDraft"
			>{{ submitting ? '提交中...' : '确认提交' }}</view>
		</view>
	</view>
</template>

<script>
import { MOCK_USER_DEFAULT_AVATAR } from '@/mock/user-display.js'
import { updateProfile } from '@/api/modules/user.js'
import { uploadAvatar } from '@/utils/cos-upload.js'
import { pickSingleImage } from '@/utils/image-picker.js'
import QfImageCropper from '@/uni_modules/qf-image-cropper/components/qf-image-cropper/qf-image-cropper.vue'
import DatePickerModal from '@/components/date-picker-modal.vue'

const EMPTY_TEXT = '暂无'

// 与后端「用户资料修改接口」保持一致：昵称 1-20 字符，仅中文/字母/数字/下划线/连字符
const NICKNAME_MIN_LENGTH = 1
const NICKNAME_MAX_LENGTH = 20
const NICKNAME_PATTERN = /^[\u4e00-\u9fa5A-Za-z0-9_-]+$/
// 手机号：非空时须匹配该格式
const PHONE_PATTERN = /^1[3-9]\d{9}$/
// 邮箱：非空时校验基础格式与最大长度（与 users.email VARCHAR(128) 对齐）
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const EMAIL_MAX_LENGTH = 128

/**
 * 格式化日期时间：兼容 "2026-08-21 00:00:00"、纯日期 "2026-08-21" 与 ISO 字符串。
 * 后端 DATE / DATETIME 字段会被序列化为 UTC 的 ISO 字符串（如 1995-06-06T16:00:00.000Z），
 * 必须按本地时区解析，避免生日、注册时间等出现日期或时间偏移。
 * @param {*} value 后端时间字段
 * @param {boolean} withTime 是否输出时分（生日等仅日期字段传 false）
 * @returns {string} 格式化后的时间文案；无法解析时原样返回
 */
function formatDateTime(value, withTime) {
	if (value === null || value === undefined) return ''
	const text = String(value).trim()
	if (!text) return ''
	// 纯日期字符串直接返回，避免被按 UTC 解析后产生偏移
	if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text
	let date
	if (/T|Z|[+-]\d{2}:?\d{2}$/.test(text)) {
		// 带时区的 ISO 字符串按本地时区解析
		date = new Date(text)
	} else {
		// iOS 对 "yyyy-MM-dd HH:mm:ss" 解析不稳定，统一转为 "/" 分隔
		date = new Date(text.replace(/-/g, '/'))
	}
	if (Number.isNaN(date.getTime())) return text
	const pad = (n) => String(n).padStart(2, '0')
	const datePart = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
	if (!withTime) return datePart
	return `${datePart} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

/**
 * 性别文案：0=保密，1=男，2=女，其余视为未填写。
 * @param {*} value 后端 gender 字段
 * @returns {string} 性别文案，未填写时返回空串
 */
function formatGender(value) {
	const v = value === null || value === undefined ? '' : String(value).trim().toLowerCase()
	if (v === '0' || v === '保密' || v === 'unknown') return '保密'
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
		DatePickerModal,
	},
	data() {
		return {
			userInfo: {},
			username: '',
			/** 未提交的字段草稿：key 与后端字段一致（nickname/phone/email/gender/birthday） */
			draft: {},
			/** 裁剪后的头像本地路径，确认提交时才上传 */
			pendingAvatarPath: '',
			/** 已上传成功但资料尚未提交成功的头像 URL，重试时复用避免重复上传 */
			pendingAvatarUrl: '',
			/** 提交中状态，防止重复点击 */
			submitting: false,
			/** 创建草稿时的登录用户 ID，用于识别退出 / 换号 */
			draftOwnerId: '',
			showEditModal: false,
			editField: '',
			editInput: '',
			/** 编辑弹窗内的校验错误文案（避免 toast 被弹窗遮挡或一闪而过） */
			editError: '',
			showGenderModal: false,
			// 性别选项：0=保密，1=男，2=女（与后端枚举一致）
			genderOptions: [
				{ label: '男', value: 1 },
				{ label: '女', value: 2 },
				{ label: '保密', value: 0 },
			],
			showBirthdayPicker: false,
			showCropper: false,
			cropperImg: '',
			cropCanceled: false,
		}
	},
	computed: {
		/** 合并草稿后的资料视图：页面所有展示统一读取这里，实现草稿值即时预览 */
		viewInfo() {
			return { ...(this.userInfo || {}), ...this.draft }
		},
		/** 头像预览：优先本地裁剪结果，其次待提交的已上传 URL，最后是已保存的头像 */
		displayAvatarUrl() {
			return (
				this.pendingAvatarPath ||
				this.pendingAvatarUrl ||
				(this.userInfo || {}).avatar ||
				MOCK_USER_DEFAULT_AVATAR
			)
		},
		/** 是否存在未提交的修改 */
		hasDraft() {
			return (
				Object.keys(this.draft || {}).length > 0 ||
				!!this.pendingAvatarPath ||
				!!this.pendingAvatarUrl
			)
		},
		/** 昵称优先，其次用户名；都为空时显示「暂无」 */
		displayName() {
			const info = this.viewInfo
			return info.nickname || info.username || this.username || EMPTY_TEXT
		},
		/** 趣玩号（user_no） */
		partnerId() {
			const info = this.viewInfo
			const no = info.user_no
			return no === null || no === undefined || String(no).trim() === ''
				? EMPTY_TEXT
				: String(no).trim()
		},
		/** 生日选择器可选的最大日期：后端要求生日必须早于今天 */
		latestBirthday() {
			const d = new Date()
			d.setDate(d.getDate() - 1)
			const pad = (n) => String(n).padStart(2, '0')
			return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
		},
		/** 编辑弹窗标题 */
		editTitle() {
			if (this.editField === 'phone') return '修改手机号'
			if (this.editField === 'email') return '修改邮箱'
			return '修改昵称'
		},
		/** 编辑弹窗占位文案 */
		editPlaceholder() {
			if (this.editField === 'phone') return '请输入手机号'
			if (this.editField === 'email') return '请输入邮箱'
			return '请输入昵称'
		},
		/** 编辑弹窗输入长度上限：手机号 11 位，邮箱 128 位，昵称 20 位 */
		editMaxlength() {
			if (this.editField === 'phone') return 11
			if (this.editField === 'email') return EMAIL_MAX_LENGTH
			return NICKNAME_MAX_LENGTH
		},
		/** 当前性别枚举值（0/1/2），未填写时返回 null */
		genderValue() {
			const raw = (this.viewInfo || {}).gender
			if (raw === null || raw === undefined || String(raw).trim() === '') return null
			const num = Number(raw)
			return [0, 1, 2].includes(num) ? num : null
		},
		/** 当前生日（yyyy-MM-dd），供日期选择器回填 */
		birthdayValue() {
			return formatDateTime((this.viewInfo || {}).birthday, false)
		},
		/**
		 * 资料明细行：
		 * - 可编辑：昵称、手机号、邮箱、性别、生日
		 * - 真实姓名：可点击，但实名认证接口暂未接入
		 * - 其余字段只读置灰
		 */
		profileRows() {
			const info = this.viewInfo
			const rows = [
				{ label: '昵称', value: info.nickname, field: 'nickname' },
				{ label: '趣玩号', value: info.user_no, readonly: true },
				{ label: '用户名', value: this.username || info.username, readonly: true },
				{ label: '真实姓名', value: info.real_name, field: 'real_name' },
				{ label: '手机号', value: info.phone, field: 'phone' },
				{ label: '邮箱', value: info.email, field: 'email' },
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
				}
			})
		},
	},
	/** 每次进入页面读取本地缓存；存在草稿时保留，仅在退出 / 换号后清空 */
	onShow() {
		if (this.hasDraft) {
			let ownerId = ''
			try {
				const stored = uni.getStorageSync('userId')
				ownerId = stored === null || stored === undefined ? '' : String(stored)
			} catch (_) {}
			// 账号变化时丢弃上一账号的草稿，避免展示错误资料
			if (ownerId !== String(this.draftOwnerId || '')) {
				this.resetDraft()
				this.loadProfile()
			}
			return
		}
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
		},
		/** 归一化字段值：文本去空格，性别转数字枚举，生日统一为 yyyy-MM-dd */
		normalizeField(field, value) {
			if (field === 'gender') {
				if (value === null || value === undefined || String(value).trim() === '') return null
				const num = Number(value)
				return [0, 1, 2].includes(num) ? num : null
			}
			if (field === 'birthday') return formatDateTime(value, false)
			return value === null || value === undefined ? '' : String(value).trim()
		},
		/** 写入草稿：与已保存值一致时移出草稿，实现「改回原值自动取消该项修改」 */
		setDraftField(field, value) {
			const next = this.normalizeField(field, value)
			const origin = this.normalizeField(field, (this.userInfo || {})[field])
			const draft = { ...this.draft }
			if (next === origin) {
				delete draft[field]
			} else {
				draft[field] = next
			}
			this.draft = draft
			this.syncDraftOwner()
		},
		/** 草稿存在时记录当前登录用户，供 onShow 识别账号切换 */
		syncDraftOwner() {
			if (this.hasDraft) {
				if (!this.draftOwnerId) {
					try {
						const stored = uni.getStorageSync('userId')
						this.draftOwnerId = stored === null || stored === undefined ? '' : String(stored)
					} catch (_) {}
				}
				return
			}
			this.draftOwnerId = ''
		},
		/** 清空草稿与头像预览 */
		resetDraft() {
			this.draft = {}
			this.pendingAvatarPath = ''
			this.pendingAvatarUrl = ''
			this.draftOwnerId = ''
		},
		/** 取消修改：整体还原为已保存的资料 */
		cancelDraft() {
			if (this.submitting) return
			this.resetDraft()
		},
		/**
		 * 按后端「用户资料修改接口」规则校验单个字段。
		 * @param {string} field 字段名
		 * @param {*} value 字段值
		 * @returns {string} 错误文案；校验通过时返回空串
		 */
		validateField(field, value) {
			const text = value === null || value === undefined ? '' : String(value).trim()

			if (field === 'nickname') {
				if (!text) return '昵称不能为空'
				if (text.length < NICKNAME_MIN_LENGTH || text.length > NICKNAME_MAX_LENGTH) {
					return `昵称长度需为 ${NICKNAME_MIN_LENGTH}-${NICKNAME_MAX_LENGTH} 个字符`
				}
				if (!NICKNAME_PATTERN.test(text)) {
					return '昵称只能包含中文、字母、数字、下划线和连字符'
				}
				return ''
			}

			if (field === 'phone') {
				// 后端允许空值（清除手机号）；非空时须为合法手机号
				if (text && !PHONE_PATTERN.test(text)) return '手机号格式不正确'
				return ''
			}

			if (field === 'email') {
				// 后端允许空值（清除邮箱）；非空时校验长度与基础格式
				if (text && (text.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(text))) {
					return '邮箱格式不正确'
				}
				return ''
			}

			if (field === 'birthday') {
				if (!text) return ''
				if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return '生日格式应为 YYYY-MM-DD'
				const [year, month, day] = text.split('-').map((part) => Number(part))
				const date = new Date(year, month - 1, day)
				if (
					date.getFullYear() !== year ||
					date.getMonth() !== month - 1 ||
					date.getDate() !== day
				) {
					return '生日不是有效日期'
				}
				const now = new Date()
				const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
				if (date.getTime() >= todayStart.getTime()) return '生日必须早于今天'
				return ''
			}

			if (field === 'gender') {
				if (text === '') return ''
				return [0, 1, 2].includes(Number(text)) ? '' : '性别取值应为 0/1/2'
			}

			return ''
		},
		/** 提交前按后端规则校验所有草稿字段，返回是否通过 */
		validateDraft() {
			const draft = this.draft || {}
			const fields = ['nickname', 'phone', 'email', 'birthday', 'gender']
			for (const field of fields) {
				if (draft[field] === undefined) continue
				const message = this.validateField(field, draft[field])
				if (message) {
					uni.showToast({ title: message, icon: 'none' })
					return false
				}
			}
			return true
		},
		/** 一次性提交所有草稿字段：头像先上传，随后只发一次资料更新请求 */
		async submitDraft() {
			if (!this.hasDraft || this.submitting) return
			if (!this.validateDraft()) return

			this.submitting = true
			uni.showLoading({ title: '提交中...', mask: true })

			// 头像先上传 COS；失败时保留草稿与本地预览，不发起资料更新
			if (this.pendingAvatarPath) {
				try {
					this.pendingAvatarUrl = await uploadAvatar(this.pendingAvatarPath)
					this.pendingAvatarPath = ''
				} catch (err) {
					uni.hideLoading()
					this.submitting = false
					uni.showToast({
						title: (err && err.message) || '头像上传失败，请重试',
						icon: 'none',
					})
					return
				}
			}

			// 仅提交发生变更的字段，未修改字段后端不做任何写入
			const payload = { ...this.draft }
			if (this.pendingAvatarUrl) payload.avatar = this.pendingAvatarUrl

			try {
				const res = await updateProfile(payload)
				// 合并后端返回的最新资料；mock 回显 payload 时也能得到一致结果
				const base = { ...this.userInfo, ...payload }
				if (res && res.profile && typeof res.profile === 'object') {
					Object.assign(base, res.profile)
				}
				if (res && res.phone !== undefined) base.phone = res.phone
				if (res && res.email !== undefined) base.email = res.email

				this.userInfo = base
				try {
					uni.setStorageSync('userInfo', base)
				} catch (_) {}
				this.resetDraft()
				uni.hideLoading()
				uni.showToast({ title: '已保存', icon: 'success' })
			} catch (err) {
				uni.hideLoading()
				uni.showToast({ title: (err && err.message) || '提交失败', icon: 'none' })
			} finally {
				this.submitting = false
			}
		},
		/** 点击资料行：按字段分发到对应编辑方式 */
		onRowTap(row) {
			if (!row || row.readonly) return
			if (row.field === 'real_name') {
				uni.showToast({ title: '实名认证接口待接入', icon: 'none' })
				return
			}
			if (row.field === 'nickname' || row.field === 'phone' || row.field === 'email') {
				this.openEditModal(row.field)
				return
			}
			if (row.field === 'birthday') {
				this.showBirthdayPicker = true
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
		/** 裁剪完成：仅更新本地预览，确认提交时再上传与保存 */
		onCropperCrop(e) {
			if (this.cropCanceled) return
			const tempFilePath = e && e.tempFilePath
			this.showCropper = false
			this.cropperImg = ''
			this.cropCanceled = false
			if (!tempFilePath) return

			// 本地预览裁剪结果；重新裁剪会覆盖旧预览并作废已上传的 URL
			this.pendingAvatarPath = tempFilePath
			this.pendingAvatarUrl = ''
			this.syncDraftOwner()
			uni.showToast({ title: '头像已更新，提交后生效', icon: 'none' })
		},
		/** 打开昵称 / 手机号 / 邮箱编辑弹窗 */
		openEditModal(field) {
			const info = this.viewInfo || {}
			this.editField = field
			this.editInput = String(info[field] || '')
			this.editError = ''
			this.showEditModal = true
		},
		/** 关闭编辑弹窗 */
		cancelEdit() {
			this.showEditModal = false
			this.editError = ''
		},
		/** 同步弹窗输入内容，输入时清除上一次的校验提示 */
		onEditInput(e) {
			this.editInput = e && e.detail ? e.detail.value : ''
			if (this.editError) this.editError = ''
		},
		/** 校验并写入草稿，不再立即请求后端；校验失败在弹窗内提示 */
		confirmEdit() {
			const value = String(this.editInput || '').trim()
			const message = this.validateField(this.editField, value)
			if (message) {
				this.editError = message
				return
			}
			this.setDraftField(this.editField, value)
			this.showEditModal = false
			this.editError = ''
		},
		/** 打开性别选择弹窗 */
		openGenderPicker() {
			this.showGenderModal = true
		},
		/** 关闭性别选择弹窗 */
		cancelGender() {
			this.showGenderModal = false
		},
		/** 选择性别：0=保密，1=男，2=女；仅写入草稿，与当前展示值一致时不产生修改 */
		selectGender(value) {
			this.showGenderModal = false
			if (value === this.genderValue) return
			this.setDraftField('gender', value)
		},
		/** 生日选择确认：按后端规则校验后写入草稿 */
		onBirthdayConfirm(value) {
			if (!value) return
			const message = this.validateField('birthday', value)
			if (message) {
				uni.showToast({ title: message, icon: 'none' })
				return
			}
			this.setDraftField('birthday', value)
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

/* 存在草稿时给底部固定操作栏预留高度，避免遮挡最后几行资料 */
.pageRoot--withDraftBar {
	padding-bottom: calc(160rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(160rpx + env(safe-area-inset-bottom, 0px));
}

/* 草稿操作栏：层级低于编辑弹窗（1000）、日期弹窗（1200）与裁剪组件（9999） */
.draftBar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 900;
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 28rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
	background: #ffffff;
	box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.08);
	box-sizing: border-box;
}

.draftBarBtn {
	flex: 1;
	height: 84rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}

.draftBarBtnGhost {
	background: #f2f2f3;
	color: #666666;
}

.draftBarBtnPrimary {
	background: linear-gradient(135deg, #ff6b5e 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 8rpx 20rpx rgba(255, 59, 48, 0.24);
}

.draftBarBtnPressed {
	opacity: 0.85;
}

.draftBarBtnDisabled {
	opacity: 0.6;
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

/* 昵称 / 手机号 / 邮箱编辑与性别选择弹窗 */
.editModalMask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	/* 低于 uni H5 toast（999），保证弹窗内的校验提示可见；同时高于草稿操作栏（900） */
	z-index: 990;
	background: rgba(17, 17, 17, 0.45);
	display: flex;
	overflow-y: auto;
	padding: 40rpx 60rpx;
	box-sizing: border-box;
}

.editModalCard {
	width: 100%;
	max-width: 560rpx;
	/* flex 子项使用 auto 外边距居中：视口足够高时上下居中，空间不足时可滚动而不被裁切 */
	margin: auto;
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

/* 弹窗内的校验错误提示 */
.editModalError {
	width: 100%;
	margin-top: 12rpx;
	font-size: 24rpx;
	color: #ff3b30;
	text-align: left;
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

/* 性别选择弹窗 */
.genderOptions {
	width: 100%;
	display: flex;
	flex-direction: column;
	gap: 16rpx;
}

.genderOption {
	width: 100%;
	height: 88rpx;
	padding: 0 28rpx;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	background: #f7f7f8;
	border: 2rpx solid transparent;
	border-radius: 20rpx;
}

.genderOptionActive {
	background: #fff1ef;
	border-color: rgba(255, 59, 48, 0.35);
}

.genderOptionText {
	font-size: 28rpx;
	color: #222222;
}

.genderOptionActive .genderOptionText {
	color: #ff3b30;
	font-weight: 600;
}

.genderOptionHover {
	opacity: 0.8;
}

.genderCancelBtn {
	width: 100%;
	margin-top: 32rpx;
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
