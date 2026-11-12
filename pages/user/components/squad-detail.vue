<template>
	<view class="pageRoot">
		<scroll-view scroll-y class="scroll" :show-scrollbar="false">
			<view class="hero">
				<image class="heroImg" :src="detail.cover" mode="aspectFill" />
				<view class="heroMask" />
				<!-- <view class="heroChips">
					<text v-if="detail.topTag" class="chip chip--soft">{{ detail.topTag }}</text>
					<text class="chip chip--accent">{{ detail.badge }}</text>
				</view> -->
				<view class="heroBottom">
					<text class="heroTitle">{{ detail.name }}</text>
					<text class="heroMeta">{{ detail.createdAtLabel }}</text>
				</view>
			</view>

			<view class="sheet">
				<view class="statRow">
					<view class="statCell">
						<text class="statNum">{{ detail.activityCount }}</text>
						<text class="statLab">小队活动</text>
					</view>
					<view class="statDivider" />
					<view class="statCell">
						<text class="statNum">{{ detail.memberCount }}</text>
						<text class="statLab">成员</text>
					</view>
				</view>

				<view class="block">
					<text class="blockTitle">小队简介</text>
					<text class="blockBody">{{ detail.intro }}</text>
				</view>

				<view class="block">
					<text class="blockTitle">成员（{{ detail.members.length }}）</text>
					<!-- 所有成员同一排展示，超出宽度横向滑动浏览；PC 端显示滚动条以便拖动 -->
					<scroll-view scroll-x class="memberScroll" :show-scrollbar="true">
						<view class="memberList">
							<view v-for="(m, i) in detail.members" :key="i" class="memberCard">
								<image class="memberAva" :src="m.avatar" mode="aspectFill" />
								<view class="memberText">
									<text class="memberName">{{ m.name }}</text>
									<!-- 仅显示队长/副队长角色，普通成员不显示「成员」文字，名称自然居中 -->
									<text v-if="m.role !== '成员'" class="memberRole">{{ m.role }}</text>
								</view>
							</view>
						</view>
					</scroll-view>
				</view>

				<view class="block">
					<text class="blockTitle">近期活动</text>
					<view v-if="detail.recentActivities.length" class="actList">
						<view
							v-for="(a, j) in detail.recentActivities"
							:key="a.id || j"
							class="actCard"
							hover-class="actCardHover"
							@click="onActivityTap(a)"
						>
							<image v-if="a.cover" class="actCover" :src="a.cover" mode="aspectFill" />
							<view class="actInfo">
								<text class="actTitle">{{ a.title }}</text>
								<text v-if="a.timeLabel" class="actMeta">{{ a.timeLabel }}</text>
								<text v-if="a.location" class="actMeta">{{ a.location }}</text>
								<view class="actFooter">
									<text class="actFee">{{ a.fee || '免费' }}</text>
									<text v-if="a.orgName" class="actOrg">{{ a.orgName }}</text>
								</view>
							</view>
						</view>
					</view>
					<view v-else class="emptyAct">
						<text class="emptyActIco">📅</text>
						<text class="emptyActTxt">暂无小队活动，去发起一场吧</text>
					</view>
				</view>

				<view v-if="detail.notice" class="hintCard">
					<text class="hintTitle">提示</text>
					<text class="hintBody">{{ detail.notice }}</text>
				</view>

				<!-- 小队管理入口：队长显示转让，成员显示退出，非成员显示加入 -->
				<view
					v-if="isCaptain"
					class="primaryActionBtn"
					hover-class="primaryActionBtnHover"
					@tap="openTransferModal"
				>
					<text class="primaryActionBtnTxt">转让队长</text>
				</view>
				<view
					v-else-if="isMember"
					class="leaveBtn"
					hover-class="leaveBtnHover"
					@tap="openLeaveModal"
				>
					<text class="leaveBtnTxt">退出小队</text>
				</view>
				<view
					v-else-if="canJoin"
					class="primaryActionBtn"
					hover-class="primaryActionBtnHover"
					@tap="openJoinModal"
				>
					<text class="primaryActionBtnTxt">加入小队</text>
				</view>
			</view>
		</scroll-view>

		<!-- 退出小队确认弹窗（自定义样式，替代默认 showModal） -->
		<view v-if="showLeaveModal" class="leaveModalMask" @tap="cancelLeave">
			<view class="leaveModalCard" @tap.stop>
				<text class="leaveModalTitle">退出小队</text>
				<text class="leaveModalDesc">确定要退出当前小队吗？</text>
				<view class="leaveModalActions">
					<view
						class="leaveModalBtn leaveModalBtnGhost"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelLeave"
					>取消</view>
					<view
						class="leaveModalBtn leaveModalBtnPrimary"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmLeave"
					>{{ leaving ? '退出中...' : '退出' }}</view>
				</view>
			</view>
		</view>

		<!-- 转让队长弹窗：仅队长可见，选择目标成员 -->
		<view v-if="showTransferModal" class="leaveModalMask" @tap="cancelTransfer">
			<view class="leaveModalCard transferCard" @tap.stop>
				<text class="leaveModalTitle">转让队长</text>
				<text class="leaveModalDesc">请选择新的队长，转让后你将变为普通成员</text>
				<scroll-view scroll-y class="transferList">
					<view
						v-for="m in transferCandidates"
						:key="m.userId"
						class="transferItem"
						:class="{ transferItemActive: String(selectedMemberId) === String(m.userId) }"
						hover-class="transferItemHover"
						@tap="selectTransferTarget(m)"
					>
						<image class="transferAva" :src="m.avatar" mode="aspectFill" />
						<view class="transferInfo">
							<text class="transferName">{{ m.name }}</text>
							<text v-if="m.role" class="transferRole">{{ m.role }}</text>
						</view>
						<text
							v-if="String(selectedMemberId) === String(m.userId)"
							class="transferCheck"
						>✓</text>
					</view>
					<view v-if="!transferCandidates.length" class="transferEmpty">
						<text class="transferEmptyTxt">暂无可转让的成员</text>
					</view>
				</scroll-view>
				<view class="leaveModalActions">
					<view
						class="leaveModalBtn leaveModalBtnGhost"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelTransfer"
					>取消</view>
					<view
						class="leaveModalBtn modalBtnPrimary"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmTransfer"
					>{{ transferring ? '转让中...' : '确认转让' }}</view>
				</view>
			</view>
		</view>

		<!-- 加入小队确认弹窗 -->
		<view v-if="showJoinModal" class="leaveModalMask" @tap="cancelJoin">
			<view class="leaveModalCard" @tap.stop>
				<text class="leaveModalTitle">加入小队</text>
				<text class="leaveModalDesc">确定要加入「{{ detail.name || '当前小队' }}」吗？</text>
				<view class="leaveModalActions">
					<view
						class="leaveModalBtn leaveModalBtnGhost"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelJoin"
					>取消</view>
					<view
						class="leaveModalBtn modalBtnPrimary"
						hover-class="leaveModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmJoin"
					>{{ joining ? '加入中...' : '加入' }}</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import {
	getMockUserSquadDetail,
	MOCK_USER_SQUAD_DEFAULT_ID,
	normalizeSquadDetail,
} from '@/mock/user-display.js'
import { fetchSquadDetail, joinSquad, leaveSquad, transferCaptain } from '@/api/modules/user.js'

