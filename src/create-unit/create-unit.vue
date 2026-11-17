<template>
	<view class="pageRoot">
		<!-- 自定义顶栏 -->
		<view class="navBar">
			<view class="backBtn" @click="onBack">
				<uni-icons type="left" size="22" color="#1f1f1f"></uni-icons>
			</view>
			<text class="navTitle">{{ isEdit ? '编辑小队' : '创建小队，与搭子一起玩' }}</text>
		</view>

		<scroll-view scroll-y class="formScroll" :show-scrollbar="false">
			<!-- 小队头像 -->
			<view class="card avatarCard">
				<view
					class="avatarBox"
					:class="{ hasAvatar: !!avatarPreview }"
					hover-class="avatarBox--hover"
					hover-stay-time="120"
					@tap="selectAvatar"
				>
					<image
						v-if="avatarPreview"
						class="avatarImg"
						:src="avatarPreview"
						mode="aspectFill"
					/>
					<uni-icons v-else type="staff-filled" size="56" color="#ffffff"></uni-icons>
					<view class="cameraBadge">
						<uni-icons type="camera-filled" size="14" color="#ffffff"></uni-icons>
					</view>
				</view>
				<text class="avatarLabel">{{ avatarPreview ? '点击更换头像' : '上传小队头像' }}</text>
			</view>

			<!-- 小队名称 -->
			<view class="card rowCard">
				<view class="rowLine">
					<text class="rowLabel">小队名称</text>
					<input
						:key="nameInputKey"
						class="rowInput"
						type="text"
						:value="unitName"
						placeholder="给小队起个响亮的名字"
						placeholder-class="fieldPh"
						:adjust-position="true"
						:cursor-spacing="24"
						@input="onUnitNameInput"
						@compositionend="onUnitNameInput"
					/>
				</view>
				<view class="nameFoot">
					<text class="nameHint">仅支持中文、字母、数字、空格，最多 8 个汉字或 16 个英文字符</text>
					<text v-if="nameWidthUsed > 0" class="nameCount">{{ nameWidthUsed }} / {{ nameWidthMax }}</text>
				</view>
			</view>

			<!-- 小队简介 -->
			<view class="card introCard">
				<text class="cardTitle">小队简介</text>
				<textarea
					class="introInput"
					:value="unitIntro"
					placeholder="介绍一下你的小队风格、适合谁来玩，以及你会带来怎样的活动～"
					placeholder-class="fieldPh"
					:auto-height="true"
					:maxlength="unitIntroMaxLen"
					:cursor-spacing="24"
					@input="onUnitIntroInput"
				/>
				<view class="introFoot">
					<text class="introLimit">最多 {{ unitIntroMaxLen }} 个字符</text>
					<text v-if="unitIntro.length > 0" class="introCount">{{ unitIntro.length }} / {{ unitIntroMaxLen }}</text>
				</view>
			</view>

			<!-- 小队分类 -->
			<view class="card catCard">
				<text class="cardTitle">小队分类</text>
				<view class="catGrid">
					<view
						v-for="item in categoryOptions"
						:key="item.category_id"
						class="catItem"
						:class="{ catItemActive: item.category_id === squadCategoryId }"
						@tap="onSelectCategory(item)"
					>
						<view class="catIconBox">
							<image v-if="item.icon" class="catIcon" :src="item.icon" mode="aspectFit" />
							<text v-else class="catFallback">{{ item.name.charAt(0) }}</text>
						</view>
						<text class="catName">{{ item.name }}</text>
					</view>
				</view>
			</view>

			<!-- 所在城市 / 入队审核 -->
			<view class="card rowCard">
				<!-- #ifndef H5 -->
				<picker mode="region" :value="region" @change="onRegionChange">
				<!-- #endif -->
					<view class="rowLine" @tap="onCityTap">
						<text class="rowLabel">所在城市</text>
						<text class="rowValue">{{ displayCity }}</text>
						<text class="chevron">›</text>
					</view>
				<!-- #ifndef H5 -->
				</picker>
				<!-- #endif -->

				<view class="rowDivider"></view>

				<view class="rowLine rowLineDisabled">
					<text class="rowLabel">入队审核</text>
					<text class="rowHint">需主理人审核</text>
					<view class="switchWrap">
						<switch :checked="needReview" color="#ff3b30" :disabled="true" />
					</view>
				</view>
			</view>

			<view class="scrollBottomPad"></view>
		</scroll-view>

		<view class="footer safeFooter">
			<view class="primary" hover-class="primary--hover" @tap="onSubmit">
				<text class="primaryTxt">{{ submitting ? (isEdit ? '保存中...' : '创建中...') : (isEdit ? '保存修改' : '创建小队') }}</text>
			</view>
		</view>

		<!-- 登录拦截组件：提交前统一校验登录态 -->
		<LoginGuard ref="loginGuard" :content="isEdit ? '登录后即可编辑小队' : '登录后即可创建小队'" />

		<!-- 小队头像裁剪：确认后仅本地预览，提交时统一上传 COS -->
		<QfImageCropper
			v-if="showCropper"
			ref="cropper"
			:src="cropperImg"
			:width="300"
			:height="300"
			:z-index="9999"
			fileType="png"
			@crop="onCropperCrop"
		>
			<view class="cropCancel" @click="cancelCrop">取消</view>
		</QfImageCropper>
	</view>
