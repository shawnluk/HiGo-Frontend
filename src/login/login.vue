<template>
	<view class="loginPage">
		<view class="blob blobA" />
		<view class="blob blobB" />
		<view class="blob blobC" />

		<view class="hero">
			<view class="heroTitleRow">
				<text class="heroEmoji">👋</text>
				<text class="heroTitle">{{ mode === 'login' ? '欢迎回来' : '创建账号' }}</text>
			</view>
			<text class="heroSub">{{ mode === 'login' ? '登录后继续你的搭子时刻' : '注册后开启你的搭子时刻' }}</text>
		</view>

		<view class="card">
			<view class="modeTabs">
				<view
					class="modeTab"
					:class="{ active: mode === 'login' }"
					@tap="switchMode('login')"
				>登录</view>
				<view
					class="modeTab"
					:class="{ active: mode === 'register' }"
					@tap="switchMode('register')"
				>注册</view>
			</view>
			<view class="cardInner">
				<!-- 账号密码登录 / 注册：用户名 + 密码 -->
				<template v-if="mode === 'register' || loginMethod === 'password'">
					<view class="field">
						<view class="labelRow">
							<text class="labelIco">👤</text>
							<text class="label">用户名</text>
						</view>
						<input
							class="input"
							type="text"
							:value="form.username"
							placeholder="怎么称呼你？"
							placeholder-class="ph"
							:adjust-position="true"
							:cursor-spacing="24"
							@input="onUsernameInput"
						/>
					</view>
					<view class="field">
						<view class="labelRow">
							<text class="labelIco">🔒</text>
							<text class="label">密码</text>
						</view>
						<view class="inputWrap">
							<input
								class="input"
								:password="!showPassword"
								:value="form.password"
								placeholder="悄悄输入密码"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onPasswordInput"
							/>
							<view class="eyeBtn" @tap="showPassword = !showPassword">
								<uni-icons :type="showPassword ? 'eye-slash' : 'eye'" size="20" color="#999999" />
							</view>
						</view>
						<text v-if="mode === 'register'" class="fieldHint">密码需 6-10 位，仅支持中文、字母、数字、下划线和连字符</text>
					</view>
					<view v-if="mode === 'register'" class="field">
						<view class="labelRow">
							<text class="labelIco">🔒</text>
							<text class="label">确认密码</text>
						</view>
						<view class="inputWrap">
							<input
								class="input"
								:password="!showConfirmPassword"
								:value="form.confirmPassword"
								placeholder="再输入一次密码"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onConfirmPasswordInput"
							/>
							<view class="eyeBtn" @tap="showConfirmPassword = !showConfirmPassword">
								<uni-icons :type="showConfirmPassword ? 'eye-slash' : 'eye'" size="20" color="#999999" />
							</view>
						</view>
					</view>

					<!-- 注册可选：邮箱 + 手机号 + 验证码 -->
					<view v-if="mode === 'register'" class="field">
						<view class="labelRow">
							<text class="labelIco">✉️</text>
							<text class="label">邮箱（可选）</text>
						</view>
						<input
							class="input"
							type="text"
							:maxlength="128"
							:value="form.email"
							placeholder="请输入邮箱"
							placeholder-class="ph"
							:adjust-position="true"
							:cursor-spacing="24"
							@input="onEmailInput"
						/>
					</view>
					<view v-if="mode === 'register'" class="field">
						<view class="labelRow">
							<text class="labelIco">📱</text>
							<text class="label">手机号（可选）</text>
						</view>
						<view class="phoneWrap">
							<text class="phonePrefix">+86</text>
							<input
								class="input phoneInput"
								type="number"
								:maxlength="11"
								:value="form.phone"
								placeholder="请输入手机号"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onPhoneInput"
							/>
						</view>
					</view>
					<view v-if="mode === 'register'" class="field">
						<view class="labelRow">
							<text class="labelIco">🔑</text>
							<text class="label">验证码（可选）</text>
						</view>
						<view class="inputWrap">
							<input
								class="input codeInput"
								type="number"
								:maxlength="6"
								:value="form.code"
								placeholder="请输入 6 位验证码"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onCodeInput"
							/>
							<text
								class="codeBtn"
								:class="{ codeBtnDisabled: countdown > 0 }"
								@tap="handleSendCode"
							>{{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}</text>
						</view>
					</view>
				</template>

				<!-- 手机号 + 验证码登录 -->
				<template v-else>
					<view class="field">
						<view class="labelRow">
							<text class="labelIco">📱</text>
							<text class="label">手机号</text>
						</view>
						<view class="phoneWrap">
							<text class="phonePrefix">+86</text>
							<input
								class="input phoneInput"
								type="number"
								:maxlength="11"
								:value="form.phone"
								placeholder="请输入手机号"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onPhoneInput"
							/>
						</view>
					</view>
					<view class="field">
						<view class="labelRow">
							<text class="labelIco">🔑</text>
							<text class="label">验证码</text>
						</view>
						<view class="inputWrap">
							<input
								class="input codeInput"
								type="number"
								:maxlength="6"
								:value="form.code"
								placeholder="请输入 6 位验证码"
								placeholder-class="ph"
								:adjust-position="true"
								:cursor-spacing="24"
								@input="onCodeInput"
							/>
							<text
								class="codeBtn"
								:class="{ 'codeBtnDisabled': countdown > 0 }"
								@tap="handleSendCode"
							>{{ countdown > 0 ? `${countdown}s 后重发` : '获取验证码' }}</text>
						</view>
					</view>
				</template>

				<!-- 登录方式切换：手机号模式可切回账号密码 -->
				<view v-if="mode === 'login' && loginMethod === 'phone'" class="methodSwitch" @tap="toggleLoginMethod">
					<text class="methodSwitchTxt">账号密码登录</text>
					<text class="methodSwitchArrow">›</text>
				</view>

				<view class="submitWrap">
					<view class="submit" hover-class="submitHover" @tap="handleSubmit">
						<text class="submitText">{{ mode === 'login' ? '出发！' : '注册！' }}</text>
						<text class="submitArrow">→</text>
					</view>
				</view>

				<!-- 登录即同意协议 -->
				<view class="agreement">
					<view
						class="agreeCheck"
						:class="{ agreeCheckOn: agreed }"
						@tap="agreed = !agreed"
					>
						<uni-icons v-if="agreed" type="checkmarkempty" size="12" color="#ffffff" />
					</view>
					<text class="agreeTxt">{{ mode === 'login' ? '登录' : '注册' }}即同意</text>
					<text class="agreeLink" @tap="openAgreement('user')">《用户协议》</text>
					<text class="agreeTxt">和</text>
					<text class="agreeLink" @tap="openAgreement('privacy')">《隐私政策》</text>
				</view>

				<!-- 其他登录/注册方式：登录含手机号，注册仅微信（接口待接入） -->
				<view class="otherLogin">
					<view class="divider">
						<view class="dividerLine" />
						<text class="dividerTxt">{{ mode === 'login' ? '其他登录方式' : '其他注册方式' }}</text>
						<view class="dividerLine" />
					</view>
					<view class="socialRow">
						<view v-if="mode === 'login'" class="socialItem" @tap="handlePhoneMethod">
							<view class="socialBtn socialPhone">
								<uni-icons type="phone-filled" size="24" color="#ff3b30" />
							</view>
							<text class="socialLabel">手机号</text>
						</view>
						<view class="socialItem" @tap="handleSocialLogin">
							<view class="socialBtn socialWechat">
								<uni-icons type="weixin" size="24" color="#ffffff" />
							</view>
							<text class="socialLabel">微信</text>
						</view>
					</view>
				</view>

				<view class="tips">
					<text class="tipsDot">✨</text>
					<text class="tipsTxt">{{ tipsText }}</text>
				</view>
			</view>
		</view>

		<!-- 注册确认弹窗（自定义样式，替代默认 showModal） -->
		<view v-if="showRegisterModal" class="registerModalMask" @tap="cancelRegister">
			<view class="registerModalCard" @tap.stop>
				<text class="registerModalTitle">确认注册</text>
				<text class="registerModalDesc">确定以「{{ pendingUsername }}」注册账号并提交吗？</text>
				<view class="registerModalActions">
					<view
						class="registerModalBtn registerModalBtnGhost"
						hover-class="registerModalBtnPressed"
						hover-stay-time="120"
						@tap="cancelRegister"
					>再想想</view>
					<view
						class="registerModalBtn registerModalBtnPrimary"
						hover-class="registerModalBtnPressed"
						hover-stay-time="120"
						@tap="confirmRegister"
					>确认提交</view>
				</view>
			</view>
		</view>
	</view>
</template>

<script>
import { loginWithPassword, register } from '@/api/modules/auth.js'

export default {
	data() {
		return {
			mode: 'login',
			// 登录方式：password 账号密码（默认）、phone 手机号验证码
			loginMethod: 'password',
			agreed: false,
			showRegisterModal: false,
			pendingUsername: '',
			showPassword: false,
			showConfirmPassword: false,
			countdown: 0,
			codeTimer: null,
			form: {
				username: '',
				password: '',
				confirmPassword: '',
				email: '',
				phone: '',
				code: '',
			},
		}
	},
	computed: {
		/** 底部提示文案：随登录方式与登录/注册模式变化 */
		tipsText() {
			if (this.mode === 'register') return '请牢记你的账号密码，用于后续登录～'
			if (this.loginMethod === 'phone') return '未注册的手机号将自动创建账号～'
			return '新用户？随便填个账号密码先体验～'
		},
	},
	onUnload() {
		this.clearCodeTimer()
	},
	methods: {
		/** 提取输入框的值，兼容不同端的事件结构
		 * @param {Object} e 输入事件对象
		 * @returns {String} 输入的值
		 */
		inputValue(e) {
			if (e && e.detail && e.detail.value !== undefined) return e.detail.value
			if (e && e.target && e.target.value !== undefined) return e.target.value
			return ''
		},
		/** 用户名输入处理：同步到表单 */
		onUsernameInput(e) {
			this.form.username = this.inputValue(e)
		},
		/** 密码输入处理：同步到表单 */
		onPasswordInput(e) {
			this.form.password = this.inputValue(e)
		},
		/** 确认密码输入处理：同步到表单 */
		onConfirmPasswordInput(e) {
			this.form.confirmPassword = this.inputValue(e)
		},
		/** 手机号输入处理：同步到表单 */
		onPhoneInput(e) {
			this.form.phone = this.inputValue(e)
		},
		/** 邮箱输入处理：同步到表单 */
		onEmailInput(e) {
			this.form.email = this.inputValue(e)
		},
		/** 验证码输入处理：同步到表单 */
		onCodeInput(e) {
			this.form.code = this.inputValue(e)
		},
		/** 切换登录方式：账号密码 / 手机号验证码 */
		toggleLoginMethod() {
			this.loginMethod = this.loginMethod === 'password' ? 'phone' : 'password'
			this.showPassword = false
		},
		/** 从「其他登录方式」进入手机号登录 */
		handlePhoneMethod() {
			if (this.loginMethod === 'phone') return
			this.loginMethod = 'phone'
			this.showPassword = false
		},
		/** 清除验证码倒计时 */
		clearCodeTimer() {
			if (this.codeTimer) {
				clearInterval(this.codeTimer)
				this.codeTimer = null
			}
		},
		/** 获取验证码（接口待接入，先做倒计时交互） */
		handleSendCode() {
			if (this.countdown > 0) return
			const phone = (this.form.phone || '').trim()
			if (!/^1\d{10}$/.test(phone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}
			uni.showToast({ title: '验证码已发送（待接入）', icon: 'none' })
			this.countdown = 60
			this.clearCodeTimer()
			this.codeTimer = setInterval(() => {
				this.countdown -= 1
				if (this.countdown <= 0) this.clearCodeTimer()
			}, 1000)
		},
		/** 手机号验证码登录（接口待接入，暂只做校验提示） */
		handlePhoneLogin() {
			const phone = (this.form.phone || '').trim()
			const code = (this.form.code || '').trim()
			if (!/^1\d{10}$/.test(phone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}
			if (!code) {
				uni.showToast({ title: '请输入验证码', icon: 'none' })
				return
			}
			uni.showToast({ title: '手机号登录功能待接入', icon: 'none' })
		},
		/** 打开协议页面（待接入） */
		openAgreement(type) {
			const name = type === 'user' ? '用户协议' : '隐私政策'
			uni.showToast({ title: `《${name}》页面待接入`, icon: 'none' })
		},
		/** 微信登录/注册（接口待接入） */
		handleSocialLogin() {
			const action = this.mode === 'login' ? '登录' : '注册'
			uni.showToast({ title: `微信${action}功能待接入`, icon: 'none' })
		},
		/** 切换登录/注册模式，并清空密码输入
		 * @param {String} mode 目标模式：login 或 register
		 */
		switchMode(mode) {
			if (mode === this.mode) return
			this.mode = mode
			this.form.password = ''
			this.form.confirmPassword = ''
			// 注册固定使用账号密码方式，同时停止手机号验证码倒计时
			if (mode === 'register') {
				this.loginMethod = 'password'
				this.clearCodeTimer()
				this.countdown = 0
			}
		},
		/** 注册前校验，通过后打开自定义确认弹窗 */
		handleRegister() {
			const u = (this.form.username || '').trim()
			const p = (this.form.password || '').trim()
			const cp = (this.form.confirmPassword || '').trim()
			const phone = (this.form.phone || '').trim()
			const email = (this.form.email || '').trim()
			if (!u || !p) {
				uni.showToast({ title: '用户名和密码都要填哦', icon: 'none' })
				return
			}
			if (p.length < 6 || p.length > 10) {
				uni.showToast({ title: '密码长度需为 6-10 位', icon: 'none' })
				return
			}
			if (!/^[\u4e00-\u9fa5A-Za-z0-9_-]+$/.test(p)) {
				uni.showToast({ title: '密码只能包含中文、字母、数字、下划线和连字符', icon: 'none' })
				return
			}
			if (!cp) {
				uni.showToast({ title: '请再次输入确认密码', icon: 'none' })
				return
			}
			if (p !== cp) {
				uni.showToast({ title: '两次输入的密码不一致', icon: 'none' })
				return
			}
			if (phone && !/^1[3-9]\d{9}$/.test(phone)) {
				uni.showToast({ title: '请输入正确的手机号', icon: 'none' })
				return
			}
			if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
				uni.showToast({ title: '请输入正确的邮箱', icon: 'none' })
				return
			}
			this.pendingUsername = u
			this.showRegisterModal = true
		},
		/** 关闭注册确认弹窗 */
		cancelRegister() {
			this.showRegisterModal = false
		},
		/** 确认提交注册 */
		async confirmRegister() {
			this.showRegisterModal = false
			const u = (this.form.username || '').trim()
			const p = (this.form.password || '').trim()
			const phone = (this.form.phone || '').trim()
			const email = (this.form.email || '').trim()
			try {
				await register({ username: u, password: p, phone, email })
				// 注册成功后立即调用登录接口，获取完整 profile/squads 并写入本地缓存
				try {
					const res = await loginWithPassword({ username: u, password: p })
					uni.showToast({ title: '注册成功，已自动登录', icon: 'none' })
					this.goUserPage(res)
				} catch (_) {
					uni.showToast({ title: '注册成功，请登录', icon: 'none' })
					this.switchMode('login')
				}
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '注册失败',
					icon: 'none'
				})
			}
		},
		/** 登录成功后跳转「我的」页面 */
		goUserPage(res) {
			const userId = res && res.user_id !== undefined ? res.user_id : ''
			uni.redirectTo({
				url: `/pages/user/user?user_id=${userId}`,
				fail: () => {
					uni.navigateBack()
				},
			})
		},
		/** 提交处理：注册走注册流程，登录则校验后调用登录接口并跳转 */
		async handleSubmit() {
			if (!this.agreed) {
				uni.showToast({ title: '请先勾选并同意协议', icon: 'none' })
				return
			}
			if (this.mode === 'register') {
				await this.handleRegister()
				return
			}
			if (this.loginMethod === 'phone') {
				this.handlePhoneLogin()
				return
			}
			const u = (this.form.username || '').trim()
			const p = (this.form.password || '').trim()
			if (!u || !p) {
				uni.showToast({ title: '用户名和密码都要填哦', icon: 'none' })
				return
			}
			try {
				const res = await loginWithPassword({ username: u, password: p })
				this.goUserPage(res)
			} catch (e) {
				uni.showToast({
					title: (e && e.message) || '登录失败',
					icon: 'none'
				})
			}
		},
	},
}
</script>

