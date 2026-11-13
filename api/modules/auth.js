import { request } from '@/api/http.js'
import { ApiPaths } from '@/constants/api-paths.js'

/**
 * 登录成功后本地保存 token 与用户信息
 * @param {{ token?: string, user_id?: number, username?: string, phone?: string, email?: string, profile?: object }} data
 */
function persistLogin(data) {
	if (!data) return
	try {
		if (data.token) uni.setStorageSync('token', data.token)
		if (data.user_id !== undefined) uni.setStorageSync('userId', data.user_id)
		if (data.squads) uni.setStorageSync('squads', data.squads)
		if (data.username) uni.setStorageSync('username', data.username)
		if (data.profile) {
			// phone / email 位于 users 表，登录接口以顶层字段返回，合并进 userInfo 供个人资料页展示
			const profile = { ...data.profile }
			if (data.phone !== undefined) profile.phone = data.phone
			if (data.email !== undefined) profile.email = data.email
			uni.setStorageSync('userInfo', profile)
		}
	} catch (_) {}
}

/**
 * 后端返回：{ token, user_id, username, profile,squads }
 * @param {{ username: string, password: string }} credentials
 * @returns {Promise<{ token?: string, user_id?: number, username?: string, profile?: object }>}
 */
export async function loginWithPassword(credentials) {
	const data = await request({
		url: ApiPaths.authLogin,
		method: 'POST',
		data: credentials,
		// mock: () => ({
		// 	code: 0,
		// 	message: '登录成功',
		// 	token: 'mock-token-dev',
		// 	user_id: 1,
		// 	username: credentials.username,
		// 	profile: {
		// 		nickname: credentials.username || '用户',
		// 		avatar: '',
		// 		bio: '',
		// 		gender: '',
		// 		birthday: '',
		// 		city: '',
		// 		status: 'active',
		// 		created_at: '2026-08-21 00:00:00',
		// 	},
		// }),
	})
	persistLogin(data)
	return data
}

/**
 * 注册新账号
 * @param {{ username: string, password: string, phone?: string, email?: string }} credentials 用户名、密码与可选手机号、邮箱
 * @returns {Promise<{ success?: boolean }>}
 */
export async function register(credentials) {
	const data = await request({
		url: ApiPaths.authRegister,
		method: 'POST',
		data: credentials,
		mock: () => ({ success: true }),
	})
	return data
}
