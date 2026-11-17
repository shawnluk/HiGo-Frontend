import { request } from '@/api/http.js'
import { ApiPaths } from '@/constants/api-paths.js'
// #ifdef H5
// H5 使用浏览器版 SDK（UMD：webpack 下走默认导出，ESM 下挂载到 window.COS）
import * as COSModuleH5 from '@/utils/cos-js-sdk-v5.js'
// #endif
// #ifndef H5
// 小程序使用微信版 SDK（CJS 默认导出）
import * as COSModule from '@/utils/cos-wx-sdk-v5.js'
// #endif

/**
 * 解析 COS SDK 构造函数，兼容不同运行时的模块格式：
 * - H5：浏览器版 UMD（webpack 默认导出 / ESM 下挂载到 window.COS）
 * - 小程序：微信版以 CJS 方式加载，构造函数在 namespace.default（或 COS）
 */
function resolveCosSdk() {
	// #ifdef H5
	const h5 = COSModuleH5 || {}
	if (typeof h5.default === 'function') return h5.default
	if (typeof h5.COS === 'function') return h5.COS
	if (typeof window !== 'undefined' && typeof window.COS === 'function') return window.COS
	// #endif
	// #ifndef H5
	const mod = COSModule || {}
	if (typeof mod.default === 'function') return mod.default
	if (typeof mod.COS === 'function') return mod.COS
	// #endif
	if (typeof globalThis !== 'undefined' && typeof globalThis.COS === 'function') return globalThis.COS
	return null
}

const COS = resolveCosSdk()

/**
 * COS 直传封装（STS 临时密钥方案）。
 * 主密钥不出后端：先调 POST /api/v1/upload/credentials 换取受限临时密钥，
 * 再直传到对应前缀（用户头像 `user-avatar/<userId>/`、
 * 创建小队用的临时头像 `tmp-avatar/<userId>/`），返回完整 URL 与对象键。
 * H5 用浏览器版 SDK，小程序用微信版 SDK。
 */

const cosInstances = Object.create(null)
const credentialsCache = Object.create(null)

/** 各业务类型应下发的目录前缀，用于识别后端未更新或旧凭证缓存 */
const EXPECTED_PREFIX = {
	user: 'user-avatar/',
	temp: 'tmp-avatar/',
}

/**
 * 换取上传凭证（按业务类型分别缓存，凭证有效期内复用）。
 * @param {'user'|'temp'} [biz] 业务类型：user=用户头像，temp=创建小队前的临时头像
 * @param {{force?: boolean}} [options] force=true 时跳过缓存强制重新获取
 * @returns {Promise<{tmpSecretId:string, tmpSecretKey:string, token:string, expiredTime:number, bucket:string, region:string, prefix:string}>}
 */
async function fetchCredentials(biz = 'user', options = {}) {
	const now = Math.floor(Date.now() / 1000)
	const cached = credentialsCache[biz]
	if (!options.force && cached && cached.expiredTime && cached.expiredTime - 60 > now) {
		return cached
	}
	const data = await request({
		url: ApiPaths.uploadCredentials,
		method: 'POST',
		data: { biz },
	})
	credentialsCache[biz] = {
		tmpSecretId: data.tmpSecretId,
		tmpSecretKey: data.tmpSecretKey,
		token: data.token,
		expiredTime: data.expiredTime,
		bucket: data.bucket,
		region: data.region,
		prefix: data.prefix,
	}
	return credentialsCache[biz]
}

/**
 * 获取（复用的）COS 实例；getAuthorization 里按业务类型动态拉取临时密钥。
 * @param {'user'|'temp'} [biz] 业务类型
 */
function getCos(biz = 'user') {
	if (cosInstances[biz]) return cosInstances[biz]
	if (!COS) throw new Error('COS SDK 加载失败')
	cosInstances[biz] = new COS({
		getAuthorization: async (_options, callback) => {
			try {
				const c = await fetchCredentials(biz)
				callback({
					TmpSecretId: c.tmpSecretId,
					TmpSecretKey: c.tmpSecretKey,
					SecurityToken: c.token,
					StartTime: Math.floor(Date.now() / 1000),
					ExpiredTime: c.expiredTime,
				})
			} catch (err) {
				callback({ error: (err && err.message) || '获取上传凭证失败' })
			}
		},
	})
	return cosInstances[biz]
}