export default {
	name: 'UserSquadDetail',
	data() {
		return {
			squadId: MOCK_USER_SQUAD_DEFAULT_ID,
			detail: getMockUserSquadDetail(MOCK_USER_SQUAD_DEFAULT_ID),
			showLeaveModal: false,
			leaving: false,
			currentUserId: '',
			showTransferModal: false,
			transferring: false,
			selectedMemberId: '',
			showJoinModal: false,
			joining: false,
			detailLoaded: false,
		}
	},
	computed: {
		/** 当前用户是否为队长（队长显示「转让队长」，成员显示「退出小队」） */
		isCaptain() {
			return (
				!!this.currentUserId &&
				String(this.detail.captainId) === String(this.currentUserId)
			)
		},
		/** 可转让的成员列表（排除当前用户本人） */
		transferCandidates() {
			return (this.detail.members || []).filter(
				(m) => m.userId && String(m.userId) !== String(this.currentUserId)
			)
		},
		/** 当前用户是否已在队内 */
		isMember() {
			return (this.detail.members || []).some(
				(m) => m.userId && String(m.userId) === String(this.currentUserId)
			)
		},
		/** 非成员且详情已从后端加载成功时，才允许加入 */
		canJoin() {
			return this.detailLoaded && !!this.currentUserId && !this.isMember
		},
	},
	/** 页面加载：解析路由参数 squadId，先用 Mock 兜底渲染，再请求后端详情覆盖 */
	onLoad(options) {
		const raw = options && options.squadId ? String(options.squadId) : ''
		const id = decodeURIComponent(raw) || MOCK_USER_SQUAD_DEFAULT_ID
		this.currentUserId = uni.getStorageSync('userId') || ''
		this.squadId = id
		this.detail = getMockUserSquadDetail(id)
		this.loadSquadDetail(id)
	},
	methods: {
		/**
		 * 加载小队详情。
		 * 发送 GET /api/v1/squads/:id（squadId 由调用方传入），
		 * 后端鉴权通过后返回基础信息 + 成员 + 活动，经 normalizeSquadDetail
		 * 映射为详情页视图结构；请求失败时保留 Mock 兜底数据。
		 * @param {string|number} id 小队 ID
		 */
		async loadSquadDetail(id) {
			try {
				const data = await fetchSquadDetail(id)
				if (data) {
					// 后端返回结构 → 详情页视图结构
					this.detail = normalizeSquadDetail(data)
					this.detailLoaded = true
				}
			} catch (_) {}
		},
		/**
		 * 点击活动卡片：跳转到活动详情页。
		 * 活动数据仅在首页加载活动列表时写入本地缓存（含完整 squad 字段），
		 * 这里不再写缓存，详情页会先读缓存、未命中则请求 GET /api/v1/activities/:id（带 squad 字段），
		 * 避免写入不含 squad 字段的不完整缓存导致详情页丢失小队头像/名称。
		 * @param {Object} activity recentActivities 中的活动条目
		 */
		onActivityTap(activity) {
			if (!activity || !activity.id) return
			uni.navigateTo({
				url: `/src/activity-detail/activity-detail?activity_id=${activity.id}`,
			})
		},
		/** 打开转让队长弹窗 */
		openTransferModal() {
			if (this.transferring) return
			if (!this.transferCandidates.length) {
				uni.showToast({ title: '暂无可转让的成员', icon: 'none' })
				return
			}
			this.selectedMemberId = ''
			this.showTransferModal = true
		},
		/** 关闭转让队长弹窗 */
		cancelTransfer() {
			if (this.transferring) return
			this.showTransferModal = false
		},
		/** 选择目标成员 */
		selectTransferTarget(member) {
			if (this.transferring || !member || !member.userId) return
			this.selectedMemberId = member.userId
		},
		/** 确认转让队长：调用 POST /api/v1/squads/:id/captain */
		async confirmTransfer() {
			if (this.transferring) return
			if (!this.selectedMemberId) {
				uni.showToast({ title: '请选择新的队长', icon: 'none' })
				return
			}
			this.transferring = true
			try {
				const data = await transferCaptain(this.squadId, this.selectedMemberId)
				if (data) {
					this.detail = normalizeSquadDetail(data)
				} else {
					await this.loadSquadDetail(this.squadId)
				}
				this.showTransferModal = false
				uni.showToast({ title: '已转让队长', icon: 'success' })
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '转让失败',
					icon: 'none',
				})
			} finally {
				this.transferring = false
			}
		},
		/** 打开加入小队确认弹窗 */
		openJoinModal() {
			if (this.joining) return
			this.showJoinModal = true
		},
		/** 关闭加入小队确认弹窗 */
		cancelJoin() {
			if (this.joining) return
			this.showJoinModal = false
		},
		/** 确认加入小队：调用 POST /api/v1/squads/:id/join */
		async confirmJoin() {
			if (this.joining) return
			this.joining = true
			try {
				const data = await joinSquad(this.squadId)
				if (data) {
					this.detail = normalizeSquadDetail(data)
				} else {
					await this.loadSquadDetail(this.squadId)
				}
				this.showJoinModal = false
				uni.showToast({ title: '已加入小队', icon: 'success' })
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '加入失败',
					icon: 'none',
				})
			} finally {
				this.joining = false
			}
		},
		/** 打开退出小队确认弹窗 */
		openLeaveModal() {
			if (this.leaving) return
			this.showLeaveModal = true
		},
		/** 关闭退出小队确认弹窗 */
		cancelLeave() {
			if (this.leaving) return
			this.showLeaveModal = false
		},
		/**
		 * 确认退出小队。
		 * 调用 POST /api/v1/squads/:id/leave；队长会被后端拦截并返回提示，
		 * 退出成功后返回上一页（「我的」页 onShow 会重新拉取小队列表）。
		 */
		async confirmLeave() {
			if (this.leaving) return
			this.leaving = true
			try {
				await leaveSquad(this.squadId)
				this.showLeaveModal = false
				uni.showToast({ title: '已退出小队', icon: 'success' })
				setTimeout(() => this.onBack(), 600)
			} catch (e) {
				this.leaving = false
				uni.showToast({
					title: (e && e.message) || '退出失败',
					icon: 'none',
				})
			}
		},
		/** 返回上一页，无页面栈时回到「我的」页 */
		onBack() {
			const pages = getCurrentPages()
			if (pages.length > 1) {
				uni.navigateBack()
			} else {
				uni.reLaunch({ url: '/pages/user/user' })
			}
		},
	},
}
</script>