<style scoped>
.loginPage {
	min-height: 100vh;
	padding: 24rpx 36rpx 56rpx;
	box-sizing: border-box;
	position: relative;
	overflow: hidden;
	background: linear-gradient(
		165deg,
		#fff5f2 0%,
		#fff0ec 38%,
		#fff6f3 72%,
		#fffaf8 100%
	);
}

.blob {
	position: absolute;
	border-radius: 50%;
	filter: blur(2rpx);
	pointer-events: none;
}

.blobA {
	width: 320rpx;
	height: 320rpx;
	right: -80rpx;
	top: 120rpx;
	background: radial-gradient(
		circle,
		rgba(255, 59, 48, 0.22) 0%,
		rgba(255, 122, 69, 0.1) 60%,
		transparent 70%
	);
}

.blobB {
	width: 260rpx;
	height: 260rpx;
	left: -100rpx;
	bottom: 180rpx;
	background: radial-gradient(
		circle,
		rgba(255, 148, 72, 0.3) 0%,
		rgba(255, 94, 94, 0.12) 55%,
		transparent 70%
	);
}

.blobC {
	width: 180rpx;
	height: 180rpx;
	right: 40rpx;
	bottom: 400rpx;
	background: radial-gradient(
		circle,
		rgba(255, 106, 92, 0.24) 0%,
		transparent 65%
	);
}

