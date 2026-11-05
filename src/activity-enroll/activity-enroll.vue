<template>
	<view class="signupPage" :style="{ paddingTop: statusBarHeight + 'px' }">
		<!-- 顶部导航：返回 + 标题 -->
		<view class="pageNav">
			<view class="back" hover-class="back--hover" hover-stay-time="120" @tap="goBack">
				<uni-icons type="left" size="18" color="#333333" />
			</view>
			<text class="navTitle">确认报名</text>
		</view>

		<scroll-view scroll-y class="confScroll" :show-scrollbar="false">
			<!-- 活动信息摘要（由 activity_id 解析） -->
			<view class="summaryCard">
				<image v-if="activity.cover" class="scImg" :src="activity.cover" mode="aspectFill" />
				<view v-else class="scImg scImgFallback"></view>
				<view class="scInfo">
					<text class="scTitle">{{ activity.title }}</text>
					<view class="scMeta">
						<view class="scMetaRow">⏰ {{ displayTime || '时间待定' }}</view>
						<view class="scMetaRow">📍 {{ activity.location_text || '地点待定' }}</view>
					</view>
				</view>
			</view>

			<!-- 选择票种 -->
			<view class="formCard">
				<view class="cardTitleRow">
					<text class="cardTitle">选择票种</text>
					<text class="pending">（待接入）</text>
				</view>
				<view class="ticketRow">
					<view class="ticketName">
						<text class="ticketMain">单人票</text>
						<text class="ticketSub">{{ activity.fee_note || '费用以主办方说明为准' }}</text>
					</view>
					<view class="stepper">
						<view
							class="sbtn"
							:class="{ 'sbtn--disabled': count <= 1 }"
							hover-class="sbtn--hover"
							@tap="decrease"
						>
							−
						</view>
						<text class="num">{{ count }}</text>
						<view class="sbtn sbtnPlus" hover-class="sbtn--hover" @tap="increase">＋</view>
					</view>
				</view>
				<view class="totalRow">
					<text class="totalLabel">合计</text>
					<text class="totalPrice">{{ totalText }}</text>
				</view>
			</view>

			<!-- 报名人信息 -->
			<view class="formCard">
				<view class="cardTitleRow">
					<text class="cardTitle">报名人信息</text>
				</view>
				<view class="formRow">
					<text class="formLabel">姓名</text>
					<input
						v-model="form.name"
						class="formInput"
						maxlength="20"
						placeholder="请输入姓名"
						placeholder-class="inputPh"
					/>
				</view>
				<view class="formRow">
					<text class="formLabel">手机号</text>
					<input
						v-model="form.phone"
						class="formInput"
						type="number"
						maxlength="11"
						placeholder="请输入手机号"
						placeholder-class="inputPh"
					/>
				</view>
				<view class="formRow">
					<text class="formLabel">备注</text>
					<input
						v-model="form.remark"
						class="formInput"
						maxlength="50"
						placeholder="给主理人留言（选填）"
						placeholder-class="inputPh"
					/>
				</view>
			</view>

			<!-- 优惠券 -->
			<view class="formCard couponCard">
				<view class="formRow">
					<text class="formLabel">优惠券</text>
					<text class="formValuePh">暂无可用（待接入）</text>
				</view>
			</view>
		</scroll-view>

		<!-- 底部提交栏 -->
		<view class="actionBar" :style="{ paddingBottom: safeBottom }">
			<view class="summaryTotal">
				<text class="stL">已选 {{ count }} 张</text>
				<text class="stP">{{ totalText }}</text>
			</view>
			<view class="summaryCta" hover-class="summaryCta--hover" @tap="onSubmit">提交报名</view>
		</view>
	</view>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { fetchActivityDetail } from '@/api/modules/activity.js'
import { cacheActivities } from '@/utils/activity-cache.js'

const statusBarHeight = (() => {
	try {
		return uni.getSystemInfoSync().statusBarHeight || 0
	} catch (_) {
		return 0
	}
})()

const safeBottom = computed(() => 'calc(24rpx + env(safe-area-inset-bottom))')

const activity = ref({})
const count = ref(1)
const form = reactive({
	name: '',
	phone: '',
	remark: '',
})