</template>

<script>
import { fetchCategories } from '@/api/modules/category.js'
import { createSquad, fetchSquadDetail, updateSquad } from '@/api/modules/user.js'
import LoginGuard from '@/components/login-guard.vue'
import QfImageCropper from '@/uni_modules/qf-image-cropper/components/qf-image-cropper/qf-image-cropper.vue'
import { pickSingleImage } from '@/utils/image-picker.js'
import { uploadTempAvatar } from '@/utils/cos-upload.js'
import { PENDING_SQUAD_SELECTION_KEY } from '@/constants/create-activity.js'
import { CATEGORY_VISUALS, CATEGORY_KEY_BY_ID } from '@/constants/category-visuals.js'
import { MOCK_INDEX_INITIAL_CITY, MOCK_INDEX_INITIAL_REGION } from '@/mock/index-page.js'
import {
	clampSquadName,
	squadNameDisplayWidth,
	stripInvalidSquadChars,
	SQUAD_NAME_MAX_WIDTH,
} from '@/utils/squad-name.js'

const SQUAD_NAME_TOAST_GAP_MS = 600
/** 小队简介最大字符数（含换行等，与 textarea maxlength 一致） */
const UNIT_INTRO_MAX_LEN = 100

/** 将接口分类项统一为页面展示结构 */
function normalizeCategory(item) {
	if (!item || typeof item !== 'object') return null
	const category_id = item.category_id != null ? item.category_id : item.id
	const name = item.category_name || item.text || item.name || ''
	if (category_id == null || !name) return null
	// 图标优先使用本地 SVG（后端 icon 指向私有读 COS，直连会 403，仅作兜底）
	const categoryKey = item.category_key || CATEGORY_KEY_BY_ID[category_id] || ''
	const visual = CATEGORY_VISUALS[categoryKey]
	const fallbackIcon = item.icon || item.icon_url || ''
	return {
		category_id,
		name,
		icon: visual ? visual.icon : fallbackIcon,
	}
}

