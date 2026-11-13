<template>
	<view v-if="visible" class="datePickerMask" @tap="onCancel">
		<view class="datePickerCard" @tap.stop>
			<text class="datePickerTitle">{{ title }}</text>
			<picker-view
				class="datePickerView"
				:value="indices"
				:indicator-style="indicatorStyle"
				@change="onPickerChange"
			>
				<picker-view-column>
					<view v-for="year in years" :key="year" class="datePickerItem">{{ year }}年</view>
				</picker-view-column>
				<picker-view-column>
					<view v-for="month in months" :key="month" class="datePickerItem">{{ month }}月</view>
				</picker-view-column>
				<picker-view-column>
					<view v-for="day in days" :key="day" class="datePickerItem">{{ day }}日</view>
				</picker-view-column>
			</picker-view>
			<view class="datePickerActions">
				<view
					class="datePickerBtn datePickerBtnGhost"
					hover-class="datePickerBtnPressed"
					hover-stay-time="120"
					@tap="onCancel"
				>取消</view>
				<view
					class="datePickerBtn datePickerBtnPrimary"
					hover-class="datePickerBtnPressed"
					hover-stay-time="120"
					@tap="onConfirm"
				>确定</view>
			</view>
		</view>
	</view>
</template>

<script>
/** 解析 yyyy-MM-dd 字符串为年月日，非法时返回 null */
function parseDate(text) {
	const parts = String(text || '').split('-').map((part) => parseInt(part, 10))
	if (parts.length !== 3 || parts.some((part) => Number.isNaN(part))) return null
	return { year: parts[0], month: parts[1], day: parts[2] }
}

/** 获取某年某月的天数（month 从 1 开始） */
function daysInMonth(year, month) {
	return new Date(year, month, 0).getDate()
}

/** 数字补零 */
function pad2(value) {
	return String(value).padStart(2, '0')
}

