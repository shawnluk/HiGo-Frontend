<template>
	<view class="page">
		<!-- 顶部导航：左侧返回 / 中间标题 / 右侧收藏 -->
		<view class="navBar" :style="{ paddingTop: statusBarPadding }">
			<view
				class="navRoundBtn"
				hover-class="navRoundBtn--pressed"
				hover-stay-time="120"
				@click="goBack"
			>
				<uni-icons type="left" size="18" color="#1f1f1f"></uni-icons>
			</view>
			<text class="navTitle">活动详情</text>
			<view
				class="navRoundBtn"
				hover-class="navRoundBtn--pressed"
				hover-stay-time="120"
				@click="onFavorite"
			>
				<uni-icons type="heart" size="18" color="#1f1f1f"></uni-icons>
			</view>
		</view>

		<scroll-view scroll-y class="scrollBody" :show-scrollbar="false">
			<!-- 头图 -->
			<view class="hero">
				<image class="heroImg" :src="detail.cover" mode="aspectFill" />
				<view class="heroMask"></view>
				<view class="heroChip">
					<text class="heroChipText">🔥 {{ detail.hot || 0 }} 热度</text>
				</view>
				<view class="heroBottom">
					<view v-if="tagLabel" class="tag">{{ tagLabel }}</view>
					<text class="heroTitle">{{ detail.title }}</text>
				</view>
			</view>

			<view class="sheet">
				<text class="statusLine">{{ statusHint }}</text>

				<view v-if="feeLine" class="feeCard">
					<text class="feeLabel">费用说明</text>
					<text class="feeValue">{{ feeLine }}</text>
				</view>

				<view class="timePill">
					<text class="timePillIco">⏰</text>
					<text class="timePillLabel">活动时间</text>
					<text class="timePillText">{{ displayTime }}</text>
				</view>

				<view class="locationPill">
					<text class="locationPillIco">📍</text>
					<text class="locationPillLabel">活动地点</text>
					<text class="locationPillText">{{ detail.location_text }}</text>
				</view>

				<view class="orgCard">
					<!-- 展示所属小队头像/名称（后端从小队表带出） -->
					<image class="orgAva" :src="detail.squad_avatar" mode="aspectFill" />
					<view class="orgText">
						<text class="orgLabel">主办方</text>
						<text class="orgName">{{ detail.squad_name }}</text>
					</view>
				</view>

				<view class="joinHead">
					<text class="joinTitle">已报名 {{ detail.joinCount }} 人</text>
				</view>
				<scroll-view scroll-x class="avaScroll" :show-scrollbar="false">
					<view class="avaRow">
						<image
							v-for="(ava, idx) in joinList"
							:key="idx"
							class="joinAva"
							:src="ava"
							mode="aspectFill"
						/>
					</view>
				</scroll-view>

				<view class="sectionHead">
					<text class="sectionTitle">活动说明</text>
				</view>
				<view class="detailBody">
					<text v-for="(line, i) in detailLines" :key="i" class="detailPara">{{ line }}</text>
				</view>

				<view class="hintCard">
					<text class="hintTitle">报名须知</text>
					<text class="hintLine">报名即表示同意遵守现场秩序与安全提示；如有变动以主办方通知为准。</text>
				</view>
			</view>
		</scroll-view>

		<view class="bottomBar" :style="{ paddingBottom: safeBottom }">
			<button class="ghostBtn" type="default" @click="onShare">分享</button>
			<button class="primaryBtn" type="default" @click="onRegister">立即报名</button>
		</view>
	</view>
</template>

<script setup>
import { computed, reactive } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchActivityDetail, reportActivityView } from '@/api/modules/activity.js'
import { updateCachedActivityHot } from '@/utils/activity-cache.js'

const actDetail = reactive({
	data: {},
})

/** 归一化活动数据，补齐默认字段并兼容不同的字段命名 */
function normalizeActivity(raw) {
	if (!raw || typeof raw !== 'object') return {}
	const joinAvatars = Array.isArray(raw.joinAvatars)
		? raw.joinAvatars
		: Array.isArray(raw.join_avatars)
			? raw.join_avatars
			: []
	return {
		...raw,
		cover: raw.cover || '',
		title: raw.title || '活动',
		location_text: raw.location_text || '',
		time_text: raw.time_text || '',
		squad_avatar: raw.squad_avatar || '',
		squad_name: raw.squad_name || '',
		joinCount: Number(raw.joinCount) || joinAvatars.length || 0,
		hot: Number(raw.hot != null ? raw.hot : raw.heat) || 0,
		joinAvatars,
		category_name: raw.category_name || '',
		description: raw.description || '',
		fee_note: raw.fee_note || '',
		category_id: raw.category_id,
		activity_id: raw.activity_id || raw.id || '',
	}
}

