<template>
	<view class="cardList">
		<view
			v-for="(data, index) in filteredItems"
			:key="data.activity_id || data.id || index"
			class="card"
			@click="handleCardClick(data)"
		>
			<!-- 封面图 -->
			<view class="coverWrap">
				<image class="cover" :src="data.cover" mode="aspectFill" />
				<view class="coverMask"></view>

				<!-- 左上角：分类标签 + 热度 -->
				<view class="coverTopRow">
					<view v-if="data.category_name" class="categoryTag" :style="{ background: categoryTagBg(data) }">
						<text class="categoryTagText" :style="{ color: categoryTagColor(data) }">{{ data.category_name }}</text>
					</view>
					<view class="heatBadge" @click.stop="reportHot(data.activity_id || data.id)">
						<text class="heatBadgeText"> 🔥热度 {{ data.hot}}</text>
					</view>
				</view>

				<!-- 右上角收藏 -->
				<view class="favBtn" :class="{ favActive: isFav(data) }" @click.stop="toggleFav(data)">
					<text class="favIcon">{{ isFav(data) ? '♥' : '♡' }}</text>
				</view>
			</view>

			<!-- 信息区 -->
			<view class="body">
				<text class="title" :number-of-lines="2">{{ data.title }}</text>

				<view class="metaLine">
					<text class="metaIcon">📍</text>
					<text class="metaLocation" :number-of-lines="1">{{ data.location_text }}</text>
					<text v-if="shortTime(data)" class="metaSeperator">·</text>
					<text v-if="shortTime(data)" class="metaTime">🕐 {{ shortTime(data) }}</text>
				</view>

				<view class="footer">
					<view class="left">
						<scroll-view class="avatarScroller" scroll-x="true" :show-scrollbar="true">
							<view class="avatarStack">
								<image
									v-for="(m, idx) in getActivityMembers(data)"
									:key="idx"
									class="ava"
									:src="m.avatar || m"
									mode="aspectFill"
								/>
							</view>
						</scroll-view>
						<text class="joinCount">{{ getActivityJoinCount(data) }} 人报名</text>
					</view>

					<view class="right">
						<text v-if="feeText(data)" class="price">{{ feeText(data) }}</text>
						<view class="signupBtn" @click.stop="handleSignup(data)">
							<text class="signupText">立即报名</text>
						</view>
					</view>
				</view>
			</view>
		</view>

		<view class="loadStatus" v-if="filteredItems.length">
			<view class="loadingRow" v-if="loading">
				<view class="spinner"></view>
				<text class="loadingText">加载中...</text>
			</view>
			<text v-else-if="!hasMore">没有更多了</text>
		</view>

		<!-- 登录提示弹窗（统一复用登录弹窗组件） -->
		<LoginModal
			:visible="loginVisible"
			title="需要登录"
			:content="loginContent"
			@update:visible="loginVisible = $event"
		/>
	</view>
</template>

<script>
import { fetchHomeActivityList, reportActivityView, applyHotResult } from '@/api/modules/activity.js'
import { cacheActivities, getCachedActivity } from '@/utils/activity-cache.js'
import LoginModal from '@/components/login-modal.vue'

