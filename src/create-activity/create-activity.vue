<template>
	<view class="pageRoot" v-if="showActivityModal">
		<view class="backdrop"></view>
		<view class="sheet">
			<view class="sheetGrabBar"></view>

			<view class="sheetHeader">
				<view class="headerTopRow">
					<view class="headerTitles">
						<text class="headerTitle">发布活动</text>
					</view>
					<view class="closeBtn" @click="closeActivityModal">
						<text class="closeBtnText">✕</text>
					</view>
				</view>
				<view class="headerAccent"></view>
			</view>

			<!-- scroll-view 在小程序端必须设置明确高度，否则内部 input/editor 无法正常使用 -->
			<scroll-view
				scroll-y
				class="sheetScroll"
				:style="{ height: scrollAreaPx + 'px' }"
				:show-scrollbar="false"
				:enable-flex="true"
			>
				<!-- 封面 -->
				<view class="sectionCard coverCard">
					<view class="sectionHead">
						<text class="sectionTag">活动封面</text>
						<!-- <text class="sectionTitle">活动封面</text> -->
					</view>
					<view
						class="coverPlaceholder"
						:class="{ hasCover: !!coverTempPath }"
						@click="selectCoverImage"
					>
						<image
							v-if="coverTempPath"
							class="coverPreview"
							:src="coverTempPath"
							mode="aspectFill"
						/>
						<view v-if="coverTempPath" class="coverChangeTip">
							<text class="coverChangeTipText">点击更换封面</text>
						</view>
						<view v-else class="coverInner">
							<view class="coverIconWrap">
								<text class="coverGlyph">＋</text>
							</view>
							<text class="coverHint">点击上传封面图</text>
							<text class="coverSub">建议比例 4:5，更清晰更易被推荐</text>
						</view>
					</view>
				</view>

				<!-- 活动详情：区块标识 -->
				<view class="sectionHead sectionHeadOuter">
					<text class="sectionTag">活动详情</text>
				</view>

				<!-- 所在小队 / 发布圈子：合并为一个卡片 -->
				<view class="sectionCard rowCard">
					<view class="rowLine" @tap="onPickSquad">
						<text class="rowLabel">所在小队</text>
						<text class="rowValue isPlaceholder">请选择你的小队</text>
						<text class="chevron">›</text>
					</view>

					<view class="rowDivider"></view>

					<picker mode="selector" :range="typeOptions" range-key="category_name" @change="onTypePickerChange">
						<view class="rowLine">
							<text class="rowLabel">活动分类</text>
							<text :class="['rowValue', !activityForm.category_name && 'isPlaceholder']">
								{{ activityForm.category_name || '请选择活动分类' }}
							</text>
							<text class="chevron">›</text>
						</view>
					</picker>
				</view>

				<!-- 活动名称 / 活动时间 / 活动地点：合并为一个卡片 -->
				<view class="sectionCard rowCard">
					<view class="rowLine">
						<text class="rowLabel">活动名称</text>
						<input
							class="rowInput"
							placeholder="给活动起个名字"
							placeholder-class="fieldPh"
							v-model="activityForm.title"
							:adjust-position="true"
						/>
					</view>

					<view class="rowDivider"></view>

					<view class="rowLine">
						<text class="rowLabel">活动时间</text>
						<input
							class="rowInput"
							placeholder="请输入或选择活动时间"
							placeholder-class="fieldPh"
							v-model="activityForm.time_text"
							:adjust-position="true"
						/>
					</view>
					<view class="timeChips">
						<picker mode="date" :value="timeDatePart" @change="onDatePickerChange">
							<view class="timeChip"><text class="timeChipText">选日期</text></view>
						</picker>
						<picker mode="time" :value="timeClockPart" @change="onTimePickerChange">
							<view class="timeChip"><text class="timeChipText">选时刻</text></view>
						</picker>
					</view>

					<view class="rowDivider"></view>

					<view class="rowLine">
						<text class="rowLabel">活动地点</text>
						<input
							class="rowInput"
							placeholder="城市、场馆或线上链接"
							placeholder-class="fieldPh"
							v-model="activityForm.location_text"
							:adjust-position="true"
						/>
					</view>
				</view>

				<!-- 门票与人数 -->
				<view class="sectionCard feeCard">
					<text class="feeTitle">门票与人数</text>
					<view class="feeToggle">
						<view class="feeTab" :class="{ feeTabActive: feeMode === 'free' }" @tap="setFeeMode('free')">
							免费
						</view>
						<view class="feeTab" :class="{ feeTabActive: feeMode === 'paid' }" @tap="setFeeMode('paid')">
							收费
						</view>
					</view>
					<view v-if="feeMode === 'paid'" class="feeRow">
						<text class="rowLabel">人均票价</text>
						<text class="priceUnit">¥</text>
						<input
							class="rowInput"
							placeholder="请输入票价"
							placeholder-class="fieldPh"
							v-model="activityForm.fee_note"
							type="number"
							:adjust-position="true"
						/>
					</view>
					<view class="feeRow">
						<text class="rowLabel">人数上限</text>
						<text class="feeLimit">20 人</text>
					</view>
				</view>

				<view class="sectionCard descCard">
					<view class="sectionHead">
						<text class="sectionTag">活动介绍</text>
						<!-- <text class="sectionTitle">活动描述</text> -->
					</view>
					<editor
						id="descEditor"
						class="formEditor"
						placeholder="详细说明流程、注意事项，支持配图"
						show-img-size
						show-img-toolbar
						show-img-resize
						@ready="onEditorReady"
						@input="onDescInput"
					></editor>
					<button class="insertImgBtn" type="default" @click="insertDescImage">插入图片</button>
				</view>

				<view class="scrollBottomPad"></view>
			</scroll-view>

			<view class="sheetFooter safeFooter">
				<button class="draftBtn" @click="saveDraft">存入草稿</button>
				<button class="submitBtn" @click="submitActivity">发布活动</button>
			</view>
		</view>

		<!-- 登录拦截组件：统一处理登录态校验与登录提示弹窗 -->
		<LoginGuard
			ref="loginGuard"
			content="请先登录后再发布活动"
			@cancel="onLoginCancel"
		/>
	</view>
