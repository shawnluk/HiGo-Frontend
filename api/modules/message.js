import { cloneJson } from '@/utils/json.js'
import { MOCK_MESSAGE_CONVERSATIONS, getMockChatThread } from '@/mock/messages.js'

/**
 * 获取消息会话列表
 * 后端会话聚合接口尚未提供，暂返回本地 Mock 占位数据；接口就绪后改为 request() 对接。
 * @returns {Promise<Array<Object>>} 会话数组（name / avatar / tag / lastMsg / time / unread）
 */
export async function fetchMessageConversations() {
	return cloneJson(MOCK_MESSAGE_CONVERSATIONS)
}

/**
 * 获取某个会话的聊天记录
 * 后端聊天室接口尚未提供，暂用 Mock 占位；接口就绪后改为 request() 对接。
 * @param {string|number} conversationId 会话 id
 * @returns {Promise<Array<Object>>} 消息数组（from / name / avatar / content / time）
 */
export async function fetchChatThread(conversationId) {
	const conversation = MOCK_MESSAGE_CONVERSATIONS.find(
		(item) => String(item.id) === String(conversationId)
	)
	return getMockChatThread(conversation)
}