export default {
	name: 'HomeActivityCard',
	components: { LoginModal },
	data() {
		return {
			activityList: [],
			filteredItems: [],
			/** 收藏标记（activity_id -> boolean） */
			favIds: {},
			/** 当前选中的分类，下拉刷新后沿用 */
			currentCategoryId: null,
			/** 每页加载条数 */
			pageSize: 10,
			/** 当前偏移量 */
			offset: 0,
			/** 是否还有下一页 */
			hasMore: true,
			/** 是否正在加载 */
			loading: false,
			/** 登录提示弹窗显隐与文案 */
			loginVisible: false,
			loginContent: '',
		}
	},
	/** 页面创建：加载首页活动数据并监听分类切换事件 */
	async created() {
		await this.refresh()
		if (uni && typeof uni.$on === 'function') {
			uni.$on('index:category-change', this.handleCategoryFilter)
		}
	},
	/** 组件销毁：解绑全局分类切换事件监听 */
	beforeDestroy() {
		if (uni && typeof uni.$off === 'function') {
			uni.$off('index:category-change', this.handleCategoryFilter)
		}
	},
	methods: {
		/** 下拉刷新：重置偏移量并重新加载，保留当前分类筛选状态 */
		async refresh() {
			this.offset = 0
			this.hasMore = true
			this.activityList = []
			await this.fetchPage()
		},
		/** 上拉加载下一页（底部"加载中"持续 3 秒后再加载） */
		async loadMore() {
			if (!this.hasMore || this.loading) return
			this.offset += this.pageSize
			this.loading = true
			try {
				await this.delay(3000)
				await this.fetchPage()
			} finally {
				this.loading = false
			}
		},
		/** 按当前偏移量请求一页活动数据 */
		async fetchPage() {
			try {
				const res = await fetchHomeActivityList({
					offset: this.offset,
					limit: this.pageSize,
				})
				console.log('[HiGo] 首页活动列表返回值 =>', res)
				const { items, total } = this.normalizeActivityResult(res)
				// 首页列表接口已返回 squad_avatar/squad_name/activity_member，写入本地缓存时显式补齐默认值，
				// 保证详情页从缓存读取的数据携带所属小队信息与报名成员列表
				const cacheItems = items.map((item) => ({
					...item,
					squad_avatar: item.squad_avatar || '',
					squad_name: item.squad_name || '',
					activity_member: item.activity_member || [],
				}))
				cacheActivities(cacheItems)
				if (items.length <= this.pageSize) {
					// 情况一：后端已实现分页，返回当前页数据（不超过一页）
					this.activityList = this.offset === 0 ? items : this.activityList.concat(items)
					this.hasMore = total != null
						? this.offset + this.pageSize < total
						: items.length >= this.pageSize
				} else {
					// 情况二：后端未做分页，返回全量数据，前端本地切片
					const pageItems = items.slice(this.offset, this.offset + this.pageSize)
					this.activityList = this.offset === 0 ? pageItems : this.activityList.concat(pageItems)
					this.hasMore = this.offset + this.pageSize < items.length
				}
				this.applyCategoryFilter(this.currentCategoryId)
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '活动列表加载失败',
					icon: 'none',
				})
			}
		},
		/** 延时工具，返回 Promise */
		delay(ms) {
			return new Promise((resolve) => setTimeout(resolve, ms))
		},
		/** 兼容后端返回数组或 { list/records/items, total } 两种分页结构 */
		normalizeActivityResult(res) {
			if (Array.isArray(res)) {
				return { items: res, total: null }
			}
			if (res && typeof res === 'object') {
				const list = res.list || res.records || res.items || res.rows || []
				const rawTotal = res.total != null ? res.total : res.totalCount
				return {
					items: Array.isArray(list) ? list : [],
					total: rawTotal != null ? Number(rawTotal) : null,
				}
			}
			return { items: [], total: null }
		},
		/** 解析活动参与成员列表：兼容后端返回的 members / activity_member / joinAvatars */
		getActivityMembers(data) {
			const list = data && (data.members || data.activity_member || data.joinAvatars)
			return Array.isArray(list) ? list : []
		},
		/** 参与人数：优先取后端 joinCount / member_count，其次取成员列表长度 */
		getActivityJoinCount(data) {
			if (data && data.joinCount != null) return Number(data.joinCount) || 0
			if (data && data.member_count != null) return Number(data.member_count) || 0
			return this.getActivityMembers(data).length
		},
		/** 热度显示：读取 data.hot，缺失时兼容 data.heat/0 避免空白 */
		displayHot(data) {
			const hot = data && (data.hot != null ? data.hot : data.heat)
			return Number(hot) || 0
		},
		/** 分类标签背景色（按 category_id 区分） */
		categoryTagBg(data) {
			const palette = {
				1: '#e8f4fd',
				2: '#f0ebfd',
				3: '#e8f7ef',
				4: '#fdf0e8',
				5: '#fdefef',
			}
			return palette[data && data.category_id] || '#f5f5f5'
		},
		/** 分类标签文字色（与背景同色系加深） */
		categoryTagColor(data) {
			const palette = {
				1: '#2f80ed',
				2: '#7b61ff',
				3: '#27ae60',
				4: '#f2994a',
				5: '#eb5757',
			}
			return palette[data && data.category_id] || '#888888'
		},
		/** 从费用文案中提取简短价格（如 fee_note 中的 ¥35） */
		feeText(data) {
			const s = data && (data.fee_note || data.price || '')
			if (!s) return ''
			const str = String(s)
			const m = str.match(/¥\s*([\d.]+)/)
			if (m) return `¥${m[1]}`
			if (str.includes('免费')) return '免费'
			return ''
		},
		/** 展示封面的时间：「4月24日 19时30分 周五」 */
		shortTime(data) {
			const t = data && data.time_text
			if (!t) return ''
			const s = String(t).trim()
			const [datePart, timePart] = s.split(' ')
			if (!datePart || !timePart) return ''
			const seg = datePart.split('-')
			const y = Number(seg[0])
			const m = Number(seg[1])
			const d = Number(seg[2])
			if (!y || !m || !d) return ''
			const date = new Date(y, m - 1, d)
			const week = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
			const wd = week[date.getDay()] || ''
			const hm = timePart.split(':')
			const hour = Number(hm[0]) || 0
			const minute = hm[1] || '00'
			return `${m}月${d}日 ${hour}时${minute}分 ${wd}`
		},
		/** 是否已收藏 */
		isFav(data) {
			const id = data && (data.activity_id || data.id)
			return id != null && !!this.favIds[id]
		},
		/** 打开登录提示弹窗 */
		promptLogin(content) {
			this.loginContent = content
			this.loginVisible = true
		},
		/** 切换收藏状态（仅登录用户可收藏，后端收藏接口后续接入） */
		toggleFav(data) {
			const token = uni.getStorageSync('token')
			if (!token) {
				this.promptLogin('登录后即可收藏活动')
				return
			}
			const id = data && (data.activity_id || data.id)
			if (id == null) return
			this.$set(this.favIds, String(id), !this.favIds[id])
		},
		/** 立即报名：与活动详情页保持一致，未登录先拦截登录，已登录进入报名确认页（仅传 activity_id） */
		handleSignup(data) {
			const activityId = data && (data.activity_id || data.id)
			let token = ''
			try {
				token = uni.getStorageSync('token')
			} catch (_) {}
			if (!token) {
				this.promptLogin('登录后即可报名活动')
				return
			}
			if (!activityId) {
				uni.showToast({ title: '缺少活动编号', icon: 'none' })
				return
			}
			uni.navigateTo({
				url: `/src/activity-enroll/activity-enroll?activity_id=${encodeURIComponent(activityId)}`,
			})
		},
		/** 点击活动卡片：跳转到活动详情页，并异步上报一次热度（fire-and-forget，失败静默） */
		handleCardClick(item) {
			console.log('[HiGo] 点击活动卡片 activity_id =>', item.activity_id || item.id)
			const activity_id = item.activity_id || item.id
			this.reportHot(activity_id)
			uni.redirectTo({
				url: `/src/activity-detail/activity-detail?activity_id=${activity_id}`
			})
		},
		/** 上报热度：成功后按返回结果反写当前列表与本地缓存中的该项 hot */
		async reportHot(activityId) {
			let result
			try {
				result = await reportActivityView(activityId)
			} catch (_) {
				result = null
			}
			if (!result) return
			const item = this.findActivityById(activityId)
			const updated = applyHotResult(item, result)
			if (updated && updated !== item) this.replaceActivity(updated)
		},
		/** 在列表与筛选结果中按活动 ID 定位当前条目 */
		findActivityById(activityId) {
			const id = String(activityId)
			const find = (arr) => arr.find((it) => String(it.activity_id || it.id) === id)
			return find(this.activityList) || find(this.filteredItems) || null
		},
		/** 用更新后的条目替换内存列表中的对应项，保持热度实时同步显示 */
		replaceActivity(updated) {
			if (!updated) return
			const id = String(updated.activity_id || updated.id)
			const replaceIn = (arr) => {
				const idx = arr.findIndex((it) => String(it.activity_id || it.id) === id)
				if (idx !== -1) arr.splice(idx, 1, updated)
			}
			replaceIn(this.activityList)
			replaceIn(this.filteredItems)
		},
		/** 按当前分类筛选活动列表并标记选中态 */
		applyCategoryFilter(categoryId) {
			if (!categoryId) {
				this.filteredItems = this.activityList.map((item) => ({
					...item,
					isActive: true,
				}))
				return
			}
			this.filteredItems = this.activityList
				.filter((item) => item.category_id === categoryId)
				.map((item) => ({ ...item, isActive: true }))
		},
		/** 接收分类切换事件并应用筛选 */
		handleCategoryFilter(payload) {
			const category_id = payload && payload.category_id ? payload.category_id : null
			this.currentCategoryId = category_id
			this.applyCategoryFilter(category_id)
		},
		/** 返回首页时调用：从本地缓存读取最新热度并同步到列表 */
		syncHotFromCache() {
			const sync = (arr) => {
				if (!Array.isArray(arr)) return false
				let changed = false
				arr.forEach((it) => {
					if (!it) return
					const key = String(it.activity_id != null ? it.activity_id : it.id)
					if (!key) return
					const cached = getCachedActivity(key)
					if (cached && cached.hot != null && Number(cached.hot) !== Number(it.hot || 0)) {
						it.hot = Number(cached.hot)
						changed = true
					}
				})
				return changed
			}
			const changed = sync(this.activityList)
			if (changed) {
				this.activityList = this.activityList.map((it) => ({ ...it }))
				this.applyCategoryFilter(this.currentCategoryId)
			}
		},
	},
}
</script>