<style scoped>
.pageRoot {
	min-height: 100vh;
	background: #f3f5fb;
}

.scroll {
	height: 100vh;
	box-sizing: border-box;
}

.hero {
	position: relative;
	height: 420rpx;
	overflow: hidden;
}

.heroImg {
	width: 100%;
	height: 100%;
}

.heroMask {
	position: absolute;
	left: 0;
	right: 0;
	bottom: 0;
	height: 220rpx;
	background: linear-gradient(180deg, rgba(0, 0, 0, 0) 0%, rgba(27, 23, 50, 0.72) 100%);
}

/* .heroChips {
	position: absolute;
	top: 24rpx;
	right: 24rpx;
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 12rpx;
} */

/* .chip {
	font-size: 22rpx;
	font-weight: 600;
	padding: 8rpx 18rpx;
	border-radius: 999rpx;
}

.chip--soft {
	color: #5d37ff;
	background: rgba(255, 255, 255, 0.92);
	border: 1rpx solid rgba(125, 95, 255, 0.28);
}

.chip--accent {
	color: #ffffff;
	background: linear-gradient(90deg, #7d5fff 0%, #ff5fb3 100%);
	box-shadow: 0 8rpx 18rpx rgba(125, 95, 255, 0.35);
} */

.heroBottom {
	position: absolute;
	left: 28rpx;
	right: 28rpx;
	bottom: 28rpx;
	display: flex;
	flex-direction: column;
	gap: 10rpx;
}

