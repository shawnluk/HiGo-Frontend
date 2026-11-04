<template>
	<PageScaffold class="messagePage" :tab-index="3">
		<!-- 顶部：标题 + 通知铃铛 -->
		<view class="messageHeader">
			<view class="headerTitleRow">
				<text class="headerTitle">消息</text>
				<view class="bellBtn" hover-class="bellBtn--pressed" hover-stay-time="120" @tap="openNoticeTab">
					<text class="bellIcon">🔔</text>
					<view v-if="hasUnread" class="bellDot"></view>
				</view>
			</view>

			<!-- 搜索：好友、群聊或圈子 -->
			<view class="searchBox">
				<view class="searchIcon"></view>
				<input
					v-model="keyword"
					class="searchInput"
					placeholder="搜索好友、群聊或圈子"
					placeholder-class="searchPlaceholder"
					confirm-type="search"
				/>
				<view v-if="keyword" class="searchClear" @tap="clearKeyword">
					<text class="searchClearText">×</text>
				</view>
			</view>

			<!-- 分类切换：私聊 / 通知 / 圈子 -->
			<view class="tabBar">
				<view
					v-for="tab in tabs"
					:key="tab.key"
					class="tabItem"
					:class="{ tabItemActive: currentTab === tab.key }"
					@tap="switchTab(tab.key)"
				>
					<text class="tabText">{{ tab.label }}</text>
					<view v-if="tab.showUnreadDot && hasUnread" class="tabDot"></view>
				</view>
			</view>
		</view>

		<!-- 会话列表 -->
		<view class="conversationList">
			<view
				v-for="item in filteredList"
				:key="item.id"
				class="conversationCard"
				hover-class="conversationCard--pressed"
				hover-stay-time="120"
				@tap="openConversation(item)"
			>
				<view
					class="avatar"
					:class="{ avatarNotice: item.category === 'notice' }"
					:style="{ background: item.avatarBg }"
				>
					<text v-if="item.category === 'notice'" class="avatarBell">🔔</text>
					<text v-else class="avatarText">{{ item.avatarText }}</text>
				</view>

				<view class="conversationMain">
					<view class="conversationTop">
						<view class="nameRow">
							<text class="conversationName">{{ item.name }}</text>
							<text v-if="item.tag" class="conversationTag">{{ item.tag }}</text>
						</view>
						<text class="conversationTime">{{ item.time }}</text>
					</view>
					<view class="conversationBottom">
						<text class="conversationPreview">{{ item.lastMsg }}</text>
						<view v-if="item.unread" class="unreadBadge">
							{{ item.unread > 99 ? '99+' : item.unread }}
						</view>
					</view>
				</view>
			</view>

			<!-- 空状态 -->
			<view v-if="!filteredList.length" class="emptyState">
				<text class="emptyTitle">暂无消息</text>
				<text class="emptyDesc">新的聊天和通知会出现在这里</text>
			</view>
		</view>
	</PageScaffold>
</template>