/** 将 ISO 时间字符串格式化为“年月日 时分”展示文案 */
function formatActivityTime(str) {
	if (!str || typeof str !== 'string') return ''
	const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
	if (!m) return str
	const y = m[1]
	const mo = Number(m[2])
	const d = Number(m[3])
	return `${y}年${mo}月${d}日 ${m[4]}:${m[5]}`
}

const detail = computed(() => actDetail.data)

const joinList = computed(() => {
	const list = detail.value.joinAvatars || []
	return list.length ? list : []
})

const tagLabel = computed(() => detail.value.category_name || '')

const displayTime = computed(() => formatActivityTime(detail.value.time_text))

const feeLine = computed(() => detail.value.fee_note || '')

const statusHint = computed(() => {
	const n = Number(detail.value.joinCount) || 0
	return n >= 12 ? `报名火热 · 还剩少量名额` : `招募中 · 欢迎加入`
})

const detailLines = computed(() => {
	const desc = detail.value.description
	if (desc && typeof desc === 'string') {
		return desc.split('\n').filter(line => line.trim())
	}
	const title = detail.value.title || '本场活动'
	return [
		`欢迎参加「${title}」。以下为活动简介，具体安排以现场为准。`,
		`时间：${displayTime.value || '待定'}`,
		`地点：${detail.value.location_text || '待定'}`,
	]
})

const statusBarPadding = computed(() => {
	try {
		const sys = uni.getSystemInfoSync()
		const h = sys.statusBarHeight || 0
		// 状态栏高度之外再留 8px 顶边距，避免返回/收藏按钮贴住顶部
		return `${h + 8}px`
	} catch {
		return '16rpx'
	}
})

const safeBottom = computed(() => 'calc(24rpx + env(safe-area-inset-bottom))')

/** 页面加载：解析路由参数并展示活动详情数据 */
onLoad((option) => {
	try {
		const raw = option && option.item ? JSON.parse(decodeURIComponent(option.item)) : null
		if (raw) actDetail.data = normalizeActivity(raw)
	} catch {
		uni.showToast({ title: '活动信息加载失败', icon: 'none' })
	}
	const activityId = option && option.activity_id
	if (!activityId) {
		uni.showToast({ title: '缺少活动编号', icon: 'none' })
		return
	}
	// 缓存优先：命中缓存直接展示；未命中再请求后端接口
	loadActivityDetail(activityId)
})

/**
 * 拉取活动详情：由 fetchActivityDetail 实现缓存优先
 * （本地有该活动则直接读缓存，不发请求；否则请求 GET /api/v1/activities/:id）。
 * @param {string} activityId 活动 ID
 */
async function loadActivityDetail(activityId) {
	try {
		const data = await fetchActivityDetail(activityId)
		console.log('[HiGo] activityDetail =>', JSON.stringify(data, null, 2))
		if (data && data.activity_id != null) {
			actDetail.data = normalizeActivity(data)
			// 成功展示详情即上报一次热度（去重由后端保证，重复进入不会虚增），
			// 并把最新热度写回本地缓存，返回首页时 onShow 同步列表显示
			reportActivityView(activityId).then((res) => {
				if (res && res.hot != null) updateCachedActivityHot(activityId, res.hot)
			})
			return
		}
	} catch (_) {}
	uni.showToast({ title: '活动信息加载失败', icon: 'none' })
}

/** 返回上一页：无页面栈时兜底回首页 */
const goBack = () => {
	const pages = getCurrentPages()
	if (pages && pages.length > 1) {
		uni.navigateBack()
		return
	}
	uni.redirectTo({ url: '/pages/index/index' })
}

/** 收藏：未登录先拦截登录，已登录暂只提示（收藏接口待接入） */
const onFavorite = () => {
	let token = ''
	try {
		token = uni.getStorageSync('token')
	} catch (_) {}
	if (!token) {
		uni.showModal({
			title: '需要登录',
			content: '登录后即可收藏活动',
			confirmText: '去登录',
			cancelText: '取消',
			success: (res) => {
				if (res.confirm) uni.navigateTo({ url: '/src/login/login' })
			},
		})
		return
	}
	uni.showToast({ title: '收藏功能开发中', icon: 'none' })
}

/** 报名入口：提示报名流程即将接入 */
const onRegister = () => {
	uni.showToast({ title: '报名流程即将接入', icon: 'none' })
}

/** 分享入口：提示分享能力即将接入 */
const onShare = () => {
	uni.showToast({ title: '分享能力即将接入', icon: 'none' })
}
</script>

