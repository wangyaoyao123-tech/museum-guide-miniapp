const app = getApp();
const audioManager = require('../../utils/audio.js');
const api = require('../../utils/api.js');

Page({
  data: {
    exhibit: null,
    isUnlocked: false,
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    progress: 0
  },

  async onLoad(options) {
    try {
      const exhibit = await api.getExhibitDetail(options.id);
      this.setData({ exhibit, isUnlocked: app.globalData.isUnlocked });
      wx.setNavigationBarTitle({ title: exhibit.name });
    } catch (e) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
    this._bindAudioEvents();
  },

  onShow() {
    this.setData({ isUnlocked: app.globalData.isUnlocked });
    const state = audioManager.getState();
    if (this.data.exhibit && state.src === this.data.exhibit.audioUrl) {
      this.setData({
        isPlaying: !state.paused,
        currentTime: state.currentTime,
        duration: state.duration,
        progress: state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0
      });
    }
  },

  onUnload() {
    ['play', 'pause', 'timeupdate', 'ended', 'canplay'].forEach(e => audioManager.off(e, 'detail'));
  },

  _bindAudioEvents() {
    audioManager.on('play', 'detail', () => this.setData({ isPlaying: true }));
    audioManager.on('pause', 'detail', () => this.setData({ isPlaying: false }));
    audioManager.on('ended', 'detail', () => this.setData({ isPlaying: false, currentTime: 0, progress: 0 }));
    audioManager.on('canplay', 'detail', () => this.setData({ duration: audioManager.getState().duration }));
    audioManager.on('timeupdate', 'detail', ({ currentTime, duration }) => {
      if (duration) this.setData({ currentTime, duration, progress: (currentTime / duration) * 100 });
    });
  },

  onPlayPause() {
    if (!this.data.isUnlocked) {
      return wx.showModal({
        title: '需要解锁',
        content: '解锁后即可收听展品讲解',
        confirmText: '去解锁',
        success: res => res.confirm && wx.navigateTo({ url: '/pages/unlock/unlock' })
      });
    }
    const { exhibit, isPlaying } = this.data;
    if (!exhibit || !exhibit.audioUrl) return wx.showToast({ title: '暂无音频', icon: 'none' });
    const state = audioManager.getState();
    if (state.src === exhibit.audioUrl) {
      isPlaying ? audioManager.pause() : audioManager.play(exhibit.audioUrl);
    } else {
      this.setData({ currentTime: 0, progress: 0 });
      audioManager.play(exhibit.audioUrl);
    }
  },

  onProgressChange(e) {
    const { duration } = this.data;
    if (!duration) return;
    const seekTime = (e.detail.value / 100) * duration;
    audioManager.seek(seekTime);
    this.setData({ progress: e.detail.value, currentTime: seekTime });
  },

  goUnlock() {
    wx.navigateTo({ url: '/pages/unlock/unlock' });
  }
});