export default {
	components: { LoginGuard, QfImageCropper },
	data() {
		return {
			avatarTempPath: '',
			/** 编辑模式：已有头像地址（未重新裁剪时直接沿用） */
			avatarUrl: '',
			/** 编辑模式：被编辑的小队 ID */
			isEdit: false,
			squadId: '',
			/** 头像裁剪状态 */
			showCropper: false,
			cropperImg: '',
			cropCanceled: false,
			submitting: false,
			unitName: '',
			unitIntro: '',
			unitIntroMaxLen: UNIT_INTRO_MAX_LEN,
			/** 与计数条同步，避免部分端 computed 不随 :value 输入刷新 */
			nameWidthUsed: 0,
			nameWidthMax: SQUAD_NAME_MAX_WIDTH,
			/** 受控 input 缩短时部分端原生不刷新，变更 key 强制重建以显示截断结果 */
			nameInputKey: 0,
			/** 分类选项与当前选中分类 */
			categoryOptions: [],
			squadCategoryId: null,
			squadCategoryName: '',
			/** 所在城市（省/市/区） */
			city: MOCK_INDEX_INITIAL_CITY,
			region: [...MOCK_INDEX_INITIAL_REGION],
			/** 是否需要队长审核入队申请 */
			needReview: true,
			/** 来源页面标识：create-activity=从创建活动页进入，创建成功后回填所选小队 */
			fromScene: '',
			_lastSquadWidthToastAt: 0,
		}
	},
	computed: {
		/** 头像预览：优先使用新裁剪的本地图，其次沿用后端返回的已有头像 */
		avatarPreview() {
			return this.avatarTempPath || this.avatarUrl
		},
		/** 展示「城市 · 区县」 */
		displayCity() {
			const district = Array.isArray(this.region) ? this.region[2] : ''
			return district && this.city ? `${this.city} · ${district}` : this.city
		},
	},
	async created() {
		await this.loadCategories()
	},
	/** 记录来源页面，并兜底校验登录态（防止通过 URL / 分享直接进入） */
	onLoad(options) {
		this.fromScene = (options && options.from) || ''
		// 带 squadId 进入即为编辑模式，表单数据全部以后端详情为准
		const squadId = options && options.squadId ? String(options.squadId) : ''
		if (squadId) {
			this.isEdit = true
			this.squadId = squadId
			this.loadSquadForEdit(squadId)
		}
		this.$nextTick(() => {
			if (this.$refs.loginGuard) {
				this.$refs.loginGuard.ensureLogin({ loginMode: 'redirectTo' })
			}
		})
	},
	methods: {
		/** 返回上一页，无页面栈时回到首页 */
		onBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.reLaunch({ url: '/pages/user/user' })
			}
		},
		/**
		 * 编辑模式：拉取小队详情并回填表单。
		 * 名称、简介、分类、入队审核状态均以 GET /api/v1/squads/:id 返回的数据为准。
		 * @param {string|number} id 小队 ID
		 */
		async loadSquadForEdit(id) {
			try {
				const data = await fetchSquadDetail(id)
				if (!data) return
				this.unitName = data.squad_name || data.name || ''
				this.unitIntro = data.intro || ''
				this.squadCategoryId = data.category_id ? Number(data.category_id) : null
				this.needReview = Number(data.join_type) === 1
				this.avatarUrl = data.squad_avatar || data.avatar || ''
				this.syncNameWidthUsed()
				this.nameInputKey += 1
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '小队信息加载失败',
					icon: 'none',
				})
			}
		},
		/** 拉取小队分类选项 */
		async loadCategories() {
			try {
				const list = await fetchCategories()
				if (Array.isArray(list) && list.length) {
					this.categoryOptions = list.map(normalizeCategory).filter(Boolean)
				}
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '分类加载失败',
					icon: 'none',
				})
			}
		},
		/** 选择分类：再次点击可取消选中 */
		onSelectCategory(item) {
			if (this.squadCategoryId === item.category_id) {
				this.squadCategoryId = null
				this.squadCategoryName = ''
				return
			}
			this.squadCategoryId = item.category_id
			this.squadCategoryName = item.name
		},
		/** 地区选择：更新城市与地区 */
		onRegionChange(e) {
			const value = (e && e.detail && e.detail.value) || []
			if (!Array.isArray(value) || value.length < 2) return
			this.region = value
			this.city = value[1] ? String(value[1]).replace(/市$/, '') : this.city
		},
		/** H5 端没有 region 选择器，点击仅提示（小程序/App 由 picker 接管） */
		onCityTap() {
			// #ifdef H5
			uni.showToast({ title: 'H5 端暂不支持城市选择', icon: 'none' })
			// #endif
		},
		/**
		 * uni-app：小程序常见 e.detail.value；H5 常见 e.target.value；
		 * 少数封装会挂在 mpEvent / nativeEvent。
		 */
		readInputValue(e) {
			if (!e) return ''
			const pick = (v) => {
				if (v === undefined || v === null) return null
				const s = String(v)
				return s === 'undefined' ? null : s
			}
			const detailVal = () => {
				const d = e.detail
				if (d == null) return null
				if (typeof d === 'string') return pick(d)
				return pick(d.value)
			}
			const chain = [
				detailVal,
				() => pick(e.mpEvent && e.mpEvent.detail && e.mpEvent.detail.value),
				() => pick(e.nativeEvent && e.nativeEvent.detail && e.nativeEvent.detail.value),
				() => pick(e.target && e.target.value),
				() => pick(e.currentTarget && e.currentTarget.value),
			]
			for (const get of chain) {
				const s = get()
				if (s !== null) return s
			}
			return ''
		},
		/** 同步当前名称的显示宽度计数 */
		syncNameWidthUsed() {
			this.nameWidthUsed = squadNameDisplayWidth(this.unitName || '')
		},
		/** 名称输入处理：过滤非法字符、超宽截断并同步计数 */
		onUnitNameInput(e) {
			const raw = this.readInputValue(e)
			// blur/change 在部分端无 detail.value，若仍绑定会误把名称清空，导致计数与截断「不生效」
			const t = e && e.type
			if (
				raw === '' &&
				(t === 'blur' || t === 'change') &&
				String(this.unitName || '').length > 0
			) {
				this.syncNameWidthUsed()
				return
			}
			const onlyValid = stripInvalidSquadChars(raw)
			const w = squadNameDisplayWidth(onlyValid)
			if (w > SQUAD_NAME_MAX_WIDTH) {
				this.maybeToastSquadMaxWidth()
			}
			const next = clampSquadName(raw)
			this.unitName = next
			this.syncNameWidthUsed()
			const needRemount = raw !== onlyValid || next !== onlyValid
			if (needRemount) {
				this.nameInputKey += 1
			}
		},
		onUnitIntroInput(e) {
			let s = this.readInputValue(e)
			if (s.length > UNIT_INTRO_MAX_LEN) {
				s = s.slice(0, UNIT_INTRO_MAX_LEN)
			}
			this.unitIntro = s
		},
		/** 名称超宽时提示（带间隔防抖） */
		maybeToastSquadMaxWidth() {
			const now = Date.now()
			if (now - this._lastSquadWidthToastAt < SQUAD_NAME_TOAST_GAP_MS) return
			this._lastSquadWidthToastAt = now
			uni.showToast({ title: '已达最大宽度，已截断', icon: 'none' })
		},
		/** 选择头像：统一选图后进入 1:1 裁剪，裁剪结果仅作本地预览 */
		async selectAvatar() {
			const path = await pickSingleImage()
			if (!path) return
			this.cropCanceled = false
			this.cropperImg = path
			this.showCropper = true
		},
		/** 取消裁剪并复位状态 */
		cancelCrop() {
			this.cropCanceled = true
			if (this.$refs.cropper && this.$refs.cropper.resetData) {
				this.$refs.cropper.resetData()
			}
			this.showCropper = false
			this.cropperImg = ''
		},
		/** 裁剪完成：更新本地预览，提交时再上传 COS */
		onCropperCrop(e) {
			if (this.cropCanceled) return
			const tempFilePath = e && e.tempFilePath
			this.showCropper = false
			this.cropperImg = ''
			this.cropCanceled = false
			if (tempFilePath) {
				this.avatarTempPath = tempFilePath
				uni.showToast({ title: '头像已更新，提交后生效', icon: 'none' })
			}
		},
		/** 提交表单：创建模式 POST /api/v1/squads，编辑模式 POST /api/v1/squads/:id/update */
		async onSubmit() {
			if (this.submitting) return
			if (
				!this.$refs.loginGuard.ensureLogin({
					content: this.isEdit ? '登录后即可编辑小队' : '登录后即可创建小队',
				})
			) return
			// 创建必须新选头像；编辑时已有头像可直接沿用
			if (!this.avatarPreview) {
				uni.showToast({ title: '请先选择并裁剪头像', icon: 'none' })
				return
			}
			const name = (this.unitName || '').trim()
			if (!name) {
				uni.showToast({ title: '请填写小队名称', icon: 'none' })
				return
			}
			if (squadNameDisplayWidth(name) > SQUAD_NAME_MAX_WIDTH) {
				uni.showToast({ title: '小队名称超出长度限制', icon: 'none' })
				return
			}
			const intro = this.unitIntro || ''
			if (intro.length > UNIT_INTRO_MAX_LEN) {
				uni.showToast({ title: `简介最多 ${UNIT_INTRO_MAX_LEN} 个字符`, icon: 'none' })
				return
			}

			this.submitting = true
			uni.showLoading({ title: this.isEdit ? '保存中...' : '提交中...', mask: true })

			// 1. 仅在重新选择头像时上传到临时目录；编辑未换头像则跳过
			let avatarTempKey = ''
			if (this.avatarTempPath) {
				try {
					const uploaded = await uploadTempAvatar(this.avatarTempPath)
					avatarTempKey = uploaded.key
				} catch (e) {
					uni.hideLoading()
					this.submitting = false
					uni.showToast({
						title: (e && e.message) || '头像上传失败，请重试',
						icon: 'none',
					})
					return
				}
			}

			// 2. 编辑：更新基础信息，后端在事务内转存新头像并按需清理旧头像
			if (this.isEdit) {
				try {
					const payload = {
						name,
						intro,
						category_id: this.squadCategoryId || 0,
					}
					if (avatarTempKey) payload.avatar_temp_key = avatarTempKey
					await updateSquad(this.squadId, payload)
					uni.hideLoading()
					uni.showToast({ title: '已保存', icon: 'success' })
					setTimeout(() => this.onBack(), 600)
				} catch (e) {
					uni.hideLoading()
					this.submitting = false
					uni.showToast({
						title: (e && e.message) || '保存失败',
						icon: 'none',
					})
				}
				return
			}

			// 3. 创建小队：后端在事务内插入记录并转存头像，任一步失败都会整体回滚
			try {
				const created = await createSquad({
					name,
					avatar_temp_key: avatarTempKey,
					intro,
					category_id: this.squadCategoryId || 0,
					// 0=自由加入，1=需队长审核
					join_type: this.needReview ? 1 : 0,
				})
				// 从创建活动页进入时，把新小队暂存起来，返回后自动回填
				if (this.fromScene === 'create-activity' && created) {
					const createdId = created.squad_id != null ? created.squad_id : created.id
					if (createdId != null) {
						try {
							uni.setStorageSync(PENDING_SQUAD_SELECTION_KEY, {
								squad_id: createdId,
								name: created.squad_name || created.name || name,
							})
						} catch (_) {}
					}
				}
				uni.hideLoading()
				uni.showToast({ title: '创建成功', icon: 'success' })
				setTimeout(() => this.onBack(), 600)
			} catch (e) {
				uni.hideLoading()
				this.submitting = false
				uni.showToast({
					title: (e && e.message) || '创建失败',
					icon: 'none',
				})
			}
		},
	},
}
</script>