</template>

<script>
import { createActivity } from '@/api/modules/activity.js'
import { fetchCategories } from '@/api/modules/category.js'
import LoginGuard from '@/components/login-guard.vue'

/** 活动草稿在本地缓存中的键名 */
const ACTIVITY_DRAFT_KEY = 'hiGoActivityDraft'

export default {
	components: { LoginGuard },
	data() {
		return {
			showActivityModal: true,
			scrollAreaPx: 480,
			/** 登录拦截触发场景：guard=进入页面拦截，publish=发布拦截 */
			loginScene: '',
			typeOptions: [],
			timeDatePart: '',
			timeClockPart: '',
			coverTempPath: '',
			feeMode: 'free',
			activityForm: {
				title: '',
				category_name: '',
				category_id: '',
				time_text: '',
				location_text: '',
				fee_note: '',
				description: '',
				cover: '',
			},
			editorCtx: null,
		}
	},
	/** 页面创建：加载活动类型选项 */
	async created() {
		await this.loadTypeOptions()
	},
	/** 页面加载：兜底校验登录态（防止通过 URL/分享/页面栈等方式直接进入） */
	onLoad() {
		let userId = ''
		let userInfo = null
		try {
			userId = uni.getStorageSync('userId')
			userInfo = uni.getStorageSync('userInfo')
		} catch (_) {}
		if (userId || userInfo) return
		this.loginScene = 'guard'
		this.$nextTick(() => {
			if (this.$refs.loginGuard) {
				this.$refs.loginGuard.ensureLogin({ loginMode: 'redirectTo' })
			}
		})
	},
	/** 页面首次渲染完成：根据窗口与安全区计算滚动区高度 */
	onReady() {
		this.updateScrollAreaHeight()
		// 首次测量可能早于布局完成，稍后重测一次，保证底部操作栏贴底且留出边距
		setTimeout(() => {
			this.updateScrollAreaHeight()
		}, 100)
	},
	methods: {
		/** 根据实际渲染尺寸计算滚动区高度，保证底部操作栏贴住屏幕底边 */
		updateScrollAreaHeight() {
			try {
				const sys = uni.getSystemInfoSync()
				const winH = sys.windowHeight || sys.screenHeight || 667
				const winW = sys.windowWidth || 375
				const rpx2px = winW / 750
				const safeTop =
					sys.safeAreaInsets && typeof sys.safeAreaInsets.top === 'number'
						? sys.safeAreaInsets.top
						: typeof sys.statusBarHeight === 'number'
							? sys.statusBarHeight
							: 0
				// 与 .sheet 顶距一致：安全区顶 + 少量留白（px）
				const sheetTopGap = safeTop + 16
				// 测量失败时的兜底估算（px 转 rpx 后计算）
				const fallback = () => {
					const safeBottom =
						sys.safeAreaInsets && typeof sys.safeAreaInsets.bottom === 'number'
							? sys.safeAreaInsets.bottom
							: 0
					const chromeRpx = 310
					this.scrollAreaPx = Math.max(
						320,
						Math.floor(winH - sheetTopGap - Math.ceil(chromeRpx * rpx2px) - safeBottom)
					)
				}
				const query = uni.createSelectorQuery().in(this)
				query.select('.sheetGrabBar').boundingClientRect()
				query.select('.sheetHeader').boundingClientRect()
				query.select('.sheetFooter').boundingClientRect()
				query.exec((res) => {
					const grab = res && res[0]
					const header = res && res[1]
					const footer = res && res[2]
					if (!header || !footer || !header.height || !footer.height) {
						fallback()
						return
					}
					// 抓手条上下外边距 16rpx + 8rpx，boundingClientRect 不含 margin
					const grabH = (grab && grab.height ? grab.height : 0) + 24 * rpx2px
					const chrome = header.height + footer.height + grabH
					this.scrollAreaPx = Math.max(240, Math.floor(winH - sheetTopGap - chrome))
				})
			} catch (e) {
				this.scrollAreaPx = 480
			}
		},
		/** 根据已选日期、时刻同步到输入框：避免「先选日期再选时刻」时把整段日期+时刻再次拼接导致日期重复 */
		mergeDateTimeIntoForm() {
			const d = (this.timeDatePart || '').trim()
			const t = (this.timeClockPart || '').trim()
			if (d && t) {
				this.activityForm.time_text = `${d} ${t}`
				return
			}
			if (d && !t) {
				this.activityForm.time_text = d
				return
			}
			if (!d && t) {
				const cur = (this.activityForm.time_text || '').trim()
				// 当前内容仅为日期时，只补上时刻
				if (/^\d{4}-\d{2}-\d{2}$/.test(cur)) {
					this.activityForm.time_text = `${cur} ${t}`
					return
				}
				this.activityForm.time_text = cur ? `${cur} ${t}`.trim() : t
			}
		},
		/** 拉取活动分类并映射为 picker 选项 */
		async loadTypeOptions() {
			try {
				const list = await fetchCategories()
				// console.log(list)
				if (Array.isArray(list) && list.length) {
					this.typeOptions = list
						.map((item) => ({
							category_id: item.category_id != null ? item.category_id : item.id,
							category_name: item.text || item.category_name || '',
						}))
						.filter((item) => item.category_id != null && item.category_name)
				}
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '分类加载失败',
					icon: 'none',
				})
			}
		},
		onTypePickerChange(e) {
			// console.log(e);	
			const i = Number(e.detail.value)
			const opt = this.typeOptions[i]
			// console.log(opt)
			if (!opt) return
			this.activityForm.category_name = opt.category_name
			this.activityForm.category_id = opt.category_id
		},
		/** 日期选择：记录日期并同步到输入框 */
		onDatePickerChange(e) {
			this.timeDatePart = e.detail.value || ''
			this.mergeDateTimeIntoForm()
		},
		/** 时刻选择：记录时间并同步到输入框 */
		onTimePickerChange(e) {
			this.timeClockPart = e.detail.value || ''
			this.mergeDateTimeIntoForm()
		},
		/** 选择所在小队：小队列表接口未接入，暂以提示占位 */
		onPickSquad() {
			uni.showToast({ title: '小队列表暂未开放', icon: 'none' })
		},
		/** 门票模式切换：免费时费用置 0，收费时清空待填 */
		setFeeMode(mode) {
			if (this.feeMode === mode) return
			this.feeMode = mode
			if (mode === 'free') {
				this.activityForm.fee_note = '0'
			} else if (this.activityForm.fee_note === '0') {
				this.activityForm.fee_note = ''
			}
		},
		/** 关闭弹窗并返回用户页 */
		closeActivityModal() {
			uni.navigateTo({
				url: '/pages/user/user',
			})
		},
		/** 取消发布：关闭弹窗并返回首页 */
		cancelActivityModal() {
			uni.navigateTo({
				url: '/pages/index/index',
			})
		},
		/** 登录提示弹窗点取消：直接进入拦截需回首页，发布拦截则关闭发布面板 */
		onLoginCancel() {
			if (this.loginScene === 'guard') {
				uni.redirectTo({ url: '/pages/index/index' })
				return
			}
			this.cancelActivityModal()
		},
		/** 选择活动封面图片 */
		selectCoverImage() {
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed', 'original'],
				sourceType: ['album', 'camera'],
				success: (res) => {
					const path = res.tempFilePaths && res.tempFilePaths[0]
					if (path) {
						this.coverTempPath = path
						this.activityForm.cover = path
					}
				},
				fail: (err) => {
					const msg = (err && err.errMsg) || ''
					if (msg.includes('cancel') || msg.includes('取消')) return
					uni.showToast({ title: '选择图片失败', icon: 'none' })
				},
			})
		},
		/** 编辑器就绪：获取编辑器上下文并回填已有内容 */
		onEditorReady() {
			uni.createSelectorQuery()
				.in(this)
				.select('#descEditor')
				.context((res) => {
					this.editorCtx = res.context
					if (this.activityForm.description) {
						this.editorCtx.setContents({ html: this.activityForm.description })
					}
				})
				.exec()
		},
		/** 描述输入：同步编辑器内容到表单 */
		onDescInput(e) {
			this.activityForm.description = e.detail.html || ''
		},
		/** 在编辑器中插入所选图片 */
		insertDescImage() {
			if (!this.editorCtx) {
				uni.showToast({ title: '编辑器尚未就绪', icon: 'none' })
				return
			}
			uni.chooseImage({
				count: 1,
				sizeType: ['compressed'],
				success: (res) => {
					const filePath = res.tempFilePaths && res.tempFilePaths[0]
					if (filePath) {
						this.editorCtx.insertImage({
							src: filePath,
							alt: '活动图片',
						})
					}
				},
				fail: () => {
					uni.showToast({ title: '选择图片失败', icon: 'none' })
				},
			})
		},
		/** 保存当前表单为本地草稿 */
		saveDraft() {
			const draft = {
				...this.activityForm,
				timeDatePart: this.timeDatePart,
				timeClockPart: this.timeClockPart,
				coverTempPath: this.coverTempPath,
				savedAt: Date.now(),
			}
			try {
				uni.setStorageSync(ACTIVITY_DRAFT_KEY, draft)
				uni.showToast({ title: '草稿已保存', icon: 'success' })
			} catch (e) {
				uni.showToast({ title: '草稿保存失败', icon: 'none' })
			}
		},
		/** 校验并提交活动，成功后重置表单 */
		async submitActivity() {
			// 发布活动前先校验登录态：未登录则提示并跳转登录页
			let userId = ''
			let userInfo = null
			try {
				userId = uni.getStorageSync('userId')
				userInfo = uni.getStorageSync('userInfo')
			} catch (_) {}
			if (!userId && !userInfo) {
				this.loginScene = 'publish'
				if (!this.$refs.loginGuard.ensureLogin({ loginMode: 'navigateTo' })) return
			}
			const title = (this.activityForm.title || '').trim()
			if (!title) {
				uni.showToast({ title: '请填写活动标题', icon: 'none' })
				return
			}
			try {
				await createActivity({ ...this.activityForm })
				uni.showToast({ title: '发布成功', icon: 'success' })
				this.timeDatePart = ''
				this.timeClockPart = ''
				this.coverTempPath = ''
				this.activityForm = {
					title: '',
					category_name: '',
					category_id: '',
					time_text: '',
					location_text: '',
					fee_note: '',
					description: '',
					cover: '',
				}
				console.log('[HiGo] 发布活动表单 activityForm =>', this.activityForm)
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '发布失败',
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
	z-index: 999;
}

.backdrop {
	position: absolute;
	inset: 0;
	background: rgba(0, 0, 0, 0.45);
}

.sheet {
	position: absolute;
	left: 0;
	right: 0;
	/* 贴近全屏高度，顶部仅留安全区 + 一点空隙 */
	top: calc(16px + constant(safe-area-inset-top));
	top: calc(16px + env(safe-area-inset-top, 0px));
	/* 贴屏幕底边，避免整块面板上浮导致按钮离屏底过远；底部安全区由 footer 内边距承担 */
	bottom: 0;
	background: #f5f5f6;
	border-radius: 28rpx 28rpx 0 0;
	box-shadow: 0 -12rpx 48rpx rgba(0, 0, 0, 0.1), 0 16rpx 40rpx rgba(0, 0, 0, 0.05);
	display: flex;
	flex-direction: column;
	overflow: hidden;
	border: 2rpx solid rgba(255, 255, 255, 0.95);
}

.sheetGrabBar {
	align-self: center;
	width: 72rpx;
	height: 8rpx;
	border-radius: 999rpx;
	background: rgba(0, 0, 0, 0.12);
	margin-top: 16rpx;
	margin-bottom: 8rpx;
}

.sheetHeader {
	position: relative;
	padding: 12rpx 28rpx 24rpx;
	flex-shrink: 0;
}

.headerTopRow {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 20rpx;
}

.headerTitles {
	flex: 1;
	min-width: 0;
}

.headerTitle {
	display: block;
	font-size: 38rpx;
	font-weight: 700;
	color: #1f1f1f;
	letter-spacing: 0.5rpx;
}


.closeBtn {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #ffffff;
	border: 2rpx solid rgba(0, 0, 0, 0.06);
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
}

.closeBtn:active {
	opacity: 0.85;
	transform: scale(0.96);
}

.closeBtnText {
	font-size: 28rpx;
	color: #333333;
	font-weight: 600;
	line-height: 1;
}

.headerAccent {
	position: absolute;
	left: 28rpx;
	right: 28rpx;
	bottom: 0;
	height: 6rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	opacity: 0.45;
}

.sheetScroll {
	width: 100%;
	/* 固定高度之外再用 flex 兜底：估算偏差时自动伸缩，避免把底部操作栏挤出面板 */
	flex: 1;
	min-height: 0;
	padding: 0 24rpx;
	box-sizing: border-box;
}

.sectionCard {
	position: relative;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 26rpx 24rpx 28rpx;
	margin-bottom: 22rpx;
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.05);
	border: 2rpx solid rgba(0, 0, 0, 0.03);
	/* 不要用 overflow:hidden，部分端上会影响原生 input / editor 聚焦与绘制 */
	overflow: visible;
}