/** 今天的日期字符串（yyyy-MM-dd） */
function todayString() {
	const now = new Date()
	return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`
}

/** 将年月日收敛到 [start, end] 区间，避免默认值或滚动结果超出可选范围 */
function clampDate(year, month, day, start, end) {
	const date = new Date(year, month - 1, day)
	const startDate = new Date(start.year, start.month - 1, start.day)
	const endDate = new Date(end.year, end.month - 1, end.day)
	const time = Math.min(Math.max(date.getTime(), startDate.getTime()), endDate.getTime())
	const clamped = new Date(time)
	return { year: clamped.getFullYear(), month: clamped.getMonth() + 1, day: clamped.getDate() }
}

/**
 * 通用日期选择弹窗：沿用性别选择弹窗的白底圆角卡片样式，内部使用 picker-view 渲染年 / 月 / 日三列。
 *
 * 使用方式：
 *   <DatePickerModal
 *     v-model:visible="showDatePicker"
 *     :value="birthday"
 *     title="选择生日"
 *     :end="today"
 *     @confirm="onDateConfirm"
 *   />
 *
 * @prop {boolean} visible 是否显示（支持 v-model:visible）
 * @prop {string} value 当前选中日期，格式 yyyy-MM-dd
 * @prop {string} title 弹窗标题
 * @prop {string} start 可选最小日期，默认 1900-01-01
 * @prop {string} end 可选最大日期，默认当天
 * @event update:visible 显隐状态变更
 * @event confirm 确认选择，参数为 yyyy-MM-dd 字符串
 * @event cancel 取消选择
 */
export default {
	name: 'DatePickerModal',
	props: {
		visible: {
			type: Boolean,
			default: false,
		},
		value: {
			type: String,
			default: '',
		},
		title: {
			type: String,
			default: '选择日期',
		},
		start: {
			type: String,
			default: '1900-01-01',
		},
		end: {
			type: String,
			default: '',
		},
	},
	emits: ['update:visible', 'confirm', 'cancel'],
	data() {
		return {
			yearIndex: 0,
			monthIndex: 0,
			dayIndex: 0,
		}
	},
	computed: {
		/** 可选最大日期，未传 end 时默认当天 */
		endDate() {
			return parseDate(this.end) || parseDate(todayString())
		},
		/** 可选最小日期 */
		startDate() {
			return parseDate(this.start) || { year: 1900, month: 1, day: 1 }
		},
		/** 年份列数据 */
		years() {
			const list = []
			for (let year = this.startDate.year; year <= this.endDate.year; year += 1) {
				list.push(year)
			}
			return list
		},
		/** 月份列数据 */
		months() {
			return Array.from({ length: 12 }, (_, index) => index + 1)
		},
		/** 当前选中的年 */
		selectedYear() {
			return this.years[this.yearIndex] || this.endDate.year
		},
		/** 当前选中的月 */
		selectedMonth() {
			return this.monthIndex + 1
		},
		/** 日列数据：随年月动态变化 */
		days() {
			const total = daysInMonth(this.selectedYear, this.selectedMonth)
			return Array.from({ length: total }, (_, index) => index + 1)
		},
		/** picker-view 绑定的索引 */
		indices() {
			return [this.yearIndex, this.monthIndex, this.dayIndex]
		},
		/** 选中行高亮条样式，与 44px 行高保持一致 */
		indicatorStyle() {
			return 'height: 44px;'
		},
	},
	watch: {
		visible: {
			immediate: true,
			handler(val) {
				if (val) this.syncFromValue()
			},
		},
	},
	methods: {
		/** 打开时按 value 回填选中位置，非法值回退到 end 与当天中较早者 */
		syncFromValue() {
			const parsed = parseDate(this.value) || parseDate(todayString())
			const clamped = clampDate(
				parsed.year,
				parsed.month,
				parsed.day,
				this.startDate,
				this.endDate
			)
			this.yearIndex = Math.max(this.years.indexOf(clamped.year), 0)
			this.monthIndex = clamped.month - 1
			this.dayIndex = clamped.day - 1
		},
		/** 滚动选择时同步索引，并处理月份天数越界 */
		onPickerChange(e) {
			const next = (e && e.detail && e.detail.value) || []
			const yearIndex = Math.min(Math.max(next[0] || 0, 0), this.years.length - 1)
			const monthIndex = Math.min(Math.max(next[1] || 0, 0), 11)
			const maxDay = daysInMonth(this.years[yearIndex], monthIndex + 1)
			const dayIndex = Math.min(Math.max(next[2] || 0, 0), maxDay - 1)
			this.yearIndex = yearIndex
			this.monthIndex = monthIndex
			this.dayIndex = dayIndex
		},
		/** 取消选择 */
		onCancel() {
			this.$emit('update:visible', false)
			this.$emit('cancel')
		},
		/** 确认选择，回传 yyyy-MM-dd（超出可选范围时收敛到边界） */
		onConfirm() {
			const year = this.years[this.yearIndex]
			const month = this.monthIndex + 1
			const day = this.days[this.dayIndex] || 1
			const clamped = clampDate(year, month, day, this.startDate, this.endDate)
			this.$emit('update:visible', false)
			this.$emit('confirm', `${clamped.year}-${pad2(clamped.month)}-${pad2(clamped.day)}`)
		},
	},
}
</script>

<style scoped>
.datePickerMask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1200;
	background: rgba(17, 17, 17, 0.45);
	display: flex;
	overflow-y: auto;
	padding: 40rpx 60rpx;
	box-sizing: border-box;
}

.datePickerCard {
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
	animation: datePickerIn 0.18s ease-out;
}

.datePickerTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1a1a1a;
	margin-bottom: 20rpx;
}

.datePickerView {
	width: 100%;
	height: 400rpx;
}

.datePickerItem {
	font-size: 28rpx;
	color: #222222;
	text-align: center;
	/* #ifdef H5 */
	/*
	 * H5 端行高由 uni-app 写入的 --picker-view-column-indicator-height 控制，
	 * 这里不再固定 height，确保滑动吸附的步长与实际行高始终一致，避免停在两行中间。
	 */
	display: flex;
	align-items: center;
	justify-content: center;
	/* #endif */
	/* #ifndef H5 */
	/* 小程序 / App 端没有该 CSS 变量，保持与 indicator 一致的固定行高 */
	height: 44px;
	line-height: 44px;
	/* #endif */
}

.datePickerActions {
	display: flex;
	gap: 20rpx;
	width: 100%;
	margin-top: 28rpx;
}

.datePickerBtn {
	flex: 1;
	height: 84rpx;
	border-radius: 42rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	font-size: 30rpx;
	font-weight: 600;
}

.datePickerBtnGhost {
	background: #f2f2f3;
	color: #666666;
}

.datePickerBtnPrimary {
	background: linear-gradient(135deg, #ff6b5e 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 8rpx 20rpx rgba(255, 59, 48, 0.24);
}

.datePickerBtnPressed {
	opacity: 0.85;
}

@keyframes datePickerIn {
	/*
	 * 只做透明度动画：卡片若使用 scale 动画，picker-view 在挂载时测量指示器高度
	 * 可能读到缩放后的尺寸，导致滑动吸附步长与行高不一致，停在两行之间。
	 */
	from {
		opacity: 0;
	}
	to {
		opacity: 1;
	}
}
</style>