<style scoped>
.page {
	display: flex;
	flex-direction: column;
	--card-bg: #f6f6f7;
	--title-color: #1f1f1f;
	--tag-bg: linear-gradient(90deg, #ff7a45 0%, #ff3b30 100%);
	--time-pill-bg: #fff7f3;
	--time-pill-border: rgba(255, 106, 61, 0.16);
	--time-pill-label: #ff6a3d;
	--time-pill-text: #3a3a3a;
	--loc-pill-bg: #fff7f3;
	--loc-pill-border: rgba(255, 106, 61, 0.16);
	--loc-label: #ff6a3d;
	--loc-text: #3a3a3a;
	--muted: #999999;
	--accent: #ff3b30;
	min-height: 100vh;
	background: var(--card-bg);
	box-sizing: border-box;
}

/* 常规顶栏：返回 / 标题 / 收藏 */
.navBar {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12rpx 24rpx 16rpx;
	position: sticky;
	top: 0;
	z-index: 20;
	background: #ffffff;
	border-bottom: 1rpx solid rgba(0, 0, 0, 0.06);
	box-sizing: border-box;
}

.navRoundBtn {
	width: 72rpx;
	height: 72rpx;
	border-radius: 50%;
	background: #f3f3f5;
	border: 1rpx solid rgba(0, 0, 0, 0.06);
	display: flex;
	align-items: center;
	justify-content: center;
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.navRoundBtn--pressed {
	transform: scale(0.94);
	opacity: 0.82;
}

.navTitle {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--title-color);
}

.scrollBody {
	flex: 1;
	height: 0;
	min-height: 0;
}

.hero {
	position: relative;
	margin: 0 24rpx;
	height: 420rpx;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 20rpx 48rpx rgba(0, 0, 0, 0.1);
}

.heroImg {
	width: 100%;
	height: 100%;
	background: #eaeaea;
}

.heroMask {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 220rpx;
	background: linear-gradient(to top, rgba(20, 10, 10, 0.75), rgba(20, 10, 10, 0));
}

.heroChip {
	position: absolute;
	top: 20rpx;
	right: 20rpx;
	height: 40rpx;
	padding: 0 18rpx;
	border-radius: 20rpx;
	background: rgba(255, 255, 255, 0.22);
	border: 1rpx solid rgba(255, 255, 255, 0.45);
	display: flex;
	align-items: center;
}

.heroChipText {
	font-size: 22rpx;
	font-weight: 600;
	color: #ffffff;
}

.heroBottom {
	position: absolute;
	left: 24rpx;
	right: 24rpx;
	bottom: 24rpx;
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.tag {
	align-self: flex-start;
	height: 44rpx;
	padding: 0 18rpx;
	border-radius: 22rpx;
	font-size: 22rpx;
	font-weight: 600;
	color: #ffffff;
	background: var(--tag-bg);
	box-shadow: 0 8rpx 18rpx rgba(255, 59, 48, 0.28);
	line-height: 44rpx;
}

.heroTitle {
	font-size: 36rpx;
	font-weight: 700;
	color: #ffffff;
	line-height: 48rpx;
	text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.35);
}

.sheet {
	margin-top: 24rpx;
	padding: 0 24rpx;
	/* 与固定底栏高度对齐：顶 padding + 按钮 + 底 padding + 安全区，避免报名须知被挡住 */
	padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}

.statusLine {
	display: block;
	font-size: 26rpx;
	font-weight: 600;
	color: #ff5a1f;
	margin-bottom: 20rpx;
}

.feeCard {
	background: #ffffff;
	border: 1rpx solid rgba(0, 0, 0, 0.05);
	border-radius: 24rpx;
	padding: 22rpx 24rpx;
	margin-bottom: 20rpx;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.05);
}

.feeLabel {
	display: block;
	font-size: 22rpx;
	font-weight: 600;
	color: var(--muted);
	margin-bottom: 8rpx;
}

.feeValue {
	font-size: 28rpx;
	font-weight: 600;
	color: var(--accent);
	line-height: 40rpx;
}

.timePill,
.locationPill {
	width: 100%;
	border-radius: 24rpx;
	padding: 18rpx 20rpx;
	margin-bottom: 16rpx;
	display: flex;
	align-items: flex-start;
	gap: 10rpx;
	box-sizing: border-box;
}

.timePill {
	background: var(--time-pill-bg);
	border: 1rpx solid var(--time-pill-border);
	box-shadow: 0 8rpx 20rpx rgba(255, 106, 61, 0.08);
}