.sectionCard::before {
	content: '';
	position: absolute;
	top: -50rpx;
	right: -36rpx;
	width: 140rpx;
	height: 140rpx;
	border-radius: 50%;
	background: radial-gradient(circle, rgba(255, 59, 48, 0.08) 0%, rgba(255, 59, 48, 0) 70%);
	pointer-events: none;
}

.sectionHead {
	margin-bottom: 22rpx;
	position: relative;
	z-index: 1;
}

.sectionTag {
	display: inline-flex;
	align-items: center;
	height: 40rpx;
	padding: 0 14rpx;
	border-radius: 20rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #ffffff;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	box-shadow: 0 8rpx 18rpx rgba(255, 59, 48, 0.22);
}

.sectionTitle {
	display: block;
	margin-top: 14rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #1f1f1f;
}

.coverPlaceholder {
	position: relative;
	z-index: 1;
	width: 100%;
	height: 280rpx;
	border-radius: 24rpx;
	overflow: hidden;
	border: none;
	background: linear-gradient(135deg, #ffa271 0%, #f2607a 48%, #9b5ce0 100%);
}

.coverPlaceholder:active {
	opacity: 0.92;
}

.coverPlaceholder.hasCover {
	box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.08);
}

.coverPreview {
	position: absolute;
	left: 0;
	top: 0;
	width: 100%;
	height: 100%;
	z-index: 0;
}