/** 归一化活动数据，补齐渲染所需字段 */
function normalizeActivity(raw) {
	if (!raw || typeof raw !== 'object') return {}
	return {
		...raw,
		cover: raw.cover || '',
		title: raw.title || '活动',
		location_text: raw.location_text || '',
		time_text: raw.time_text || '',
		fee_note: raw.fee_note || '',
		activity_id: raw.activity_id != null ? raw.activity_id : raw.id || '',
	}
}

/** 将 ISO 时间字符串格式化为“年月日 时分”展示文案 */
function formatActivityTime(str) {
	if (!str || typeof str !== 'string') return ''
	const m = str.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/)
	if (!m) return str
	const mo = Number(m[2])
	const d = Number(m[3])
	return `${m[1]}年${mo}月${d}日 ${m[4]}:${m[5]}`
}

const displayTime = computed(() => formatActivityTime(activity.value.time_text))

/** 从费用说明中解析单人价格（如「约 ¥35/人」），无价格时为 null */
const unitPrice = computed(() => {
	const m = String(activity.value.fee_note || '').match(/¥\s*(\d+(?:\.\d+)?)/)
	return m ? Number(m[1]) : null
})

const totalText = computed(() => {
	if (unitPrice.value != null) {
		const total = unitPrice.value * count.value
		return `¥${Number.isInteger(total) ? total : total.toFixed(2)}`
	}
	if (String(activity.value.fee_note || '').includes('免费')) return '免费'
	return '以说明为准'
})

function increase() {
	if (count.value >= 9) return
	count.value += 1
}

function decrease() {
	if (count.value <= 1) return
	count.value -= 1
}

/** 预填当前登录用户的姓名与手机号 */
function prefillUserInfo() {
	try {
		const raw = uni.getStorageSync('userInfo')
		const info = typeof raw === 'string' ? JSON.parse(raw) : raw
		if (info && typeof info === 'object') {
			form.name = info.nickname || info.username || ''
			form.phone = info.phone || info.mobile || ''
		}
		if (!form.name) form.name = uni.getStorageSync('username') || ''
	} catch (_) {}
}

const goBack = () => {
	const pages = getCurrentPages()
	if (pages && pages.length > 1) {
		uni.navigateBack()
		return
	}
	uni.redirectTo({ url: '/pages/index/index' })
}

/** 页面加载：按 activity_id 读取活动信息（缓存优先，未命中走详情接口） */
onLoad(async (option) => {
	prefillUserInfo()
	const id = option && option.activity_id
	if (!id) {
		uni.showToast({ title: '缺少活动编号', icon: 'none' })
		return
	}
	const data = await fetchActivityDetail(id)
	if (!data) {
		uni.showToast({ title: '活动信息加载失败', icon: 'none' })
		return
	}
	activity.value = normalizeActivity(data)
	// 接口返回的数据回写缓存，后续进入可直接命中
	cacheActivities([data])
})

/** 提交报名：表单校验通过后提示接口待接入 */
function onSubmit() {
	if (!String(form.name).trim()) {
		uni.showToast({ title: '请输入姓名', icon: 'none' })
		return
	}
	if (!/^1[3-9]\d{9}$/.test(String(form.phone).trim())) {
		uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
		return
	}
	uni.showToast({ title: '报名提交功能（待接入）', icon: 'none' })
}
</script>

<style scoped>
.signupPage {
	display: flex;
	flex-direction: column;
	height: 100vh;
	background: #f5f6f7;
	box-sizing: border-box;
}

/* 顶部导航 */
.pageNav {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx 32rpx 28rpx;
	flex: 0 0 auto;
}

.back {
	width: 64rpx;
	height: 64rpx;
	border-radius: 50%;
	background: #ffffff;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.06);
}

.back--hover {
	opacity: 0.85;
}

.navTitle {
	font-size: 36rpx;
	font-weight: 800;
	color: #1a1a1a;
}

/* 内容区 */
.confScroll {
	flex: 1;
	min-height: 0;
	padding: 0 32rpx 32rpx;
	box-sizing: border-box;
}

.summaryCard {
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx;
	border-radius: 32rpx;
	background: #ffffff;
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.06);
	margin-bottom: 28rpx;
}

