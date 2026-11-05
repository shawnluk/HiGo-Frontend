/**
 * 行程页面配置：状态筛选与星期文案。
 * 页面组件只消费这里的数据，后续调整 Tab 或星期展示只需改本文件。
 */

/** 行程状态筛选 */
export const ITINERARY_TABS = [
	{ key: 'upcoming', label: '待开始' },
	{ key: 'ended', label: '已结束' },
]

/** 一周星期文案（周一至周日，与 weekDays 下标一致） */
export const WEEK_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']