.coverChangeTip {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	z-index: 1;
	padding: 16rpx;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.55), transparent);
	display: flex;
	align-items: flex-end;
	justify-content: center;
	pointer-events: none;
}

.coverChangeTipText {
	font-size: 24rpx;
	color: #ffffff;
	font-weight: 600;
	text-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.35);
}

.coverInner {
	position: relative;
	z-index: 0;
	height: 100%;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 24rpx;
}

.coverIconWrap {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	background: #ffffff;
	border: none;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.12);
	display: flex;
	align-items: center;
	justify-content: center;
	margin-bottom: 18rpx;
}

.coverGlyph {
	font-size: 44rpx;
	font-weight: 300;
	color: #333333;
	line-height: 1;
}

.coverHint {
	font-size: 28rpx;
	font-weight: 600;
	color: #ffffff;
}

.coverSub {
	margin-top: 10rpx;
	font-size: 22rpx;
	color: rgba(255, 255, 255, 0.85);
	text-align: center;
	line-height: 32rpx;
}

.rowCard {
	padding: 0 28rpx;
}

.sectionCard.rowCard::before {
	display: none;
}

.sectionHeadOuter {
	margin: 4rpx 0 14rpx 6rpx;
}

.rowLine {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-height: 104rpx;
}

.rowLabel {
	font-size: 28rpx;
	font-weight: 500;
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
	font-size: 28rpx;
}