.hero {
	position: relative;
	z-index: 1;
	padding: 32rpx 8rpx 40rpx;
}

.heroTitleRow {
	display: flex;
	align-items: center;
	gap: 12rpx;
}

.heroEmoji {
	font-size: 52rpx;
	display: block;
	line-height: 1.25;
}

.heroTitle {
	display: block;
	font-size: 52rpx;
	font-weight: 800;
	letter-spacing: 2rpx;
	color: #1f1f1f;
	line-height: 1.25;
}

.heroSub {
	display: block;
	margin-top: 16rpx;
	font-size: 28rpx;
	color: #ff6a3d;
	font-weight: 600;
	opacity: 0.95;
}

.card {
	position: relative;
	z-index: 1;
	border-radius: 36rpx;
	padding: 4rpx;
	background: linear-gradient(
		135deg,
		rgba(255, 59, 48, 0.32),
		rgba(255, 122, 69, 0.26),
		rgba(255, 176, 120, 0.2)
	);
	box-shadow: 0 24rpx 64rpx rgba(255, 59, 48, 0.12);
}

.cardInner {
	background: #ffffff;
	border-radius: 34rpx;
	padding: 44rpx 36rpx 40rpx;
}

.modeTabs {
	display: flex;
	background: #f5f5f6;
	border-radius: 24rpx;
	padding: 8rpx;
	margin-bottom: 40rpx;
}

