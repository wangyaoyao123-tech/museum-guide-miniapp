// pages/exhibits/exhibits.js — 展品列表页（含信息流原生广告）
const app = getApp();
const api = require('../../utils/api.js');
const adMgr = require('../../utils/ad.js');

Page({
  data: {
    searchVal: '',
    activeCategory: 'all',
    categories: [{ id: 'all', name: '全部' }],
    allExhibits: [],
    displayList: [],   // 展品 + 原生广告混合后的列表

    // 广告数据（来自后端）
    nativeAds: [],     // 信息流原生广告
    bannerAd: null,    // 底部 Banner

    // 广告状态
    showBanner: false,
    isAdFree: false,
  },

  async onLoad(options) {
    this.setData({ activeCategory: options.category || 'all' });
    await this._loadData();
    this._applyAdConfig();
  },

  onShow() {
    this.setData({ isAdFree: adMgr.isAdFree() });
    this._refreshBannerState();
  },

  async _loadData() {
    try {
      const exhibits = await api.getExhibits();
      const uniqueCats = [...new Set(exhibits.map(e => e.category))];
      const cats = [{ id: 'all', name: '全部' }, ...uniqueCats.map(c => ({ id: c, name: c }))];
      this.setData({ allExhibits: exhibits, categories: cats });
      this._buildDisplayList();
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  _applyAdConfig() {
    const adConfig = app.globalData.adConfig;
    if (!adConfig) {
      setTimeout(() => this._applyAdConfig(), 800);
      return;
    }
    const isAdFree = adMgr.isAdFree();
    this.setData({
      nativeAds: adConfig.native || [],
      bannerAd: adConfig.banner || null,
      isAdFree,
      showBanner: !!(adConfig.banner && !adMgr.isBannerDismissed() && !isAdFree)
    });
    this._buildDisplayList();
  },

  _refreshBannerState() {
    const adConfig = app.globalData.adConfig;
    if (!adConfig) return;
    const isAdFree = adMgr.isAdFree();
    this.setData({
      isAdFree,
      showBanner: !!(adConfig.banner && !adMgr.isBannerDismissed() && !isAdFree)
    });
  },

  /** 过滤展品并混入原生广告 */
  _buildDisplayList() {
    const { allExhibits, activeCategory, searchVal, nativeAds, isAdFree } = this.data;
    let result = activeCategory === 'all'
      ? allExhibits
      : allExhibits.filter(e => e.category === activeCategory);
    if (searchVal.trim()) {
      const kw = searchVal.trim().toLowerCase();
      result = result.filter(e =>
        e.name.toLowerCase().includes(kw) ||
        (Array.isArray(e.tags) ? e.tags.join('') : e.tags || '').toLowerCase().includes(kw)
      );
    }
    // 非免广告期：每 10 条展品后插入 1 条原生广告
    const mixed = isAdFree ? result : adMgr.mixNativeAds(result, nativeAds);
    this.setData({ displayList: mixed });
  },

  onCategoryTap(e) {
    this.setData({ activeCategory: e.currentTarget.dataset.id });
    this._buildDisplayList();
  },

  onSearchInput(e) {
    this.setData({ searchVal: e.detail.value });
    this._buildDisplayList();
  },

  onSearchClear() {
    this.setData({ searchVal: '' });
    this._buildDisplayList();
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

  // ── 导航 ─────────────────────────────────────────────────────────────────

  goDetail(e) {
    wx.navigateTo({ url: `/pages/detail/detail?id=${e.currentTarget.dataset.id}` });
  }
});
