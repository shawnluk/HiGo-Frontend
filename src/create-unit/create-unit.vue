<template>
	<view class="pageRoot">
		<!-- 自定义顶栏 -->
		<view class="navBar">
			<view class="backBtn" @click="onBack">
				<uni-icons type="left" size="22" color="#1f1f1f"></uni-icons>
			</view>
			<text class="navTitle">创建小队，与搭子一起玩</text>
		</view>

		<scroll-view scroll-y class="formScroll" :show-scrollbar="false">
			<!-- 小队头像 -->
			<view class="card avatarCard">
				<view
					class="avatarBox"
					:class="{ hasAvatar: !!avatarTempPath }"
					hover-class="avatarBox--hover"
					hover-stay-time="120"
					@tap="selectAvatar"
				>
					<image
						v-if="avatarTempPath"
						class="avatarImg"
						:src="avatarTempPath"
						mode="aspectFill"
					/>
					<uni-icons v-else type="staff-filled" size="56" color="#ffffff"></uni-icons>
					<view class="cameraBadge">
						<uni-icons type="camera-filled" size="14" color="#ffffff"></uni-icons>
					</view>
				</view>
				<text class="avatarLabel">{{ avatarTempPath ? '点击更换头像（待接入）' : '上传小队头像（待接入）' }}</text>
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

					<view class="catItem" @tap="onMoreCategory">
						<view class="catIconBox">
							<text class="catMorePlus">＋</text>
						</view>
						<text class="catName catMoreName">更多</text>
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

				<view class="rowLine">
					<text class="rowLabel">入队审核</text>
					<text class="rowHint">需主理人审核</text>
					<view class="switchWrap">
						<switch :checked="needReview" color="#ff3b30" @change="onReviewChange" />
					</view>
				</view>
			</view>

			<view class="scrollBottomPad"></view>
		</scroll-view>

		<view class="footer safeFooter">
			<view class="primary" hover-class="primary--hover" @tap="onSubmit">
				<text class="primaryTxt">{{ submitting ? '创建中...' : '创建小队' }}</text>
			</view>
		</view>

		<!-- 登录拦截组件：提交前统一校验登录态 -->
		<LoginGuard ref="loginGuard" content="登录后即可创建小队" />
	</view>
</template>

<script>
import { fetchCategories } from '@/api/modules/category.js'
import { createSquad } from '@/api/modules/user.js'
import LoginGuard from '@/components/login-guard.vue'
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
	return {
		category_id,
		name,
		icon: item.icon || item.icon_url || '',
	}
}

export default {
	components: { LoginGuard },
	data() {
		return {
			avatarTempPath: '',
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
			_lastSquadWidthToastAt: 0,
		}
	},
	computed: {
		/** 展示「城市 · 区县」 */
		displayCity() {
			const district = Array.isArray(this.region) ? this.region[2] : ''
			return district && this.city ? `${this.city} · ${district}` : this.city
		},
	},
	async created() {
		await this.loadCategories()
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
		/** 更多分类占位 */
		onMoreCategory() {
			uni.showToast({ title: '更多分类开发中', icon: 'none' })
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
		/** 切换入队审核 */
		onReviewChange(e) {
			this.needReview = Boolean(e && e.detail && e.detail.value)
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
		selectAvatar() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed', 'original'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const path = res.tempFilePaths && res.tempFilePaths[0]
					if (path) this.avatarTempPath = path
				},
				fail: (err) => {
					const msg = (err && err.errMsg) || ''
					if (msg.includes('cancel') || msg.includes('取消')) return
					uni.showToast({ title: '选择图片失败', icon: 'none' })
				},
			})
		},
		/** 提交创建小队：校验后调用 POST /api/v1/squads */
		async onSubmit() {
			if (this.submitting) return
			if (!this.$refs.loginGuard.ensureLogin({ content: '登录后即可创建小队' })) return
			if (!this.avatarTempPath) {
				uni.showToast({ title: '请先上传小队头像', icon: 'none' })
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
			try {
				await createSquad({
					name,
					// 头像上传接口待接入，暂按项目约定提交本地临时路径
					avatar: this.avatarTempPath,
					intro,
					category_id: this.squadCategoryId || 0,
					// 0=自由加入，1=需队长审核
					join_type: this.needReview ? 1 : 0,
				})
				uni.showToast({ title: '创建成功', icon: 'success' })
				setTimeout(() => this.onBack(), 600)
			} catch (e) {
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

.catMorePlus {
	font-size: 40rpx;
	line-height: 1;
	color: #b3b3b3;
	font-weight: 300;
}

.catName {
	font-size: 24rpx;
	color: #333333;
}

.catItemActive .catName {
	color: #ff3b30;
	font-weight: 600;
}

.catMoreName {
	color: #b3b3b3;
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
