// pages/unlock/unlock.js - 付费解锁页逻辑
const app = getApp();
const auth = require('../../utils/auth.js');
const api = require('../../utils/api.js');

Page({
  data: {
    isUnlocked: false,
    loading: false,
    price: '29.90',
    benefits: [
      { icon: '🎵', title: '全馆语音讲解', desc: '100+件展品专业讲解音频' },
      { icon: '🔓', title: '永久解锁', desc: '一次付费，终身有效' },
      { icon: '📱', title: '多设备同步', desc: '换手机重新扫码仍可使用' },
      { icon: '🎧', title: '后台播放', desc: '边参观边收听，不影响拍照' },
    ],
  },

  onLoad() {
    this._checkUnlock();
  },

  onShow() {
    this._checkUnlock();
  },

  async _checkUnlock() {
    // 检查本地缓存
    if (app.globalData.isUnlocked) {
      this.setData({ isUnlocked: true });
      return;
    }
    // 云端同步检查
    const unlocked = await auth.checkUnlockStatus();
    this.setData({ isUnlocked: unlocked });
  },

  // 点击立即解锁
  async onUnlockTap() {
    if (this.data.loading) return;
    if (this.data.isUnlocked) {
      wx.showToast({ title: '您已解锁，无需重复购买', icon: 'none' });
      return;
    }

    this.setData({ loading: true });

    try {
      const openid = await auth.getOpenid();
      const payData = await api.createPayOrder(openid);

      await wx.requestPayment({
        timeStamp: payData.timeStamp,
        nonceStr: payData.nonceStr,
        package: payData.package,
        signType: 'RSA',
        paySign: payData.paySign
      });

      app.setUnlocked(openid);
      this.setData({ isUnlocked: true, loading: false });

      wx.showModal({
        title: '解锁成功 🎉',
        content: '语音导游已永久解锁，快去探索展品吧！',
        showCancel: false,
        confirmText: '开始导览',
        success: () => {
          wx.switchTab({ url: '/pages/exhibits/exhibits' });
        }
      });

    } catch (err) {
      this.setData({ loading: false });
      if (err.errMsg && err.errMsg.includes('cancel')) return;
      wx.showToast({ title: err.message || '支付失败', icon: 'none' });
    }
  },

  // 跳转展品列表（解锁成功后）
  goExhibits() {
    wx.switchTab({ url: '/pages/exhibits/exhibits' });
  },

  // 跳转用户协议
  goAgreement() {
    wx.navigateTo({ url: '/pages/profile/agreement' });
  },

  // 跳转隐私政策
  goPrivacy() {
    wx.navigateTo({ url: '/pages/profile/privacy' });
  },
});