.modeTab {
	flex: 1;
	text-align: center;
	padding: 20rpx 0;
	font-size: 30rpx;
	font-weight: 700;
	color: #8a8a8e;
	border-radius: 18rpx;
	transition: all 0.2s ease;
}

.modeTab.active {
	color: #ffffff;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	box-shadow: 0 10rpx 24rpx rgba(255, 59, 48, 0.3);
}

.field {
	margin-bottom: 36rpx;
}

.labelRow {
	display: flex;
	align-items: center;
	gap: 10rpx;
	margin-bottom: 14rpx;
}

.labelIco {
	font-size: 30rpx;
}

.label {
	font-size: 28rpx;
	font-weight: 700;
	color: #1f1f1f;
}

.fieldHint {
	margin-top: 12rpx;
	padding-left: 8rpx;
	font-size: 22rpx;
	line-height: 1.5;
	color: #b0b0b5;
}

.input {
	width: 100%;
	min-height: 92rpx;
	line-height: 46rpx;
	padding: 22rpx 28rpx;
	border: 2rpx solid transparent;
	border-radius: 22rpx;
	font-size: 32rpx;
	color: #1f1f1f;
	background: #f7f7f8;
	box-sizing: border-box;
	box-shadow: inset 0 2rpx 8rpx rgba(0, 0, 0, 0.03);
}