.rowValue {
	flex: 1;
	min-width: 0;
	font-size: 28rpx;
	color: #1f1f1f;
	text-align: right;
}

.rowValue.isPlaceholder {
	color: #b3b3b3;
}

.rowDivider {
	height: 1rpx;
	background: #f0f0f0;
}

.timeChips {
	display: flex;
	align-items: center;
	justify-content: flex-end;
	gap: 16rpx;
	padding-bottom: 22rpx;
	margin-top: -8rpx;
}

.timeChip {
	height: 56rpx;
	padding: 0 24rpx;
	border-radius: 999rpx;
	background: rgba(255, 59, 48, 0.06);
	border: 1rpx solid rgba(255, 59, 48, 0.16);
	display: flex;
	align-items: center;
}

.timeChipText {
	font-size: 24rpx;
	font-weight: 500;
	color: #ff3b30;
}

.chevron {
	font-size: 36rpx;
	color: #c8c8c8;
	font-weight: 300;
	transform: rotate(0deg);
	line-height: 1;
	flex-shrink: 0;
}

.priceUnit {
	font-size: 28rpx;
	font-weight: 700;
	color: #ff3b30;
	flex-shrink: 0;
}

.feeCard {
	padding: 28rpx;
}

.sectionCard.feeCard::before {
	display: none;
}