.locationPill {
	background: var(--loc-pill-bg);
	border: 1rpx solid var(--loc-pill-border);
	box-shadow: 0 8rpx 20rpx rgba(255, 106, 61, 0.08);
}

.timePillIco,
.locationPillIco {
	font-size: 22rpx;
	line-height: 36rpx;
	flex-shrink: 0;
}

.timePillLabel,
.locationPillLabel {
	font-size: 22rpx;
	font-weight: 600;
	flex-shrink: 0;
	line-height: 36rpx;
}

.timePillLabel {
	color: var(--time-pill-label);
}

.locationPillLabel {
	color: var(--loc-label);
}

.timePillText {
	flex: 1;
	font-size: 26rpx;
	font-weight: 500;
	color: var(--time-pill-text);
	line-height: 36rpx;
}

.locationPillText {
	flex: 1;
	font-size: 26rpx;
	font-weight: 500;
	color: var(--loc-text);
	line-height: 36rpx;
}

.orgCard {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 22rpx 24rpx;
	background: #ffffff;
	border-radius: 24rpx;
	border: 1rpx solid rgba(0, 0, 0, 0.05);
	margin-bottom: 28rpx;
	box-shadow: 0 12rpx 28rpx rgba(0, 0, 0, 0.05);
}

.orgAva {
	width: 88rpx;
	height: 88rpx;
	border-radius: 28rpx;
	background: #f2f2f2;
	border: 2rpx solid #fff;
	flex-shrink: 0;
}

.orgText {
	display: flex;
	flex-direction: column;
	gap: 6rpx;
	min-width: 0;
}

.orgLabel {
	font-size: 22rpx;
	color: var(--muted);
}

.orgName {
	font-size: 30rpx;
	font-weight: 600;
	color: var(--title-color);
}

.joinHead {
	margin-bottom: 16rpx;
}

.joinTitle {
	font-size: 28rpx;
	font-weight: 700;
	color: var(--title-color);
}

.avaScroll {
	width: 100%;
	margin-bottom: 36rpx;
	white-space: nowrap;
}

.avaRow {
	display: inline-flex;
	flex-direction: row;
	gap: 16rpx;
	padding-bottom: 8rpx;
}

.joinAva {
	width: 80rpx;
	height: 80rpx;
	border-radius: 50%;
	border: 3rpx solid #ffffff;
	box-shadow: 0 3rpx 10rpx rgba(0, 0, 0, 0.12);
	flex-shrink: 0;
	background: #eee;
}

.sectionHead {
	margin-bottom: 16rpx;
}

.sectionTitle {
	font-size: 32rpx;
	font-weight: 700;
	color: var(--title-color);
}

.detailBody {
	background: #ffffff;
	border-radius: 24rpx;
	padding: 24rpx 26rpx;
	border: 1rpx solid rgba(0, 0, 0, 0.05);
	margin-bottom: 24rpx;
}

.detailPara {
	display: block;
	font-size: 28rpx;
	line-height: 44rpx;
	color: #4a4a4a;
	margin-bottom: 18rpx;
}

.detailPara:last-child {
	margin-bottom: 0;
}

.hintCard {
	background: linear-gradient(90deg, rgba(255, 106, 61, 0.06) 0%, rgba(255, 59, 48, 0.04) 100%);
	border-radius: 24rpx;
	padding: 22rpx 24rpx;
	border: 1rpx solid rgba(255, 59, 48, 0.15);
	margin-bottom: 24rpx;
}

.hintTitle {
	display: block;
	font-size: 26rpx;
	font-weight: 700;
	color: var(--time-pill-label);
	margin-bottom: 10rpx;
}

.hintLine {
	font-size: 24rpx;
	line-height: 38rpx;
	color: var(--muted);
	word-break: break-word;
}

.bottomBar {
	position: fixed;
	left: 0;
	right: 0;
	bottom: 0;
	display: flex;
	align-items: center;
	gap: 20rpx;
	padding: 20rpx 24rpx;
	padding-top: 16rpx;
	background: rgba(255, 255, 255, 0.96);
	backdrop-filter: blur(14rpx);
	border-top: 1rpx solid rgba(0, 0, 0, 0.06);
	box-shadow: 0 -8rpx 32rpx rgba(0, 0, 0, 0.06);
}

.ghostBtn {
	flex: 0 0 200rpx;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 28rpx;
	font-weight: 600;
	color: var(--accent);
	background: rgba(255, 59, 48, 0.08);
	border-radius: 24rpx;
	border: 1rpx solid rgba(255, 59, 48, 0.2);
}

.primaryBtn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	font-size: 30rpx;
	font-weight: 700;
	color: #ffffff;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	border-radius: 24rpx;
	border: none;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.32);
}
</style>
