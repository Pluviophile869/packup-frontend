// utils/request.js
const BASE_URL = 'http://172.22.254.19:8080';  // 用这个 IP // 替换成你后端的实际地址

/**
 * 显示错误提示
 * @param {string} message - 错误信息
 * @param {Function} callback - 回调函数
 */
const showError = (message, callback) => {
  wx.showModal({
    title: '提示',
    content: message,
    showCancel: false,
    success: callback
  });
};

/**
 * 处理HTTP状态码
 * @param {number} statusCode - HTTP状态码
 * @param {Object} data - 响应数据
 * @returns {string} 错误信息
 */
const handleHttpStatus = (statusCode, data) => {
  switch (statusCode) {
    case 400:
      return data?.message || '请求参数错误';
    case 401:
      // token过期或未授权，清除登录状态并跳转到登录页
      wx.removeStorageSync('token');
      wx.removeStorageSync('userInfo');
      setTimeout(() => {
        wx.reLaunch({
          url: '/pages/login/login'
        });
      }, 1500);
      return '登录已过期，请重新登录';
    case 403:
      return '没有权限访问';
    case 404:
      return '请求的资源不存在';
    case 500:
      return '服务器内部错误';
    case 502:
      return '网关错误';
    case 503:
      return '服务不可用';
    case 504:
      return '网关超时';
    default:
      return data?.message || `请求失败 (${statusCode})`;
  }
};

/**
 * 请求拦截器
 * @param {Object} options - 请求配置
 * @returns {Object} 处理后的请求配置
 */