<script>
	import PageScaffold from '@/components/page-scaffold.vue'
	import { fetchMessageConversations } from '@/api/modules/message.js'
	import { MESSAGE_TABS } from '@/constants/message-tabs.js'

	export default {
		components: {
			PageScaffold
		},
		data() {
			return {
				currentTab: MESSAGE_TABS[0].key,
				keyword: '',
				tabs: MESSAGE_TABS.map((tab) => ({ ...tab })),
				conversations: []
			}
		},
		computed: {
			/** 当前分类下的会话列表 */
			tabList() {
				const tab = MESSAGE_TABS.find((item) => item.key === this.currentTab)
				const categories = tab && tab.categories
				if (!categories) return this.conversations
				return this.conversations.filter((item) => categories.indexOf(item.category) !== -1)
			},
			/** 关键字搜索后的会话列表 */
			filteredList() {
				const keyword = (this.keyword || '').trim()
				if (!keyword) return this.tabList
				return this.tabList.filter((item) => {
					const name = item.name || ''
					const lastMsg = item.lastMsg || ''
					return name.indexOf(keyword) !== -1 || lastMsg.indexOf(keyword) !== -1
				})
			},
			/** 是否存在未读消息（用于铃铛与通知 tab 红点） */
			hasUnread() {
				return this.conversations.some((item) => item.unread > 0)
			}
		},
		/** 页面加载：拉取会话列表 */
		onLoad() {
			this.loadConversations()
		},
		/** 下拉刷新：重新拉取会话列表 */
		async onPullDownRefresh() {
			try {
				await this.loadConversations()
			} finally {
				uni.stopPullDownRefresh()
			}
		},
		methods: {
			/** 拉取会话列表 */
			async loadConversations() {
				try {
					const list = await fetchMessageConversations()
					this.conversations = Array.isArray(list) ? list : []
				} catch (e) {
					uni.showToast({
						title: (e && e.message) || '消息加载失败',
						icon: 'none'
					})
				}
			},
			/** 切换分类 tab */
			switchTab(tab) {
				this.currentTab = tab
			},
			/** 点击铃铛：进入通知分类 */
			openNoticeTab() {
				const noticeTab = MESSAGE_TABS.find((item) => item.key === 'notice')
				if (noticeTab) this.switchTab(noticeTab.key)
			},
			/** 清空搜索关键字 */
			clearKeyword() {
				this.keyword = ''
			},
			/** 点击会话：通知类暂提示，聊天类进入聊天室 */
			openConversation(item) {
				if (item.category === 'notice') {
					uni.showToast({ title: '通知详情开发中', icon: 'none' })
					return
				}
				uni.navigateTo({
					url: `/pages/chat/chat-room?conversationId=${item.id}&squadId=${item.id}&squadName=${encodeURIComponent(item.name)}`
				})
			}
		}
	}
</script>

