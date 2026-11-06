/**
 * 首页分类目录图标与配色配置。
 * 图标颜色与活动卡片上的分类标签色保持一致，背景色取同色系的浅色。
 * 选中态统一使用白色图标 + 主题红背景。
 */
export const CATEGORY_VISUALS = {
	sport: {
		icon: '/static/icons/categories/sport.svg',
		activeIcon: '/static/icons/categories/sport-active.svg',
		bg: '#e8f4fd'
	},
	movie: {
		icon: '/static/icons/categories/movie.svg',
		activeIcon: '/static/icons/categories/movie-active.svg',
		bg: '#f0ebfd'
	},
	outdoor: {
		icon: '/static/icons/categories/outdoor.svg',
		activeIcon: '/static/icons/categories/outdoor-active.svg',
		bg: '#e8f7ef'
	},
	chat: {
		icon: '/static/icons/categories/chat.svg',
		activeIcon: '/static/icons/categories/chat-active.svg',
		bg: '#fdf0e8'
	},
	art: {
		icon: '/static/icons/categories/art.svg',
		activeIcon: '/static/icons/categories/art-active.svg',
		bg: '#fdefef'
	}
}

/** 后端未返回 category_key 时，按 category_id 兜底映射 */
export const CATEGORY_KEY_BY_ID = {
	1: 'sport',
	2: 'movie',
	3: 'outdoor',
	4: 'chat',
	5: 'art'
}