.heroTitle {
	font-size: 36rpx;
	font-weight: 700;
	color: #ffffff;
	text-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.35);
}

.heroMeta {
	font-size: 24rpx;
	color: rgba(255, 255, 255, 0.88);
}

.sheet {
	margin-top: -28rpx;
	position: relative;
	z-index: 1;
	padding: 0 24rpx 48rpx;
	padding-bottom: calc(48rpx + env(safe-area-inset-bottom));
}

.statRow {
	display: flex;
	align-items: stretch;
	background: linear-gradient(145deg, #ffffff 0%, #f8f3ff 52%, #f0faff 100%);
	border-radius: 32rpx;
	padding: 28rpx 12rpx;
	box-shadow: 0 20rpx 48rpx rgba(105, 62, 255, 0.13);
	border: 2rpx solid rgba(255, 255, 255, 0.9);
	margin-bottom: 22rpx;
}

.statCell {
	flex: 1;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
}

.statNum {
	font-size: 40rpx;
	font-weight: 700;
	color: #1b1732;
}

.statLab {
	font-size: 24rpx;
	color: #6c6392;
}

.statDivider {
	width: 2rpx;
	align-self: stretch;
	margin: 8rpx 0;
	background: linear-gradient(
		180deg,
		rgba(125, 95, 255, 0) 0%,
		rgba(125, 95, 255, 0.22) 50%,
		rgba(125, 95, 255, 0) 100%
	);
}

.block {
	background: #ffffff;
	border-radius: 28rpx;
	padding: 26rpx 24rpx;
	margin-bottom: 22rpx;
	box-shadow: 0 12rpx 32rpx rgba(50, 40, 90, 0.08);
	border: 1rpx solid rgba(255, 255, 255, 0.95);
}

.blockTitle {
	display: block;
	font-size: 28rpx;
	font-weight: 700;
	color: #1b1732;
	margin-bottom: 16rpx;
}

.blockBody {
	font-size: 26rpx;
	line-height: 1.65;
	color: #4a4468;
}

.memberScroll {
	width: 100%;
	/* 关键：scroll-view 横向滚动需 nowrap，否则部分端（H5/小程序）不触发滚动 */
	white-space: nowrap;
}

/* H5 桌面端修复：uni-app 把 scroll-view 渲染为内层 .uni-scroll-view 滚动容器，
   需 deep 选择器让其原生横向溢出并显示可拖动的细滚动条；
   小程序端无这些 web 类名与滚动条样式，不受影响 */
.memberScroll ::v-deep .uni-scroll-view {
	overflow-x: auto;
	white-space: nowrap;
}
.memberScroll ::v-deep .uni-scroll-view-content {
	display: inline-block;
	white-space: nowrap;
}
.memberScroll ::v-deep ::-webkit-scrollbar {
	height: 8rpx;
}
.memberScroll ::v-deep ::-webkit-scrollbar-thumb {
	border-radius: 4rpx;
	background: rgba(125, 95, 255, 0.35);
}
.memberScroll ::v-deep ::-webkit-scrollbar-track {
	background: transparent;
}

.memberList {
	/* 容器用 inline-block：宽度随内容收缩，超过容器宽度即可横向滚动（兼容性最好） */
	display: inline-block;
	vertical-align: top;
}

.memberCard {
	display: inline-flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 8rpx;
	/* 正方形容器：高度与宽度一致 */
	width: 120rpx;
	height: 120rpx;
	/* 用 margin 代替容器 gap，避免部分端 flex gap 不生效导致宽度计算异常 */
	margin-right: 12rpx;
	padding: 12rpx 10rpx;
	background: rgba(125, 95, 255, 0.06);
	/* border: 1rpx solid rgba(125, 95, 255, 0.12); */
	border-radius: 20rpx;
	vertical-align: top;
}

.memberAva {
	width: 100rpx;
	height: 100rpx;
	border-radius: 22rpx;
	flex-shrink: 0;
	box-shadow: 0 10rpx 22rpx rgba(50, 40, 90, 0.15);
	/* margin-top: 10rpx; */
}

.memberText {
	/* 名称与角色同行展示 */
	display: inline-flex;
	flex-direction: row;
	align-items: center;
	justify-content: center;
	gap: 6rpx;
	max-width: 100%;
}

.memberName {
	max-width: 76rpx;
	font-size: 24rpx;
	font-weight: 600;
	color: #1b1732;
	text-align: center;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.memberRole {
	font-size: 20rpx;
	color: #5d37ff;
	font-weight: 600;
	flex-shrink: 0;
}

.actList {
	display: flex;
	flex-direction: column;
	gap: 14rpx;
}

.actCard {
	display: flex;
	gap: 20rpx;
	padding: 20rpx;
	border-radius: 20rpx;
	background: rgba(125, 95, 255, 0.06);
	border: 1rpx solid rgba(125, 95, 255, 0.12);
}

/* 活动卡片点击态 */
.actCardHover {
	opacity: 0.8;
}

.actCover {
	width: 140rpx;
	height: 140rpx;
	border-radius: 16rpx;
	flex-shrink: 0;
	background: #f1edff;
}

.actInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	justify-content: center;
	gap: 8rpx;
}

.actTitle {
	font-size: 28rpx;
	font-weight: 600;
	color: #1b1732;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actMeta {
	font-size: 24rpx;
	color: #6c6392;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.actFooter {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 16rpx;
}

.actFee {
	font-size: 24rpx;
	font-weight: 600;
	color: #5d37ff;
}

.actOrg {
	font-size: 22rpx;
	color: #9a94b0;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.emptyAct {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	padding: 36rpx 16rpx;
	gap: 12rpx;
	border-radius: 20rpx;
	background: rgba(125, 95, 255, 0.05);
	border: 1rpx dashed rgba(125, 95, 255, 0.22);
}

.emptyActIco {
	font-size: 44rpx;
}

.emptyActTxt {
	font-size: 24rpx;
	color: #6c6392;
	text-align: center;
	line-height: 1.5;
}

.hintCard {
	padding: 22rpx 24rpx;
	border-radius: 24rpx;
	background: rgba(232, 244, 255, 0.95);
	border: 1rpx solid rgba(125, 95, 255, 0.12);
}

.hintTitle {
	display: block;
	font-size: 24rpx;
	font-weight: 700;
	color: #1b1732;
	margin-bottom: 10rpx;
}

.hintBody {
	font-size: 24rpx;
	line-height: 1.55;
	color: #5a5478;
}

/* 管理主操作入口（转让队长 / 加入小队） */
.primaryActionBtn {
	margin-top: 22rpx;
	height: 92rpx;
	border-radius: 24rpx;
	background: linear-gradient(90deg, #7d5fff 0%, #5d37ff 100%);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 12rpx 28rpx rgba(93, 55, 255, 0.24);
	transition: opacity 0.15s ease;
}

.primaryActionBtnHover {
	opacity: 0.82;
}

.primaryActionBtnTxt {
	font-size: 30rpx;
	font-weight: 600;
	color: #ffffff;
}

/* 退出小队入口 */
.leaveBtn {
	margin-top: 22rpx;
	height: 92rpx;
	border-radius: 24rpx;
	background: #ffffff;
	border: 1rpx solid rgba(255, 59, 48, 0.28);
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.08);
	transition: opacity 0.15s ease;
}

.leaveBtnHover {
	opacity: 0.75;
}

.leaveBtnTxt {
	font-size: 30rpx;
	font-weight: 600;
	color: #ff3b30;
}

/* 退出小队确认弹窗 */
.leaveModalMask {
	position: fixed;
	left: 0;
	right: 0;
	top: 0;
	bottom: 0;
	z-index: 1000;
	background: rgba(17, 17, 17, 0.45);
	display: flex;
	align-items: center;
	justify-content: center;
	padding: 0 60rpx;
	box-sizing: border-box;
}

.leaveModalCard {
	width: 100%;
	max-width: 560rpx;
	background: #ffffff;
	border-radius: 32rpx;
	padding: 44rpx 40rpx 32rpx;
	box-shadow: 0 24rpx 64rpx rgba(0, 0, 0, 0.18);
	display: flex;
	flex-direction: column;
	align-items: center;
	box-sizing: border-box;
	animation: leaveModalIn 0.18s ease-out;
}

.leaveModalTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
	line-height: 48rpx;
}