<style>
	/* 页面底色对齐设计稿：浅灰底 + 白色圆角会话卡片 */
	page {
		background-color: #f4f4f5;
	}

	.messagePage {
		min-height: 100vh;
		background: #f4f4f5;
	}

	/* 顶部区域：避让系统状态栏 */
	.messageHeader {
		padding: calc(var(--status-bar-height, 44rpx) + 22rpx) 24rpx 0;
	}

	.headerTitleRow {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.headerTitle {
		font-size: 64rpx;
		font-weight: 700;
		color: #111111;
		letter-spacing: 2rpx;
		line-height: 1.2;
	}

	.bellBtn {
		position: relative;
		width: 76rpx;
		height: 76rpx;
		border-radius: 50%;
		background: #ffffff;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0 6rpx 18rpx rgba(0, 0, 0, 0.06);
	}

	.bellBtn--pressed {
		opacity: 0.85;
	}

	.bellIcon {
		font-size: 34rpx;
		line-height: 1;
	}

	.bellDot {
		position: absolute;
		top: 10rpx;
		right: 12rpx;
		width: 14rpx;
		height: 14rpx;
		border-radius: 50%;
		background: #ff3b30;
		border: 2rpx solid #ffffff;
	}

	/* 搜索框：浅灰底 + 细描边胶囊 */
	.searchBox {
		display: flex;
		align-items: center;
		height: 88rpx;
		margin-top: 28rpx;
		padding: 0 26rpx;
		border-radius: 999rpx;
		background: #f7f7f7;
		border: 1rpx solid #e9e9e9;
		box-sizing: border-box;
	}

	.searchIcon {
		position: relative;
		width: 26rpx;
		height: 26rpx;
		border: 3rpx solid #b4b4b4;
		border-radius: 50%;
		flex-shrink: 0;
	}

	.searchIcon::after {
		content: '';
		position: absolute;
		right: -10rpx;
		bottom: -6rpx;
		width: 14rpx;
		height: 3rpx;
		background: #b4b4b4;
		transform: rotate(45deg);
	}

	.searchInput {
		flex: 1;
		min-width: 0;
		height: 84rpx;
		line-height: 84rpx;
		margin-left: 18rpx;
		font-size: 27rpx;
		color: #1a1a1a;
	}

	.searchPlaceholder {
		color: #a8a8a8;
	}

	.searchClear {
		width: 40rpx;
		height: 40rpx;
		margin-left: 10rpx;
		border-radius: 50%;
		background: #dedede;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.searchClearText {
		font-size: 26rpx;
		line-height: 1;
		color: #7a7a7a;
	}

	/* 分类切换 */
	.tabBar {
		display: flex;
		align-items: center;
		margin-top: 24rpx;
		padding: 6rpx;
		border-radius: 999rpx;
	}

	.tabItem {
		position: relative;
		flex: 1;
		height: 88rpx;
		border-radius: 999rpx;
		display: flex;
		align-items: center;
		justify-content: center;
		color: #6b6b6b;
		font-size: 28rpx;
		transition: color 0.2s ease, background-color 0.2s ease;
	}

	.tabItemActive {
		background: linear-gradient(135deg, #ff5a4f 0%, #ff3b30 100%);
		color: #ffffff;
		font-weight: 600;
		box-shadow: 0 10rpx 22rpx rgba(255, 59, 48, 0.22);
	}

	.tabText {
		line-height: 1;
	}

	.tabDot {
		position: absolute;
		top: 18rpx;
		right: 46rpx;
		width: 12rpx;
		height: 12rpx;
		border-radius: 50%;
		background: #ff3b30;
	}

	/* 会话列表 */
	.conversationList {
		padding: 22rpx 24rpx 24rpx;
		/* 给自定义底栏留出空间 */
		padding-bottom: calc(210rpx + env(safe-area-inset-bottom));
	}

	.conversationCard {
		display: flex;
		align-items: center;
		padding: 28rpx;
		margin-bottom: 18rpx;
		border-radius: 32rpx;
		background: #ffffff;
		box-shadow: 0 8rpx 24rpx rgba(0, 0, 0, 0.035);
	}

	.conversationCard--pressed {
		background: #fafafa;
	}

	.avatar {
		width: 128rpx;
		height: 128rpx;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
		box-shadow: inset 0 0 0 2rpx rgba(255, 255, 255, 0.18);
	}

	.avatarNotice {
		box-shadow: none;
	}

	.avatarText {
		font-size: 44rpx;
		font-weight: 700;
		color: #ffffff;
		line-height: 1;
	}

	.avatarBell {
		font-size: 44rpx;
		line-height: 1;
	}

	.conversationMain {
		flex: 1;
		min-width: 0;
		margin-left: 28rpx;
	}

	.conversationTop {
		display: flex;
		align-items: center;
		justify-content: space-between;
	}

	.nameRow {
		display: flex;
		align-items: center;
		min-width: 0;
		flex: 1;
	}

	.conversationName {
		max-width: 360rpx;
		font-size: 32rpx;
		font-weight: 700;
		color: #1a1a1a;
		line-height: 1.3;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.conversationTag {
		margin-left: 12rpx;
		padding: 4rpx 12rpx;
		border-radius: 8rpx;
		background: #f1eeff;
		color: #8b7cf6;
		font-size: 20rpx;
		font-weight: 500;
		line-height: 1.4;
		flex-shrink: 0;
	}

	.conversationTime {
		margin-left: 16rpx;
		font-size: 22rpx;
		color: #b0b0b0;
		flex-shrink: 0;
	}

	.conversationBottom {
		display: flex;
		align-items: center;
		margin-top: 12rpx;
	}

	.conversationPreview {
		flex: 1;
		min-width: 0;
		font-size: 26rpx;
		color: #9b9b9b;
		line-height: 1.4;
		overflow: hidden;
		white-space: nowrap;
		text-overflow: ellipsis;
	}

	.unreadBadge {
		min-width: 36rpx;
		height: 36rpx;
		line-height: 36rpx;
		padding: 0 9rpx;
		margin-left: 16rpx;
		border-radius: 999rpx;
		background: #ff3b30;
		color: #ffffff;
		font-size: 21rpx;
		font-weight: 600;
		text-align: center;
		box-sizing: border-box;
		flex-shrink: 0;
	}

	.emptyState {
		display: flex;
		flex-direction: column;
		align-items: center;
		padding: 120rpx 0;
	}

	.emptyTitle {
		font-size: 30rpx;
		font-weight: 600;
		color: #888888;
	}

	.emptyDesc {
		margin-top: 12rpx;
		font-size: 24rpx;
		color: #b0b0b0;
	}
</style>