.inputWrap {
	position: relative;
}

.inputWrap .input {
	padding-right: 100rpx;
}

.eyeBtn {
	position: absolute;
	right: 16rpx;
	top: 50%;
	transform: translateY(-50%);
	display: flex;
	align-items: center;
	justify-content: center;
	width: 64rpx;
	height: 64rpx;
	font-size: 36rpx;
	line-height: 1;
}

.ph {
	color: #b0b0b5;
}

/* 手机号输入：+86 前缀 */
.phoneWrap {
	position: relative;
}

.phonePrefix {
	position: absolute;
	left: 28rpx;
	top: 50%;
	transform: translateY(-50%);
	font-size: 30rpx;
	font-weight: 600;
	color: #1f1f1f;
	z-index: 1;
}

.phoneInput {
	padding-left: 108rpx !important;
}

/* 验证码输入：右侧获取按钮 */
.inputWrap .codeInput {
	padding-right: 220rpx;
}

.codeBtn {
	position: absolute;
	right: 14rpx;
	top: 50%;
	transform: translateY(-50%);
	height: 62rpx;
	line-height: 62rpx;
	padding: 0 20rpx;
	border-radius: 18rpx;
	font-size: 24rpx;
	font-weight: 600;
	color: #ff3b30;
	background: #fff0ec;
	white-space: nowrap;
}

