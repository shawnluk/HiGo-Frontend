/**
 * 行程页占位数据（待接入真实接口后删除）。
 * dayOffset 表示相对今天的天数偏移，页面加载时换算成本周具体日期。
 */

export const MOCK_ITINERARY_ITEMS = [
	{
		id: 'itinerary-1',
		dayOffset: 0,
		time: '19:30',
		status: 'upcoming',
		title: '江边草坪日落音乐会',
		location: '滨江艺术公园',
		joined: 2,
		priceText: '¥68',
		badgeType: 'paid',
		source: '音乐现场圈',
		cover: 'linear-gradient(135deg, #ff9a9e 0%, #a18cd1 100%)',
	},
	{
		id: 'itinerary-2',
		dayOffset: 0,
		time: '14:00',
		status: 'upcoming',
		title: '手作陶艺体验·拉坯入门',
		location: '木心陶艺工作室',
		joined: 1,
		priceText: '免费',
		badgeType: 'free',
		source: '手作体验圈',
		cover: 'linear-gradient(135deg, #ead7b4 0%, #d6b78c 100%)',
	},
	{
		id: 'itinerary-3',
		dayOffset: 0,
		time: '10:00',
		status: 'ended',
		title: '滨江晨骑·30KM 轻松环线',
		location: '徐汇滨江·已参加过',
		joined: 0,
		priceText: '已打卡',
		badgeType: 'checked',
		source: '户外运动圈',
		cover: 'linear-gradient(135deg, #b7e9c9 0%, #8ed3b0 100%)',
	},
]
