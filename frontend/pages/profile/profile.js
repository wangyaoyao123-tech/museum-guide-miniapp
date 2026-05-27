// pages/profile/profile.js — 个人中心（含激励视频入口 + 底部 Banner 广告）
const app = getApp();
const adMgr = require('../../utils/ad.js');

Page({
  data: {
    userInfo: null,

    // 广告数据（来自后端）
    bannerAd: null,
    rewardVideoCfg: null,

    // 广告状态
    showBanner: false,
    isAdFree: false,
    adFreeRemain: 0,
    rewardRemainToday: 0,
  },

  onLoad() {
    this._loadData();
  },

  onShow() {
    this._loadData();
    this._refreshAdState();
  },

  _loadData() {
    this._applyAdConfig();
  },

  _applyAdConfig() {
    const adConfig = app.globalData.adConfig;
    if (!adConfig) {
      setTimeout(() => this._applyAdConfig(), 800);
      return;
    }
    const isAdFree = adMgr.isAdFree();
    const rewardCfg = adConfig.reward_video;
    const dailyLimit = rewardCfg ? (rewardCfg.daily_limit || 2) : 2;
    this.setData({
      bannerAd: adConfig.banner || null,
      rewardVideoCfg: rewardCfg || null,
      isAdFree,
      adFreeRemain: adMgr.getAdFreeRemainMinutes(),
      rewardRemainToday: dailyLimit - adMgr.getTodayRewardCount(),
      showBanner: !!(adConfig.banner && !adMgr.isBannerDismissed() && !isAdFree)
    });
  },

  _refreshAdState() {
    const adConfig = app.globalData.adConfig;
    if (!adConfig) return;
    const isAdFree = adMgr.isAdFree();
    const rewardCfg = adConfig.reward_video;
    const dailyLimit = rewardCfg ? (rewardCfg.daily_limit || 2) : 2;
    this.setData({
      isAdFree,
      adFreeRemain: adMgr.getAdFreeRemainMinutes(),
      rewardRemainToday: dailyLimit - adMgr.getTodayRewardCount(),
      showBanner: !!(adConfig.banner && !adMgr.isBannerDismissed() && !isAdFree)
    });
  },

  // ── 激励视频 ─────────────────────────────────────────────────────────────

  onWatchRewardVideo() {
    const cfg = this.data.rewardVideoCfg;
    if (!cfg) {
      wx.showToast({ title: '暂未开放', icon: 'none' });
      return;
    }
    if (!adMgr.canWatchRewardVideo(cfg.daily_limit || 2)) {
      wx.showToast({ title: '今日观看次数已达上限', icon: 'none', duration: 2000 });
      return;
    }
    if (adMgr.isAdFree()) {
      wx.showToast({ title: `免广告特权生效中，剩余 ${adMgr.getAdFreeRemainMinutes()} 分钟`, icon: 'none', duration: 2500 });
      return;
    }

    adMgr.playRewardVideo(cfg, () => {
      adMgr.recordRewardVideoWatch();
      adMgr.setAdFree(cfg.reward_minutes || 30);
      const dailyLimit = cfg.daily_limit || 2;
      this.setData({
        isAdFree: true,
        adFreeRemain: cfg.reward_minutes || 30,
        rewardRemainToday: dailyLimit - adMgr.getTodayRewardCount(),
        showBanner: false
      });
      wx.showToast({ title: `已解锁免广告 ${cfg.reward_minutes || 30} 分钟`, icon: 'success', duration: 2500 });
    });
  },

  // ── Banner 操作 ──────────────────────────────────────────────────────────

  onCloseBanner() {
    adMgr.dismissBanner();
    this.setData({ showBanner: false });
  },

  onBannerTap() {
    const link = this.data.bannerAd && this.data.bannerAd.link;
    if (link) wx.navigateTo({ url: link });
  },

  // ── 用户信息 ─────────────────────────────────────────────────────────────

  onGetUserInfo(e) {
    if (e.detail.userInfo) {
      this.setData({ userInfo: e.detail.userInfo });
      app.globalData.userInfo = e.detail.userInfo;
    }
  },

  // ── 功能菜单 ─────────────────────────────────────────────────────────────

  goAgreement() { wx.navigateTo({ url: '/pages/profile/agreement' }); },
  goPrivacy() { wx.navigateTo({ url: '/pages/profile/privacy' }); },

  onContactTap() {
    wx.makePhoneCall({ phoneNumber: '0812-3329820' });
  },

  onAboutTap() {
    wx.showModal({
      title: '关于我们',
      content: '攀枝花中国三线建设博物馆语音导游\n版本：1.1.0（广告版）\n\n如有问题请联系：0812-3329820',
      showCancel: false,
    });
  },

  onClearCache() {
    wx.showModal({
      title: '清除缓存',
      content: '确认清除缓存？',
      success: (res) => {
        if (res.confirm) {
          wx.clearStorageSync();
          wx.showToast({ title: '缓存已清除', icon: 'success' });
          // 清除后刷新广告状态
          this._refreshAdState();
        }
      },
    });
  },
});