.codeBtnDisabled {
	color: #b0b0b5;
	background: #f3f3f5;
}

/* 登录/注册即同意协议 */
.agreement {
	margin-top: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-wrap: wrap;
	gap: 8rpx;
	font-size: 22rpx;
	line-height: 1.6;
	color: #999999;
	text-align: center;
}

.agreeCheck {
	width: 32rpx;
	height: 32rpx;
	border-radius: 50%;
	border: 2rpx solid #d5d5da;
	background: #ffffff;
	box-sizing: border-box;
	display: flex;
	align-items: center;
	justify-content: center;
	flex-shrink: 0;
	transition: all 0.15s ease;
}

.agreeCheckOn {
	background: #ff3b30;
	border-color: #ff3b30;
}

.agreeTxt {
	color: #999999;
}

.agreeLink {
	color: #ff3b30;
	font-weight: 600;
}

/* 登录方式切换 */
.methodSwitch {
	margin-top: 0;
	margin-bottom: 16rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 4rpx;
}

.methodSwitchTxt {
	font-size: 26rpx;
	color: #8a8a8e;
}

.methodSwitchArrow {
	font-size: 26rpx;
	line-height: 1;
	color: #8a8a8e;
}

.submitWrap {
	margin-top: 0;
}

.submit {
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 12rpx;
	padding: 28rpx 32rpx;
	border-radius: 999rpx;
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	box-shadow: 0 16rpx 40rpx rgba(255, 59, 48, 0.32);
}

.submitHover {
	opacity: 0.9;
	transform: scale(0.98);
}

.submitText {
	font-size: 34rpx;
	font-weight: 800;
	color: #ffffff;
	letter-spacing: 4rpx;
}

.submitArrow {
	font-size: 36rpx;
	color: #ffffff;
	font-weight: bold;
}

.tips {
	margin-top: 24rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 10rpx;
	padding: 0 8rpx;
}

.tipsDot {
	font-size: 26rpx;
	line-height: 1.5;
}

.tipsTxt {
	flex: none;
	font-size: 24rpx;
	line-height: 1.55;
	color: #999999;
	text-align: center;
}

/* 其他登录方式 */
.otherLogin {
	margin-top: 36rpx;
}

.divider {
	display: flex;
	align-items: center;
	gap: 16rpx;
}

.dividerLine {
	flex: 1;
	height: 1rpx;
	background: #ebebef;
}

.dividerTxt {
	font-size: 24rpx;
	color: #b0b0b5;
	white-space: nowrap;
}

.socialRow {
	margin-top: 28rpx;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 96rpx;
}

.socialItem {
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 10rpx;
}

.socialBtn {
	width: 88rpx;
	height: 88rpx;
	border-radius: 50%;
	display: flex;
	align-items: center;
	justify-content: center;
	box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.08);
}

.socialPhone {
	background: #fff0ec;
}

.socialWechat {
	background: #07c160;
}

.socialLabel {
	font-size: 22rpx;
	color: #8a8a8e;
}

/* 注册确认弹窗（与「我的」页退出登录弹窗风格一致） */
.registerModalMask {
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

.registerModalCard {
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
	animation: registerModalIn 0.18s ease-out;
}

.registerModalTitle {
	font-size: 34rpx;
	font-weight: 700;
	color: #1f1f1f;
	line-height: 48rpx;
}

.registerModalDesc {
	margin-top: 16rpx;
	font-size: 26rpx;
	line-height: 38rpx;
	color: #999999;
	text-align: center;
}

.registerModalActions {
	margin-top: 36rpx;
	width: 100%;
	display: flex;
	gap: 20rpx;
}

.registerModalBtn {
	flex: 1;
	height: 88rpx;
	line-height: 88rpx;
	text-align: center;
	border-radius: 24rpx;
	font-size: 30rpx;
	font-weight: 600;
	transition: transform 0.15s ease, opacity 0.15s ease;
}

.registerModalBtnGhost {
	background: #f3f3f5;
	color: #666666;
}

.registerModalBtnPrimary {
	background: linear-gradient(90deg, #ff6a5c 0%, #ff3b30 100%);
	color: #ffffff;
	box-shadow: 0 12rpx 28rpx rgba(255, 59, 48, 0.28);
}

.registerModalBtnPressed {
	transform: scale(0.97);
	opacity: 0.82;
}

@keyframes registerModalIn {
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