/** 从文件路径提取扩展名，取不到时回退 png */
function extOf(filePath) {
	const m = /\.([a-zA-Z0-9]+)(?:\?.*)?$/.exec(filePath || '')
	return m ? m[1].toLowerCase() : 'png'
}

/** 生成对象键：前缀 + 时间戳 + 随机串 + 扩展名 */
function randomKey(prefix, ext) {
	return `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`
}

// #ifdef H5
/**
 * H5：把裁剪结果（base64 或 blob URL）转成 Blob，供浏览器版 SDK 通过 Body 上传
 * @param {string} filePath 裁剪组件返回的 base64 或 blob URL
 * @returns {Promise<Blob>} 待上传的文件对象
 */
function fileToBlob(filePath) {
	const text = String(filePath)
	if (!text.startsWith('data:')) {
		return fetch(text).then((res) => res.blob())
	}
	const parts = text.split(',')
	const mimeMatch = /data:([^;]+);base64/.exec(parts[0] || '')
	const mime = mimeMatch ? mimeMatch[1] : 'image/png'
	const binary = atob(parts[1] || '')
	const bytes = new Uint8Array(binary.length)
	for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
	return Promise.resolve(new Blob([bytes], { type: mime }))
}
// #endif

/**
 * 上传图片（裁剪后的本地文件）到 COS。
 * 存储路径以接口换回的 `prefix`（后端按 token 中的 userId 下发）为准，
 * 避免前端 userId 与后端 token 解析出的 userId 不一致导致路径错位。
 * @param {string} filePath 本地临时文件路径（小程序文件路径 / H5 base64）
 * @param {'user'|'temp'} biz 业务类型：user=用户头像，temp=创建小队前的临时头像
 * @returns {Promise<{url: string, key: string}>} 图片完整 URL 与 COS 对象键
 */
async function uploadToCos(filePath, biz) {
	if (!filePath) throw new Error('缺少待上传的文件路径')
	let c = await fetchCredentials(biz)

	// 后端未更新或旧凭证缓存可能下发错误目录，先强制刷新一次再校验
	const expectedPrefix = EXPECTED_PREFIX[biz]
	if (expectedPrefix && !String(c.prefix || '').startsWith(expectedPrefix)) {
		c = await fetchCredentials(biz, { force: true })
	}
	if (expectedPrefix && !String(c.prefix || '').startsWith(expectedPrefix)) {
		throw new Error('上传目录配置异常，请刷新页面后重试')
	}

	// H5 先转 Blob，用于决定扩展名与 Content-Type
	let body = null
	// #ifdef H5
	body = await fileToBlob(filePath)
	// #endif
	const key = randomKey(c.prefix, (body && body.type && body.type.split('/')[1]) || extOf(filePath))
	const params = {
		Bucket: c.bucket,
		Region: c.region,
		Key: key,
		// 桶为私有读，上传时把对象设为公共读，头像才能被 <image> 直接加载
		Headers: {
			'x-cos-acl': 'public-read',
		},
	}
	// #ifdef H5
	params.Body = body
	params.ContentType = body.type || 'image/png'
	// #endif
	// #ifndef H5
	params.FilePath = filePath
	params.ContentType = `image/${extOf(filePath)}`
	// #endif

	// 浏览器版与微信版 SDK 都提供 putObject（微信版支持 FilePath）
	await new Promise((resolve, reject) => {
		getCos(biz).putObject(params, (err, data) => {
			if (err) {
				reject(err)
				return
			}
			resolve(data)
		})
	})

	return {
		url: `https://${c.bucket}.cos.${c.region}.myqcloud.com/${key}`,
		key,
	}
}

/**
 * 上传用户头像（`user-avatar/<userId>/` 前缀）。
 * @param {string} filePath 本地临时文件路径（小程序文件路径 / H5 base64）
 * @returns {Promise<string>} 头像完整 URL
 */
export async function uploadAvatar(filePath) {
	const result = await uploadToCos(filePath, 'user')
	return result.url
}

/**
 * 上传创建小队用的临时头像（`tmp-avatar/<userId>/` 前缀）。
 * 创建小队时把返回的 `key` 作为 `avatar_temp_key` 提交，
 * 由后端复制到 `unit-avatar/<squadId>/`，避免产生无头像小队。
 * @param {string} filePath 本地临时文件路径（小程序文件路径 / H5 base64）
 * @returns {Promise<{url: string, key: string}>} 临时头像 URL 与对象键
 */
export function uploadTempAvatar(filePath) {
	return uploadToCos(filePath, 'temp')
}