.feeTitle {
	display: block;
	font-size: 30rpx;
	font-weight: 700;
	color: #1f1f1f;
	margin-bottom: 24rpx;
}

.feeToggle {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 6rpx;
	border-radius: 16rpx;
	background: #f5f5f6;
}

.feeTab {
	flex: 1;
	height: 76rpx;
	line-height: 76rpx;
	text-align: center;
	font-size: 28rpx;
	color: #999999;
	border-radius: 12rpx;
}

.feeTabActive {
	background: #ff3b30;
	color: #ffffff;
	font-weight: 600;
}

.feeRow {
	display: flex;
	align-items: center;
	gap: 16rpx;
	min-height: 104rpx;
	margin-top: 8rpx;
	border-top: 1rpx solid #f0f0f0;
}

.feeLimit {
	margin-left: auto;
	font-size: 28rpx;
	color: #1f1f1f;
}

.formEditor {
	width: 100%;
	min-height: 220rpx;
	padding: 20rpx;
	border-radius: 22rpx;
	background: #f7f7f7;
	border: 2rpx solid rgba(0, 0, 0, 0.04);
	box-sizing: border-box;
	box-shadow: none;
}

.insertImgBtn {
	margin-top: 18rpx;
	height: 76rpx;
	line-height: 76rpx;
	padding: 0;
	font-size: 26rpx;
	font-weight: 600;
	color: #ff3b30;
	border: 2rpx solid rgba(255, 59, 48, 0.3);
	background: rgba(255, 59, 48, 0.06);
	border-radius: 999rpx;
	box-shadow: none;
}

.insertImgBtn::after {
	border: none;
}

.scrollBottomPad {
	height: 24rpx;
}

.sheetFooter {
	flex-shrink: 0;
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 28rpx 20rpx;
	padding-bottom: calc(20rpx + constant(safe-area-inset-bottom));
	padding-bottom: calc(20rpx + env(safe-area-inset-bottom, 0px));
	background: transparent;
	border-top: none;
}

.draftBtn {
	width: 200rpx;
	height: 84rpx;
	line-height: 84rpx;
	padding: 0;
	margin: 0;
	border-radius: 999rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: #333333;
	background: #ffffff;
	border: 2rpx solid rgba(0, 0, 0, 0.12);
	flex-shrink: 0;
}

.draftBtn::after {
	border: none;
}

.draftBtn:active {
	opacity: 0.9;
	transform: scale(0.99);
}

.submitBtn {
	flex: 1;
	width: auto;
	min-width: 0;
	height: 84rpx;
	line-height: 84rpx;
	padding: 0;
	margin: 0;
	border-radius: 999rpx;
	font-size: 32rpx;
	font-weight: 700;
	color: #ffffff;
	border: none;
	background: linear-gradient(150deg, #ff6a5c 0%, #ff3b30 58%, #f32a22 100%);
	box-shadow: 0 14rpx 32rpx rgba(255, 59, 48, 0.28);
}

.submitBtn::after {
	border: none;
}

.submitBtn:active {
	opacity: 0.94;
	transform: scale(0.99);
}
</style>
