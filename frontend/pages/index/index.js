// pages/index/index.js — 首页（广告版）
const app = getApp();
const api = require('../../utils/api.js');
const adMgr = require('../../utils/ad.js');

Page({
  data: {
    categories: [],
    featuredExhibits: [],

    // 广告数据（全部来自后端，禁止硬编码）
    carouselAds: [],          // 顶部轮播推广列表
    bannerAd: null,           // 底部 Banner 广告
    rewardVideoCfg: null,     // 激励视频配置

    // 广告状态
    showBanner: false,        // Banner 是否可见
    isAdFree: false,          // 是否处于免广告特权期
    adFreeRemain: 0,          // 免广告剩余分钟数
    rewardRemainToday: 0,     // 今日剩余激励视频次数
  },

  async onLoad() {
    try {
      const exhibits = await api.getExhibits();
      const uniqueCats = [...new Set(exhibits.map(e => e.category))];
      const cats = uniqueCats.map(c => ({
        id: c, name: c,
        count: exhibits.filter(e => e.category === c).length
      }));
      this.setData({ categories: cats, featuredExhibits: exhibits.slice(0, 5) });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }

    this._applyAdConfig();
  },

  onShow() {
    // 每次显示时刷新广告状态（免广告期可能已到期）
    this._refreshAdState();
  },

  /** 从 globalData 读取广告配置并应用到页面 */
  _applyAdConfig() {
    const adConfig = app.globalData.adConfig;
    if (!adConfig) {
      // 配置尚未加载完成，稍后重试
      setTimeout(() => this._applyAdConfig(), 800);
      return;
    }
    const isAdFree = adMgr.isAdFree();
    const rewardCfg = adConfig.reward_video;
    const dailyLimit = rewardCfg ? (rewardCfg.daily_limit || 2) : 2;

    this.setData({
      carouselAds: adConfig.carousel || [],
      bannerAd: adConfig.banner || null,
      rewardVideoCfg: rewardCfg || null,
      isAdFree,
      adFreeRemain: adMgr.getAdFreeRemainMinutes(),
      rewardRemainToday: dailyLimit - adMgr.getTodayRewardCount(),
      // Banner 展示条件：有配置 & 未被关闭 & 非免广告期
      showBanner: !!(adConfig.banner && !adMgr.isBannerDismissed() && !isAdFree)
    });
  },

  /** 刷新广告状态（onShow 时调用） */
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

  // ── Banner 操作 ──────────────────────────────────────────────────────────

  /** 用户点击关闭 Banner，30 分钟内不再展示 */
  onCloseBanner() {
    adMgr.dismissBanner();
    this.setData({ showBanner: false });
  },

  /** 点击 Banner 跳转（链接由后端配置） */
  onBannerTap() {
    const link = this.data.bannerAd && this.data.bannerAd.link;
    if (link) wx.navigateTo({ url: link });
  },

  // ── 激励视频 ─────────────────────────────────────────────────────────────

  /** 用户主动点击"看视频免广告"入口 */
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

  // ── 导航 ─────────────────────────────────────────────────────────────────

  goExhibits() {
    wx.switchTab({ url: '/pages/exhibits/exhibits' });
  },

  goCategory(e) {
    wx.switchTab({ url: `/pages/exhibits/exhibits?category=${e.currentTarget.dataset.id}` });
  },

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  }
});
