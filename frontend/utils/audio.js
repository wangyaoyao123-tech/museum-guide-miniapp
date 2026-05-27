// utils/audio.js - 全局音频管理器（单例）

let _audioContext = null;
let _listeners = {};
let _pendingPlay = false; // 等待资源就绪后再触发 play

/**
 * 获取全局唯一音频上下文
 */
function getAudioContext() {
  if (!_audioContext) {
    _audioContext = wx.createInnerAudioContext();
    _audioContext.obeyMuteSwitch = false;
    _bindEvents();
  }
  return _audioContext;
}

/**
 * 绑定音频事件
 */
function _bindEvents() {
  _audioContext.onPlay(() => {
    _pendingPlay = false;
    _emit('play');
  });
  _audioContext.onPause(() => _emit('pause'));
  _audioContext.onStop(() => _emit('stop'));
  _audioContext.onEnded(() => _emit('ended'));
  _audioContext.onError((err) => {
    _pendingPlay = false;
    _emit('error', err);
  });
  _audioContext.onTimeUpdate(() => {
    _emit('timeupdate', {
      currentTime: _audioContext.currentTime,
      duration: _audioContext.duration,
    });
  });
  // canplay 触发时，若有等待中的播放请求则立即播放
  _audioContext.onCanplay(() => {
    _emit('canplay');
    if (_pendingPlay) {
      _pendingPlay = false;
      _audioContext.play();
    }
  });
  _audioContext.onWaiting(() => _emit('waiting'));
}

/**
 * 播放音频
 * @param {string} url - 音频地址
 * @param {number} startTime - 开始时间（秒）
 */
function play(url, startTime = 0) {
  const ctx = getAudioContext();

  if (startTime > 0) {
    ctx.startTime = startTime;
  }

  if (ctx.src === url) {
    // 相同资源：若已暂停直接恢复，否则从头播
    if (ctx.paused) {
      ctx.play();
    }
    return;
  }

  // 切换到新资源：先 stop 再设置 src，等待 canplay 后播放
  _pendingPlay = true;
  ctx.stop();
  ctx.src = url;
  // 部分机型设置 src 后会立即触发 canplay，部分需要等待网络
  // 统一由 onCanplay 回调中检查 _pendingPlay 来触发 play
}

/**
 * 暂停
 */
function pause() {
  _pendingPlay = false;
  if (_audioContext) _audioContext.pause();
}

/**
 * 停止并重置
 */
function stop() {
  _pendingPlay = false;
  if (_audioContext) {
    _audioContext.stop();
    _audioContext.src = '';
  }
}

/**
 * 跳转到指定时间
 * @param {number} time - 秒
 */
function seek(time) {
  if (_audioContext) _audioContext.seek(time);
}

/**
 * 获取当前播放状态
 */
function getState() {
  if (!_audioContext) return { paused: true, currentTime: 0, duration: 0, src: '' };
  return {
    paused: _audioContext.paused,
    currentTime: _audioContext.currentTime,
    duration: _audioContext.duration,
    src: _audioContext.src,
  };
}

/**
 * 注册事件监听
 * @param {string} event - 事件名
 * @param {string} key - 监听器唯一key（页面路径）
 * @param {Function} fn - 回调
 */
function on(event, key, fn) {
  if (!_listeners[event]) _listeners[event] = {};
  _listeners[event][key] = fn;
}

/**
 * 移除事件监听
 */
function off(event, key) {
  if (_listeners[event]) delete _listeners[event][key];
}

function _emit(event, data) {
  if (!_listeners[event]) return;
  Object.values(_listeners[event]).forEach(fn => fn(data));
}

/**
 * 销毁音频上下文（退出小程序时调用）
 */
function destroy() {
  _pendingPlay = false;
  if (_audioContext) {
    _audioContext.destroy();
    _audioContext = null;
    _listeners = {};
  }
}

module.exports = { getAudioContext, play, pause, stop, seek, getState, on, off, destroy };