.leaveModalDesc {
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #999999;
	text-align: center;
}

.leaveModalActions {
	margin-top: 36rpx;
	width: 100%;
	display: flex;
	gap: 20rpx;
}

.leaveModalBtn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 24rpx;
	font-size: 30rpx;
	font-weight: 600;
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.leaveModalBtnGhost {
	background: #f3f3f5;
	color: #666666;
}

.leaveModalBtnPrimary {
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.28);
}

.leaveModalBtnPressed {
	transform: scale(0.97);
	opacity: 0.82;
}

/* 转让队长弹窗 */
.transferCard {
	max-height: 72vh;
}

.transferList {
	width: 100%;
	max-height: 44vh;
	margin-top: 24rpx;
}

.transferItem {
	display: flex;
	align-items: center;
	gap: 18rpx;
	padding: 18rpx 16rpx;
	border-radius: 20rpx;
	background: #f7f6fb;
	margin-bottom: 12rpx;
	box-sizing: border-box;
	border: 1rpx solid transparent;
}

.transferItemActive {
	background: rgba(125, 95, 255, 0.12);
	border-color: rgba(125, 95, 255, 0.36);
}

.transferItemHover {
	opacity: 0.8;
}

.transferAva {
	width: 72rpx;
	height: 72rpx;
	border-radius: 18rpx;
	background: #ece9f7;
	flex-shrink: 0;
}

.transferInfo {
	flex: 1;
	min-width: 0;
	display: flex;
	flex-direction: column;
	gap: 4rpx;
}

.transferName {
	font-size: 28rpx;
	font-weight: 600;
	color: #1b1732;
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

.transferRole {
	font-size: 22rpx;
	color: #7d5fff;
}

.transferCheck {
	font-size: 30rpx;
	font-weight: 700;
	color: #5d37ff;
	flex-shrink: 0;
}

.transferEmpty {
	padding: 40rpx 0;
	text-align: center;
}

.transferEmptyTxt {
	font-size: 24rpx;
	color: #9a94b0;
}

.modalBtnPrimary {
	background: linear-gradient(90deg, #7d5fff 0%, #5d37ff 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(93, 55, 255, 0.24);
}

@keyframes leaveModalIn {
	from {
		opacity: 0;
		transform: scale(0.92);
	}
	to {
		opacity: 1;
		transform: scale(1);
	}
}
</style>
