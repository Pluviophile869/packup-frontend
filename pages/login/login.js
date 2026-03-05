// pages/login/login.js
import {
  loginUser,
  registerUser,
  getUserById
} from '../../api/user';

Page({
  data: {
    username: '',        // 改为username，与后端一致
    password: '',
    showPassword: false,
    loginLoading: false,
    loginType: 'password',
    agreementChecked: true,
    showAgreement: false,
    agreementContent: '',
    showPrivacy: false,
    privacyContent: '',
    canLoginFlag: false,
    usernameError: '',
    passwordError: ''
  },

  onLoad() {
    this.checkLoginStatus();
    this.loadAgreements();
    this.updateCanLoginFlag();
  },

  // 检查登录状态
  checkLoginStatus() {
    const token = wx.getStorageSync('token');
    const userInfo = wx.getStorageSync('userInfo');
    
    if (token && userInfo) {
      wx.reLaunch({
        url: '/pages/index/index'
      });
    }
  },

  // 清除登录状态
  clearLoginStatus() {
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
  },

  // 加载协议内容
  loadAgreements() {
    this.setData({
      agreementContent: `用户协议...`,
      privacyContent: `隐私政策...`
    });
  },

  // 更新登录按钮状态
  updateCanLoginFlag() {
    const flag = this.isValidUsername() && this.isValidPassword() && this.data.agreementChecked;
    this.setData({ canLoginFlag: flag });
  },

  // 用户名输入
  onUsernameInput(e) {
    this.setData({ 
      username: e.detail.value, 
      usernameError: '' 
    }, () => {
      this.updateCanLoginFlag();
    });
  },

  // 密码输入
  onPasswordInput(e) {
    this.setData({ 
      password: e.detail.value, 
      passwordError: '' 
    }, () => {
      this.updateCanLoginFlag();
    });
  },

  // 切换密码显示
  togglePassword() {
    this.setData({ showPassword: !this.data.showPassword });
  },

  // 查看用户协议
  viewUserAgreement() {
    this.setData({ showAgreement: true });
  },

  // 查看隐私政策
  viewPrivacyPolicy() {
    this.setData({ showPrivacy: true });
  },

  // 关闭协议弹窗
  closeAgreement() {
    this.setData({ showAgreement: false });
  },

  // 关闭隐私弹窗
  closePrivacy() {
    this.setData({ showPrivacy: false });
  },

  // 验证用户名（可以是手机号或用户名）
  isValidUsername() {
    if (!this.data.username) return false;
    return this.data.username.length >= 3;
  },

  // 验证密码
  isValidPassword() {
    return this.data.password && this.data.password.length >= 6;
  },

  // 处理登录
  async handleLogin() {
    console.log('========== 开始登录 ==========');
    
    if (this.data.loginLoading) return;
    
    if (!this.isValidUsername()) {
      wx.showToast({ title: '请输入有效的用户名/手机号', icon: 'none' });
      return;
    }

    if (!this.isValidPassword()) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    if (!this.data.agreementChecked) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    this.setData({ loginLoading: true });

    try {
      const loginData = {
        username: this.data.username,
        password: this.data.password
      };
      
      console.log('登录数据：', loginData);
      
      // 调用登录API
      const result = await loginUser(loginData);
      
      console.log('登录响应：', result);
      
      // 判断是否登录成功
      if (result && result.success === true) {
        // 登录成功
        console.log('登录成功，用户信息：', result.data);
        
        // 获取用户信息（在 data 字段中）
        let userInfo = result.data || {};
        
        // 生成token（如果后端没有返回token）
        let token = userInfo.token || result.token || `token_${userInfo.id || Date.now()}`;
        
        // 保存登录状态
        wx.setStorageSync('token', token);
        wx.setStorageSync('userInfo', userInfo);
        
        console.log('登录状态已保存');

        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
        
      } else {
        // 登录失败
        const errorMsg = result?.message || '登录失败，请检查用户名和密码';
        console.log('登录失败：', errorMsg);
        
        wx.showToast({
          title: errorMsg,
          icon: 'none'
        });
        
        this.setData({ loginLoading: false });
      }
      
    } catch (error) {
      console.error('登录请求异常：', error);
      
      // 如果catch中的错误对象包含成功信息（兼容之前的错误处理）
      if (error && error.success === true && error.data) {
        console.log('catch中检测到登录成功');
        
        let userInfo = error.data;
        let token = userInfo.token || `token_${userInfo.id || Date.now()}`;
        
        wx.setStorageSync('token', token);
        wx.setStorageSync('userInfo', userInfo);
        
        wx.showToast({
          title: '登录成功',
          icon: 'success',
          duration: 1500
        });

        setTimeout(() => {
          wx.reLaunch({ url: '/pages/index/index' });
        }, 1500);
        return;
      }
      
      wx.showToast({
        title: error?.message || '网络错误，请稍后重试',
        icon: 'none'
      });
      
      this.setData({ loginLoading: false });
    }
  },

  // 处理注册
  async handleRegister() {
    console.log('========== 开始注册 ==========');
    
    if (this.data.loginLoading) return;
    
    if (!this.isValidUsername()) {
      wx.showToast({ title: '请输入有效的用户名/手机号', icon: 'none' });
      return;
    }

    if (!this.isValidPassword()) {
      wx.showToast({ title: '密码至少6位', icon: 'none' });
      return;
    }

    if (!this.data.agreementChecked) {
      wx.showToast({ title: '请先同意用户协议和隐私政策', icon: 'none' });
      return;
    }

    this.setData({ loginLoading: true });

    try {
      const registerData = {
        username: this.data.username,
        password: this.data.password
      };
      
      console.log('注册数据：', registerData);
      
      // 调用注册API
      const result = await registerUser(registerData);
      
      console.log('注册响应：', result);
      
      // 判断是否注册成功
      if (result && result.success === true) {
        // 注册成功
        console.log('注册成功，用户信息：', result.data);
        
        // 注册成功后不清除密码，只提示注册成功，让用户手动登录
        wx.showToast({
          title: '注册成功，请登录',
          icon: 'success',
          duration: 2000
        });
        
        // 不清空密码，方便用户直接登录
        // 只清除loading状态
        this.setData({ loginLoading: false });
        
      } else {
        // 注册失败
        const errorMsg = result?.message || '注册失败，用户名可能已被注册';
        console.log('注册失败：', errorMsg);
        
        wx.showToast({ 
          title: errorMsg, 
          icon: 'none' 
        });
        
        this.setData({ loginLoading: false });
      }
      
    } catch (error) {
      console.error('注册请求异常：', error);
      
      // 如果catch中的错误对象包含成功信息
      if (error && error.success === true) {
        console.log('catch中检测到注册成功');
        
        wx.showToast({
          title: '注册成功，请登录',
          icon: 'success',
          duration: 2000
        });
        
        // 只清除loading状态，不清空密码
        this.setData({ loginLoading: false });
        return;
      }
      
      wx.showToast({ 
        title: error?.message || '网络错误，请稍后重试', 
        icon: 'none' 
      });
      
      this.setData({ loginLoading: false });
    }
  },

  // 忘记密码
  forgotPassword() {
    wx.showModal({
      title: '重置密码',
      content: '请输入您的用户名/手机号',
      editable: true,
      placeholderText: '请输入用户名/手机号',
      success: (res) => {
        if (res.confirm && res.content) {
          // TODO: 调用重置密码接口
          wx.showToast({ title: '重置密码功能开发中', icon: 'none' });
        }
      }
    });
  },

  // ========== 修改：退出登录后回到登录页面 ==========
  // 退出登录（用于测试）
  logout() {
    // 清除登录状态
    this.clearLoginStatus();
    
    // 显示退出成功提示
    wx.showToast({
      title: '已退出登录',
      icon: 'success',
      duration: 1500
    });
    
    // 延迟后跳转到登录页
    setTimeout(() => {
      // 使用 reLaunch 可以关闭所有页面，打开登录页
      wx.reLaunch({
        url: '/pages/login/login'
      });
    }, 1500);
  },
  // ========== 修改结束 ==========

  // 分享
  onShareAppMessage() {
    return {
      title: 'Packup - 智能行李清单生成器',
      path: '/pages/login/login'
    };
  }
});