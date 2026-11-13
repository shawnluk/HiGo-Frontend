/**
 * 选择单张图片
 * H5 直接使用原生 input 触发选择，避免 uni.chooseImage 首次调用时
 * 因运行时交互监听注册过晚而误报“文件选择器对话框只能在由用户激活时显示”
 * @returns {Promise<string>} 选中图片的本地路径，取消时返回空字符串
 */
export function pickSingleImage() {
	// #ifdef H5
	return new Promise((resolve) => {
		const input = document.createElement('input')
		input.type = 'file'
		input.accept = 'image/*'
		input.style.display = 'none'

		const finish = (path) => {
			if (input.parentNode) input.parentNode.removeChild(input)
			resolve(path)
		}

		input.addEventListener('change', () => {
			const file = input.files && input.files[0]
			finish(file ? URL.createObjectURL(file) : '')
		})
		input.addEventListener('cancel', () => finish(''))

		document.body.appendChild(input)
		// 必须在用户点击的同步调用栈内触发，否则浏览器会拦截文件选择框
		input.click()
	})
	// #endif

	// #ifndef H5
	return new Promise((resolve) => {
		uni.chooseImage({
			count: 1,
			sizeType: ['original', 'compressed'],
			sourceType: ['album', 'camera'],
			success: (res) => {
				resolve((res.tempFilePaths && res.tempFilePaths[0]) || '')
			},
			fail: () => resolve(''),
		})
	})
	// #endif
}
