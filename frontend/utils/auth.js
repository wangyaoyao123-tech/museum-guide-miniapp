// utils/auth.js - 用户认证与解锁状态管理
const api = require('./api');
const app = getApp();

// 获取openid（通过wx.login + 后端接口）
function getOpenid() {
  return new Promise((resolve, reject) => {
    const cached = wx.getStorageSync('openid');
    if (cached) return resolve(cached);

    wx.login({
      success: res => {
        api.request('/auth/login', 'POST', { code: res.code })
          .then(data => {
            wx.setStorageSync('openid', data.openid);
            app.globalData.openid = data.openid;
            resolve(data.openid);
          })
          .catch(reject);
      },
      fail: reject
    });
  });
}

// 检查本地解锁状态
function checkLocalUnlock() {
  try {
    const info = wx.getStorageSync('unlockInfo');
    return !!(info && info.isUnlocked);
  } catch (e) {
    return false;
  }
}

// 从后端同步解锁状态
async function syncUnlockFromCloud(openid) {
  try {
    const res = await api.checkUnlock(openid);
    if (res.isUnlocked) {
      app.setUnlocked(openid);
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
}

// 完整解锁状态检查
async function checkUnlockStatus() {
  if (checkLocalUnlock()) {
    app.globalData.isUnlocked = true;
    return true;
  }
  try {
    const openid = await getOpenid();
    return await syncUnlockFromCloud(openid);
  } catch (e) {
    return false;
  }
}

module.exports = { getOpenid, checkLocalUnlock, syncUnlockFromCloud, checkUnlockStatus };
