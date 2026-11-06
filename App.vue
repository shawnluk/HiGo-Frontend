<script>
	export default {
		/** 应用启动时触发 */
		onLaunch: function() {
			console.log('[HiGo] App Launch')
		},
		/** 应用从后台进入前台时触发 */
		onShow: function() {
			console.log('App Show')
		},
		/** 应用进入后台时触发 */
		onHide: function() {
			console.log('[HiGo] App Hide')
		}
	}
</script>

<style>
	/*每个页面公共css */
	/* 全局字体：所有文字、数字、字母统一使用微软雅黑 */
	page,
	view,
	text,
	button,
	input,
	textarea,
	scroll-view,
	picker,
	label {
		font-family: 'Microsoft YaHei', '微软雅黑', -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Hiragino Sans GB', 'Helvetica Neue', Arial, sans-serif;
	}
</style>