.scImg {
	width: 168rpx;
	height: 148rpx;
	border-radius: 24rpx;
	flex: 0 0 auto;
	background: #eeeeee;
}

.scImgFallback {
	background: linear-gradient(135deg, #ffb36b 0%, #ff6b81 45%, #7a5ae0 100%);
}

.scInfo {
	flex: 1;
	min-width: 0;
}

.scTitle {
	font-size: 30rpx;
	font-weight: 700;
	color: #1a1a1a;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	display: block;
}

.scMeta {
	margin-top: 12rpx;
}

.scMetaRow {
	font-size: 24rpx;
	color: #999999;
	line-height: 38rpx;
}

/* 表单卡片 */
.formCard {
	background: #ffffff;
	border-radius: 32rpx;
	box-shadow: 0 16rpx 48rpx rgba(0, 0, 0, 0.06);
	padding: 8rpx 32rpx;
	margin-bottom: 28rpx;
}

.cardTitleRow {
	display: flex;
	align-items: center;
	gap: 8rpx;
	padding: 24rpx 0 4rpx;
}

.cardTitle {
	font-size: 28rpx;
	font-weight: 800;
	color: #1a1a1a;
}

.pending {
	font-size: 22rpx;
	color: #999999;
	font-weight: 400;
}

/* 票种 */
.ticketRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.ticketName {
	flex: 1;
	min-width: 0;
}

.ticketMain {
	display: block;
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1a1a;
}

.ticketSub {
	display: block;
	font-size: 22rpx;
	color: #999999;
	margin-top: 6rpx;
	line-height: 34rpx;
}

.stepper {
	display: flex;
	align-items: center;
	gap: 28rpx;
	margin-left: 24rpx;
	flex: 0 0 auto;
}

.sbtn {
	width: 56rpx;
	height: 56rpx;
	border-radius: 50%;
	border: 3rpx solid #dddddd;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 32rpx;
	color: #333333;
	background: #ffffff;
	box-sizing: border-box;
}

.sbtn--hover {
	opacity: 0.7;
}

.sbtn--disabled {
	color: #cccccc;
	border-color: #eeeeee;
}

.sbtnPlus {
	border-color: #ff3b30;
	color: #ff3b30;
}

.num {
	font-size: 30rpx;
	font-weight: 700;
	min-width: 40rpx;
	text-align: center;
	color: #1a1a1a;
}

.totalRow {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 24rpx 0;
}

.totalLabel {
	font-size: 28rpx;
	font-weight: 600;
	color: #1a1a1a;
}

.totalPrice {
	font-size: 40rpx;
	font-weight: 800;
	color: #ff3b30;
}

/* 表单行 */
.formRow {
	display: flex;
	align-items: center;
	padding: 26rpx 0;
	border-bottom: 1rpx solid #f0f0f0;
}

.formRow:last-child {
	border-bottom: none;
}

.formLabel {
	width: 152rpx;
	font-size: 28rpx;
	color: #1a1a1a;
	font-weight: 600;
	flex: 0 0 auto;
}

.formInput {
	flex: 1;
	font-size: 28rpx;
	color: #1a1a1a;
	text-align: right;
	min-width: 0;
}

.inputPh {
	color: #bbbbbb;
}

.formValuePh {
	flex: 1;
	font-size: 28rpx;
	color: #999999;
	text-align: right;
}

/* 底部提交栏 */
.actionBar {
	flex: 0 0 auto;
	display: flex;
	align-items: center;
	gap: 24rpx;
	padding: 24rpx 32rpx;
	background: rgba(255, 255, 255, 0.98);
	box-shadow: 0 -12rpx 40rpx rgba(0, 0, 0, 0.06);
}

.summaryTotal {
	display: flex;
	flex-direction: column;
	flex: 0 0 auto;
}

.stL {
	font-size: 22rpx;
	color: #ff3b30;
}

.stP {
	font-size: 38rpx;
	font-weight: 800;
	color: #ff3b30;
	line-height: 1.1;
}

.summaryCta {
	flex: 1;
	background: #ff3b30;
	color: #ffffff;
	font-size: 32rpx;
	font-weight: 700;
	border-radius: 999rpx;
	padding: 28rpx 0;
	text-align: center;
}

.summaryCta--hover {
	opacity: 0.9;
}
</style>