const requestInterceptor = (options) => {
  // 获取token
  const token = wx.getStorageSync('token');
  
  // 处理URL参数
  let url = options.url;
  if (options.params) {
    const queryString = Object.keys(options.params)
      .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(options.params[key])}`)
      .join('&');
    url += (url.includes('?') ? '&' : '?') + queryString;
  }

  // 设置请求头
  const header = {
    'Content-Type': 'application/json',
    ...options.header
  };

  // 添加token
  if (token) {
    header['Authorization'] = `Bearer ${token}`;
  }

  // 添加时间戳防止缓存（GET请求）
  if (options.method === 'GET' || options.method === 'get') {
    const timestamp = Date.now();
    url += (url.includes('?') ? '&' : '?') + `_t=${timestamp}`;
  }

  return {
    ...options,
    url,
    header
  };
};

/**
 * 响应拦截器 - 修复版：支持多种返回格式
 * @param {Object} response - 响应对象
 * @returns {Promise} 处理后的响应
 */
const responseInterceptor = (response) => {
  return new Promise((resolve, reject) => {
    const { statusCode, data } = response;

    console.log('【响应数据】', data);

    // 处理HTTP状态码
    if (statusCode >= 200 && statusCode < 300) {
      // 2xx 成功
      
      // ========== 修复：支持多种返回格式 ==========
      
      // 情况1: 明确是错误响应 (success === false)
      if (data && data.success === false) {
        console.log('【业务错误】', data.message);
        
        const errorMsg = data.message || '操作失败';
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
        
        reject({
          code: data.code || statusCode,
          message: errorMsg,
          data: data.data
        });
      }
      
      // 情况2: 明确是成功响应 (success === true)
      else if (data && data.success === true) {
        console.log('【ApiResponse成功】', data.message);
        // 直接返回整个响应，让调用者自己决定怎么用
        resolve(data);
      }
      
      // 情况3: 直接返回用户对象 {id: 1, username: 'xxx'}
      else if (data && data.id !== undefined) {
        console.log('【直接返回用户对象】');
        resolve(data);
      }
      
      // 情况4: 返回 {code: 200, data: {...}, message: '...'} 格式
      else if (data && (data.code === 200 || data.code === 0)) {
        console.log('【code格式成功】', data.message);
        resolve(data.data !== undefined ? data.data : data);
      }
      
      // 情况5: 返回 {code: 400, message: '...'} 等错误码
      else if (data && data.code && data.code !== 200 && data.code !== 0) {
        console.log('【code格式错误】', data.message);
        
        const errorMsg = data.message || '操作失败';
        
        wx.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2000
        });
        
        reject({
          code: data.code,
          message: errorMsg,
          data: data.data
        });
      }
      
      // 情况6: 返回 {message: '登录成功', data: {...}} 包含成功消息
      else if (data && data.message && data.message.includes('成功')) {
        console.log('【message包含成功】', data.message);
        resolve(data);
      }
      
      // 情况7: 返回 {message: '错误信息'} 但不包含成功标志
      else if (data && data.message && !data.message.includes('成功')) {
        console.log('【message包含错误】', data.message);
        
        wx.showToast({
          title: data.message,
          icon: 'none',
          duration: 2000
        });
        
        reject({
          code: statusCode,
          message: data.message,
          data: data
        });
      }
      
      // 情况8: 其他对象格式，默认resolve
      else if (data && typeof data === 'object') {
        console.log('【其他对象格式】');
        resolve(data);
      }
      
      // 情况9: 非对象格式，直接返回
      else {
        console.log('【非对象格式】');
        resolve(data);
      }
      
    } else {
      // HTTP错误
      const errorMsg = handleHttpStatus(statusCode, data);
      
      wx.showToast({
        title: errorMsg,
        icon: 'none',
        duration: 2000
      });
      
      reject({
        code: statusCode,
        message: errorMsg,
        data: data
      });
    }
  });
};

/**
 * 主请求函数
 * @param {Object} options - 请求配置
 * @returns {Promise} 请求结果
 */
const request = (options) => {
  return new Promise((resolve, reject) => {
    // 默认配置
    const defaultOptions = {
      method: 'GET',
      data: {},
      showLoading: true,      // 是否显示加载提示
      loadingText: '加载中...',
      showError: true,        // 是否显示错误提示
      retry: 0,               // 重试次数
      timeout: 30000,         // 超时时间（毫秒）
    };

    // 合并配置
    const mergedOptions = { ...defaultOptions, ...options };

    // 请求拦截
    const requestConfig = requestInterceptor(mergedOptions);

    console.log('【请求信息】', {
      url: BASE_URL + requestConfig.url,
      method: requestConfig.method,
      data: requestConfig.data,
      header: requestConfig.header
    });

    // 显示加载提示
    if (mergedOptions.showLoading) {
      wx.showLoading({
        title: mergedOptions.loadingText,
        mask: true
      });
    }

    // 记录开始时间
    const startTime = Date.now();

    // 发起请求
    wx.request({
      url: BASE_URL + requestConfig.url,
      method: requestConfig.method,
      data: requestConfig.data,
      header: requestConfig.header,
      timeout: requestConfig.timeout,
      success: (res) => {
        // 计算请求耗时
        const costTime = Date.now() - startTime;
        console.log(`【请求成功】耗时：${costTime}ms`, res);

        // 响应拦截
        responseInterceptor(res)
          .then((result) => {
            console.log('【处理后的结果】', result);
            resolve(result);
          })
          .catch((err) => {
            console.log('【处理后的错误】', err);
            reject(err);
          });
      },
      fail: (err) => {
        console.error('【请求失败】', err);

        // 网络错误处理
        let errorMsg = '网络连接失败，请检查网络设置';
        
        if (err.errMsg.includes('timeout')) {
          errorMsg = '请求超时，请重试';
        } else if (err.errMsg.includes('fail')) {
          errorMsg = '网络异常，请稍后重试';
        }

        if (mergedOptions.showError) {
          wx.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
          });
        }

        reject({
          code: -1,
          message: errorMsg,
          errMsg: err.errMsg
        });
      },
      complete: () => {
        // 隐藏加载提示
        if (mergedOptions.showLoading) {
          wx.hideLoading();
        }
      }
    });
  });
};

/**
 * GET请求
 * @param {string} url - 请求地址
 * @param {Object} params - 请求参数
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.get = (url, params = {}, options = {}) => {
  return request({
    url,
    method: 'GET',
    params,
    ...options
  });
};

/**
 * POST请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.post = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'POST',
    data,
    ...options
  });
};

/**
 * PUT请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.put = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'PUT',
    data,
    ...options
  });
};

/**
 * DELETE请求
 * @param {string} url - 请求地址
 * @param {Object} data - 请求数据
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.delete = (url, data = {}, options = {}) => {
  return request({
    url,
    method: 'DELETE',
    data,
    ...options
  });
};

/**
 * 上传文件
 * @param {string} url - 上传地址
 * @param {string} filePath - 文件路径
 * @param {Object} data - 附加数据
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.upload = (url, filePath, data = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    // 显示加载提示
    if (options.showLoading !== false) {
      wx.showLoading({
        title: options.loadingText || '上传中...',
        mask: true
      });
    }

    const uploadTask = wx.uploadFile({
      url: BASE_URL + url,
      filePath: filePath,
      name: options.fileName || 'file',
      formData: data,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        try {
          const responseData = JSON.parse(res.data);
          if (res.statusCode === 200) {
            // 同样处理各种成功格式
            if (responseData.success === false) {
              reject({
                code: responseData.code || res.statusCode,
                message: responseData.message || '上传失败',
                data: responseData.data
              });
            } else {
              resolve(responseData);
            }
          } else {
            reject({
              code: res.statusCode,
              message: responseData.message || '上传失败'
            });
          }
        } catch (e) {
          reject({
            code: -1,
            message: '上传失败，服务器返回格式错误'
          });
        }
      },
      fail: (err) => {
        reject({
          code: -1,
          message: '上传失败，请重试'
        });
      },
      complete: () => {
        if (options.showLoading !== false) {
          wx.hideLoading();
        }
      }
    });

    // 监听上传进度
    if (options.onProgress) {
      uploadTask.onProgressUpdate((res) => {
        options.onProgress(res);
      });
    }
  });
};

/**
 * 下载文件
 * @param {string} url - 下载地址
 * @param {Object} params - 请求参数
 * @param {Object} options - 其他配置
 * @returns {Promise}
 */
request.download = (url, params = {}, options = {}) => {
  return new Promise((resolve, reject) => {
    const token = wx.getStorageSync('token');

    // 处理URL参数
    let downloadUrl = BASE_URL + url;
    if (params) {
      const queryString = Object.keys(params)
        .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
        .join('&');
      downloadUrl += (downloadUrl.includes('?') ? '&' : '?') + queryString;
    }

    // 显示加载提示
    if (options.showLoading !== false) {
      wx.showLoading({
        title: options.loadingText || '下载中...',
        mask: true
      });
    }

    const downloadTask = wx.downloadFile({
      url: downloadUrl,
      header: {
        'Authorization': token ? `Bearer ${token}` : ''
      },
      success: (res) => {
        if (res.statusCode === 200) {
          resolve(res);
        } else {
          reject({
            code: res.statusCode,
            message: '下载失败'
          });
        }
      },
      fail: (err) => {
        reject({
          code: -1,
          message: '下载失败，请重试'
        });
      },
      complete: () => {
        if (options.showLoading !== false) {
          wx.hideLoading();
        }
      }
    });

    // 监听下载进度
    if (options.onProgress) {
      downloadTask.onProgressUpdate((res) => {
        options.onProgress(res);
      });
    }
  });
};

export default request;