<style scoped>
.cardList {
	display: flex;
	flex-direction: column;
	gap: 24rpx;
}

.loadStatus {
	display: flex;
	justify-content: center;
	align-items: center;
	padding: 16rpx 0 8rpx;
	font-size: 24rpx;
	color: #9b9b9b;
}

.loadingRow {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.loadingText {
	font-size: 24rpx;
	color: #9b9b9b;
}

.spinner {
	width: 28rpx;
	height: 28rpx;
	border: 4rpx solid #f0e3e2;
	border-top-color: #e8453c;
	border-radius: 50%;
	animation: load-spin 0.8s linear infinite;
}

@keyframes load-spin {
	to {
		transform: rotate(360deg);
	}
}

.card {
	background: #ffffff;
	border-radius: 32rpx;
	overflow: hidden;
	box-shadow: 0 12rpx 32rpx rgba(0, 0, 0, 0.08);
	display: flex;
	flex-direction: column;
}

.coverWrap {
	position: relative;
	width: 100%;
	height: 320rpx;
}

.cover {
	width: 100%;
	height: 100%;
	background: #eaeaea;
}

.coverMask {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 130rpx;
	background: linear-gradient(to top, rgba(0, 0, 0, 0.55), rgba(0, 0, 0, 0));
}

.coverTopRow {
	position: absolute;
	left: 20rpx;
	top: 20rpx;
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.categoryTag {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8rpx 22rpx;
	border-radius: 999rpx;
}

.categoryTagText {
	font-size: 22rpx;
	font-weight: 600;
}

.heatBadge {
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 8rpx 22rpx;
	border-radius: 999rpx;
	background: #fff3e0;
}

.heatBadgeText {
	color: #ff6b35;
	font-size: 22rpx;
	font-weight: 600;
}

.favBtn {
	position: absolute;
	right: 20rpx;
	top: 20rpx;
	width: 60rpx;
	height: 60rpx;
	border-radius: 50%;
	background: rgba(255, 255, 255, 0.92);
	display: flex;
	align-items: center;
	justify-content: center;
}

.favIcon {
	font-size: 34rpx;
	color: #999999;
}

.favActive .favIcon {
	color: #e8453c;
}

.body {
	padding: 24rpx;
	display: flex;
	flex-direction: column;
}

.title {
	font-size: 30rpx;
	line-height: 42rpx;
	font-weight: 700;
	color: #1f1f1f;
}

.metaLine {
	margin-top: 14rpx;
	display: flex;
	align-items: center;
	min-width: 0;
}

.metaIcon {
	font-size: 22rpx;
	margin-right: 6rpx;
	flex-shrink: 0;
}

.metaLocation {
	flex: 1;
	min-width: 0;
	font-size: 24rpx;
	color: #999999;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.metaSeperator {
	margin: 0 10rpx;
	color: #cccccc;
	font-size: 22rpx;
	flex-shrink: 0;
}

.metaTime {
	flex-shrink: 0;
	font-size: 24rpx;
	color: #999999;
}

.footer {
	margin-top: 20rpx;
	padding-top: 20rpx;
	border-top: 1rpx solid #f0f0f0;
	display: flex;
	align-items: center;
	justify-content: space-between;
}

.left {
	display: flex;
	align-items: center;
	min-width: 0;
	flex: 1;
}

.avatarScroller {
	width: 104rpx;
	height: 56rpx;
	flex-shrink: 0;
	white-space: nowrap;
}

/* H5 端显示底部横向滚动条 */
.avatarScroller ::v-deep ::-webkit-scrollbar {
	height: 6rpx;
}

.avatarScroller ::v-deep ::-webkit-scrollbar-track {
	background: #f0f0f0;
	border-radius: 3rpx;
}

.avatarScroller ::v-deep ::-webkit-scrollbar-thumb {
	background: #e8453c;
	border-radius: 3rpx;
}

.avatarStack {
	display: inline-flex;
	align-items: center;
	white-space: nowrap;
}

.ava {
	width: 44rpx;
	height: 44rpx;
	border-radius: 50%;
	border: 2rpx solid #ffffff;
	background: #f2f2f2;
	margin-right: -16rpx;
	flex-shrink: 0;
}

.joinCount {
	margin-left: 20rpx;
	font-size: 24rpx;
	color: #999999;
	flex-shrink: 0;
}

.right {
	display: flex;
	align-items: center;
}

.price {
	font-size: 30rpx;
	color: #ff7a00;
	font-weight: 700;
	margin-right: 16rpx;
}

.signupBtn {
	height: 60rpx;
	padding: 0 28rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #e8453c, #ff5f4a);
	display: flex;
	align-items: center;
	box-shadow: 0 8rpx 18rpx rgba(232, 69, 60, 0.3);
}

.signupText {
	color: #ffffff;
	font-size: 24rpx;
	font-weight: 600;
}
</style>