<style scoped>
.pageRoot {
	position: fixed;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	flex-direction: column;
	background: #f5f5f6;
}

/* 顶栏 */
.navBar {
	position: relative;
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 4rpx;
	padding-top: var(--status-bar-height, 50rpx);
	height: 88rpx;
	box-sizing: content-box;
	padding-left: 20rpx;
	padding-right: 24rpx;
	background: #f5f5f6;
}

.backBtn {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.backBtn:active {
	opacity: 0.7;
}

.navTitle {
	font-size: 36rpx;
	font-weight: 700;
	color: #1f1f1f;
	letter-spacing: 0.5rpx;
}

/* 表单滚动区 */
.formScroll {
	flex: 1;
	height: 0;
	min-height: 0;
	padding: 8rpx 24rpx 0;
	box-sizing: border-box;
}

.card {
	background: #ffffff;
	border-radius: 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.04);
	border: 1rpx solid rgba(0, 0, 0, 0.03);
}

.cardTitle {
	display: block;
	font-size: 30rpx;
	font-weight: 600;
	color: #1f1f1f;
}

/* 头像 */
.avatarCard {
	display: flex;
	flex-direction: column;
	align-items: center;
	padding: 44rpx 0 30rpx;
}

.avatarBox {
	position: relative;
	width: 176rpx;
	height: 176rpx;
	border-radius: 36rpx;
	background: linear-gradient(135deg, #ffa271 0%, #f2607a 48%, #9b5ce0 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-sizing: border-box;
}

.avatarBox--hover {
	opacity: 0.9;
}

.avatarBox.hasAvatar {
	box-shadow: 0 10rpx 24rpx rgba(0, 0, 0, 0.1);
}

.avatarImg {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	border-radius: 36rpx;
}

.cameraBadge {
	position: absolute;
	right: -10rpx;
	bottom: -10rpx;
	width: 48rpx;
	height: 48rpx;
	border-radius: 50%;
	background: #ff3b30;
	border: 4rpx solid #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 6rpx 14rpx rgba(255, 59, 48, 0.28);
}

.avatarLabel {
	margin-top: 20rpx;
	font-size: 24rpx;
	color: #8a8a8a;
}

/* 名称 / 城市 / 审核 行 */
.rowCard {
	padding: 0 28rpx;
}

.rowLine {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-height: 108rpx;
}

.rowLabel {
	font-size: 30rpx;
	font-weight: 600;
	color: #1f1f1f;
	flex-shrink: 0;
}

/* 入队审核暂不可编辑：整行置灰 */
.rowLineDisabled {
	opacity: 0.45;
}

.rowInput {
	flex: 1;
	width: auto;
	min-width: 0;
	height: 88rpx;
	font-size: 28rpx;
	color: #1f1f1f;
	text-align: right;
	background: transparent;
}

.fieldPh {
	color: #b3b3b3;
	font-size: 26rpx;
}

.rowValue {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	color: #1f1f1f;
	text-align: right;
	overflow: hidden;
	white-space: nowrap;
	text-overflow: ellipsis;
}

.rowHint {
	font-size: 26rpx;
	color: #b3b3b3;
	text-align: right;
	flex: 1;
	min-width: 0;
}

.chevron {
	font-size: 34rpx;
	color: #c8c8c8;
	font-weight: 300;
	line-height: 1;
	flex-shrink: 0;
}

.rowDivider {
	height: 1rpx;
	background: #f2f2f2;
}

.nameFoot {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 16rpx;
	padding-bottom: 18rpx;
}

.nameHint {
	flex: 1;
	min-width: 0;
	font-size: 22rpx;
	line-height: 32rpx;
	color: #b3b3b3;
}

.nameCount {
	flex-shrink: 0;
	font-size: 22rpx;
	line-height: 32rpx;
	color: #b3b3b3;
}

.switchWrap {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	transform: scale(0.82);
	transform-origin: right center;
}

/* 简介 */
.introCard {
	padding: 28rpx;
}

.introInput {
	width: 100%;
	box-sizing: border-box;
	min-height: 132rpx;
	margin-top: 18rpx;
	font-size: 27rpx;
	line-height: 46rpx;
	color: #1f1f1f;
	background: transparent;
}

.introFoot {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
	margin-top: 6rpx;
}

.introLimit {
	font-size: 22rpx;
	color: #b3b3b3;
}

.introCount {
	font-size: 22rpx;
	color: #b3b3b3;
}

/* 分类 */
.catCard {
	padding: 28rpx 24rpx 24rpx;
}

.catGrid {
	display: flex;
	flex-wrap: wrap;
	gap: 16rpx;
	margin-top: 22rpx;
}

.catItem {
	width: calc((100% - 32rpx) / 3);
	box-sizing: border-box;
	padding: 20rpx 0 16rpx;
	border-radius: 20rpx;
	border: 2rpx solid #f0f0f0;
	background: #fafafa;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 12rpx;
}

.catItem:active {
	opacity: 0.85;
}

.catItemActive {
	border-color: #ff3b30;
	background: #fff5f4;
	box-shadow: 0 8rpx 20rpx rgba(255, 59, 48, 0.12);
}

.catIconBox {
	width: 80rpx;
	height: 80rpx;
	border-radius: 18rpx;
	background: #ffffff;
	border: 1rpx solid rgba(0, 0, 0, 0.04);
	display: flex;
	align-items: center;
	justify-content: center;
}

.catIcon {
	width: 52rpx;
	height: 52rpx;
}

.catFallback {
	font-size: 30rpx;
	color: #999999;
}

.catName {
	font-size: 24rpx;
	color: #333333;
}

.catItemActive .catName {
	color: #ff3b30;
	font-weight: 600;
}

/* 裁剪浮层取消按钮 */
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

.scrollBottomPad {
	height: 12rpx;
}

/* 底部操作栏 */
.footer {
	flex-shrink: 0;
	padding: 16rpx 28rpx 20rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
	background: #f5f5f6;
}

.primary {
	height: 96rpx;
	border-radius: 999rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	box-shadow: 0 14rpx 32rpx rgba(255, 59, 48, 0.26);
}

.primary--hover {
	opacity: 0.94;
}

.primaryTxt {
	font-size: 32rpx;
	font-weight: 700;
	color: #ffffff;
}
</style>
