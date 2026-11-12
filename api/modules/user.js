import { request } from '@/api/http.js'
import { ApiPaths } from '@/constants/api-paths.js'
import {
	MOCK_USER_DEFAULT_AVATAR,
	MOCK_USER_DISPLAY_NAME_GUEST,
	MOCK_USER_DISPLAY_NAME_LOGGED_IN,
	MOCK_USER_HEADER,
	MOCK_USER_DATA_ITEMS,
	mapSquadsToPanelItems,
	getMockUserSquadDetail,
	MOCK_USER_SQUAD_DEFAULT_ID,
} from '@/mock/user-display.js'

/**
 * 获取用户全部资料（头像、昵称、头部卡片、数据宫格等）
 * @returns {Promise<Object>} 已解包的业务数据：
 *   { avatarUrl, displayNameGuest, displayNameLoggedIn, isLoggedIn, header, dataItems }
 */
export async function fetchUserProfile() {
	return request({
		url: ApiPaths.userProfile,
		method: 'GET',
		mock: () => ({
			avatarUrl: MOCK_USER_DEFAULT_AVATAR,
			displayNameGuest: MOCK_USER_DISPLAY_NAME_GUEST,
			displayNameLoggedIn: MOCK_USER_DISPLAY_NAME_LOGGED_IN,
			isLoggedIn: false,
			header: { ...MOCK_USER_HEADER },
			dataItems: MOCK_USER_DATA_ITEMS.map((row) => ({ ...row })),
		}),
	})
}

function readStoredSquads() {
	try {
		const squads = uni.getStorageSync('squads')
		return Array.isArray(squads) ? squads : []
	} catch (_) {
		return []
	}
}

/**
 * 获取用户小队卡片（多个小队）。
 * 优先请求 GET /api/v1/squads/mine 获取最新列表；请求失败时回退到
 * 登录时缓存的 squads（由 persistLogin 写入）；无数据时返回占位条目。
 * @returns {Promise<Array<{id: string, cover: string, name: string, stats: string, badge: string, topTag: string}>>}
 */
export async function fetchUserSquadPanel() {
	try {
		const list = await request({
			url: ApiPaths.squadMine,
			method: 'GET',
			mock: () => readStoredSquads(),
		})
		return mapSquadsToPanelItems(Array.isArray(list) ? list : [])
	} catch (_) {
		return mapSquadsToPanelItems(readStoredSquads())
	}
}

/**
 * 获取小队详情。
 * @param {string|number} [squadId] 小队 ID；缺省时回退默认（空）ID
 * @returns {Promise<Object>} 已解包的业务数据：后端小队详情
 *   （基础信息 + members + activities，结构见 normalizeSquadDetail）
 */
export async function fetchSquadDetail(squadId) {
	const id = squadId || MOCK_USER_SQUAD_DEFAULT_ID
	return request({
		url: `${ApiPaths.squadDetail}/${id}`,
		method: 'GET',
		mock: () => getMockUserSquadDetail(id),
	})
}

/**
 * 创建小队。
 * 后端：POST /api/v1/squads（成功返回 201 与新建小队对象，含 squad_id）
 * @param {Object} [payload] 小队表单：
 *  - name 小队名称（必填，后端兼容 squad_name）
 *  - avatar 小队头像（后端兼容 squad_avatar）
 *  - intro 小队简介
 *  - category_id 分类 ID
 *  - max_members 人数上限（后端默认 20）
 *  - join_type 加入方式（后端默认 0）
 * @returns {Promise<Object>} 已解包的新建小队对象
 */
export async function createSquad(payload = {}) {
	return request({
		url: ApiPaths.squadDetail,
		method: 'POST',
		data: payload,
		mock: ({ data }) => {
			const now = new Date().toISOString()
			return {
				squad_id: `mock-${Date.now()}`,
				squad_name: data.name || data.squad_name || '',
				squad_avatar: data.avatar || data.squad_avatar || '',
				captain_id: data.captain_id || 0,
				vice_captain_id: data.vice_captain_id != null ? data.vice_captain_id : null,
				intro: data.intro || '',
				category_id: data.category_id || 0,
				max_members: data.max_members || 20,
				member_count: 1,
				join_type: data.join_type != null ? data.join_type : 0,
				status: 1,
				invite_code: data.invite_code || '',
				create_time: now,
				update_time: now,
			}
		},
	})
}

/**
 * 加入小队。
 * 后端：POST /api/v1/squads/:id/join（需登录；已加入/满员会返回 400；返回最新小队详情）
 * @param {string|number} squadId 小队 ID
 * @param {Object} [payload] 可选参数；user_id 缺省时由后端从 token 解析
 * @returns {Promise<Object>} 已解包的小队详情（加入后）
 */
export async function joinSquad(squadId, payload = {}) {
	return request({
		url: `${ApiPaths.squadDetail}/${squadId}/join`,
		method: 'POST',
		data: payload,
		mock: () => getMockUserSquadDetail(squadId),
	})
}

/**
 * 退出小队。
 * 后端：POST /api/v1/squads/:id/leave（队长不可退出，需先转让；返回最新小队详情）
 * @param {string|number} squadId 小队 ID
 * @param {Object} [payload] 可选参数；user_id 缺省时由后端从 token 解析
 * @returns {Promise<Object>} 已解包的小队详情（退出后）
 */
export async function leaveSquad(squadId, payload = {}) {
	return request({
		url: `${ApiPaths.squadDetail}/${squadId}/leave`,
		method: 'POST',
		data: payload,
		mock: () => getMockUserSquadDetail(squadId),
	})
}

/**
 * 转让队长。
 * 后端：POST /api/v1/squads/:id/captain（仅队长可操作，目标须为在队成员）
 * @param {string|number} squadId 小队 ID
 * @param {string|number} targetUserId 目标成员的用户 ID
 * @returns {Promise<Object>} 已解包的小队详情（转让后）
 */
export async function transferCaptain(squadId, targetUserId) {
	return request({
		url: `${ApiPaths.squadDetail}/${squadId}/captain`,
		method: 'POST',
		data: { target_user_id: targetUserId },
		mock: () => getMockUserSquadDetail(squadId),
	})
}