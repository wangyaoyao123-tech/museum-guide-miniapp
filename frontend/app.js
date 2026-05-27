const api = require('./utils/api.js');

App({
  globalData: {
    openid: '',
    isUnlocked: true,   // 新盈利模式：语音讲解全部免费开放，收入来源改为广告
    audioContext: null,
    currentExhibit: null,
    adConfig: null,     // 广告配置缓存（由后端动态下发）
  },

  onLaunch(options) {
    // 免费模式：直接标记为已解锁，无需付费
    this.globalData.isUnlocked = true;

    // 处理扫码进入
    if ([1047, 1048, 1049].includes(options.scene)) {
      try {
        const sceneStr = decodeURIComponent((options.query || {}).scene || '');
        if (sceneStr) this.globalData.scanScene = sceneStr;
      } catch (e) {}
    }

    // 预加载广告配置，缓存至 globalData 供各页面复用
    this._loadAdConfig();
  },

  onShow() {
    this.globalData.isUnlocked = true;
  },

  /** 从后端拉取广告配置并缓存，支持随时后台上下架 */
  async _loadAdConfig() {
    try {
      const adData = await api.getAds();
      this.globalData.adConfig = adData;
    } catch (e) {
      // 广告加载失败不影响主业务
      this.globalData.adConfig = { carousel: [], banner: null, reward_video: null, native: [] };
    }
  },

  // 保留兼容旧版本的 setUnlocked（免费模式下已无需调用）
  setUnlocked(openid) {
    wx.setStorageSync('unlockInfo', { isUnlocked: true, unlockTime: Date.now(), openid });
    this.globalData.isUnlocked = true;
  }
});
