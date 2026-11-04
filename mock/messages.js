/**
 * 消息页会话 Mock
 * category: private（私聊）/ squad（圈子群聊）/ notice（活动通知）
 * avatarBg 提供头像渐变底色，avatarText 为头像文字（通知类使用铃铛图标）
 */
export const MOCK_MESSAGE_CONVERSATIONS = [
	{
		id: 101,
		category: 'squad',
		name: '搭子小分队',
		avatarText: '搭',
		avatarBg: 'linear-gradient(135deg, #ff8a6a 0%, #ff3b30 100%)',
		tag: '6人',
		lastMsg: '小鹿：周六音乐节东门集合，一起…',
		time: '12:30',
		unread: 3
	},
	{
		id: 102,
		category: 'private',
		name: '阿泽',
		avatarText: '泽',
		avatarBg: 'linear-gradient(135deg, #a99bff 0%, #6a5cff 100%)',
		tag: '',
		lastMsg: '到啦，滨江公园东门见～',
		time: '昨天',
		unread: 1
	},
	{
		id: 103,
		category: 'squad',
		name: '陶艺主理人·木心',
		avatarText: '陶',
		avatarBg: 'linear-gradient(135deg, #5fc3a5 0%, #2f9e7a 100%)',
		tag: '圈子',
		lastMsg: '周六记得带围裙，工作室提供泥料～',
		time: '周一',
		unread: 0
	},
	{
		id: 104,
		category: 'squad',
		name: '咖啡探店圈',
		avatarText: '咖',
		avatarBg: 'linear-gradient(135deg, #d3a679 0%, #a97d4f 100%)',
		tag: '圈子',
		lastMsg: '【新活动】巷口手冲咖啡品鉴会本周…',
		time: '11/10',
		unread: 0
	},
	{
		id: 105,
		category: 'private',
		name: '青柠',
		avatarText: '青',
		avatarBg: 'linear-gradient(135deg, #ffc06a 0%, #ff9419 100%)',
		tag: '',
		lastMsg: '「图片」上次音乐节的合照！',
		time: '11/08',
		unread: 0
	},
	{
		id: 106,
		category: 'notice',
		name: '活动通知',
		avatarText: '',
		avatarBg: 'linear-gradient(135deg, #fbf0d9 0%, #f3e2bd 100%)',
		tag: '',
		lastMsg: '你报名的「江边草坪日落音乐节」…',
		time: '今天',
		unread: 0
	}
]

/** 聊天室成员头像 / 昵称（Mock 占位） */
const CHAT_AVATARS = [
	'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80',
	'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=96&q=80',
	'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80'
]
const CHAT_NAMES = ['王小明', '李强', '阿杰']

/** 根据会话生成聊天室消息记录（后端聊天接口就绪前占位） */
export function getMockChatThread(conversation) {
	if (!conversation) return []
	const name = conversation.name || '聊天室'
	return [
		{ id: 1, from: 'other', name: CHAT_NAMES[0], avatar: CHAT_AVATARS[0], content: `欢迎来到「${name}」，大家随意聊～`, time: '昨天 20:10' },
		{ id: 2, from: 'other', name: CHAT_NAMES[1], avatar: CHAT_AVATARS[1], content: conversation.lastMsg || '最近的活动安排大家都有空参加吗？', time: '昨天 20:12' },
		{ id: 3, from: 'me', name: '我', avatar: '', content: '都行，提前说好时间就好', time: '昨天 20:15' },
		{ id: 4, from: 'other', name: CHAT_NAMES[0], avatar: CHAT_AVATARS[0], content: '好，那我晚点发个投票统计下', time: '昨天 20:16' },
		{ id: 5, from: 'other', name: CHAT_NAMES[2], avatar: CHAT_AVATARS[2], content: '没问题，随时到', time: '今天 09:02' }
	]
}
