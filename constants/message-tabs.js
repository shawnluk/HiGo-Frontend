/**
 * 消息页分类 Tab 配置
 * - categories：该 Tab 展示的会话分类；为 null 时展示全部会话
 * - showUnreadDot：是否在该 Tab 上展示未读红点
 * 后续新增 / 调整分类只需修改此文件
 */
export const MESSAGE_TABS = [
	{ key: 'chat', label: '私信消息', categories: null, showUnreadDot: false },
	{ key: 'notice', label: '系统通知', categories: ['notice'], showUnreadDot: true },
	{ key: 'circle', label: '小队聊天', categories: ['squad'], showUnreadDot: false }
]
