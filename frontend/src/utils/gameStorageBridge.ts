/**
 * 🌸 GameStorageBridge - 嵌入到游戏 iframe 中的存储 SDK
 * 文件: frontend/src/utils/gameStorageBridge.ts
 *
 * 使用方式：在 GameView.vue 中监听 postMessage，
 * 游戏 HTML 内通过 window.parent.postMessage 调用存储 API。
 *
 * 游戏 HTML 内调用示例（见下方 GAME_SDK_SNIPPET）：
 *   GameStorage.save(0, { level: 3, hp: 80 })
 *   GameStorage.load(0).then(save => console.log(save))
 *   GameStorage.setProgress({ highScore: 999 })
 */

// ─── 宿主页面监听逻辑（在 GameView.vue 的 onMounted 中注册）───

import {
    writeSave, getSave, getSaves, deleteSave,
    updateProgress, getProgress,
    patchSettings, getSettings,
} from '@/composables/useGameStorage'

export interface BridgeMessage {
    type: 'GAME_STORAGE'
    action: string
    gameId: number
    requestId: string
    payload?: Record<string, unknown>
}

export function setupStorageBridge(iframeRef: HTMLIFrameElement | null) {
    function handleMessage(event: MessageEvent) {
        // 安全检查：只处理来自 iframe 的消息
        if (!iframeRef || event.source !== iframeRef.contentWindow) return

        const msg = event.data as BridgeMessage
        if (!msg || msg.type !== 'GAME_STORAGE') return

        const { action, gameId, requestId, payload } = msg

        let result: unknown = null
        let error: string | null = null

        try {
            switch (action) {
                // 存档
                case 'SAVE':
                    result = writeSave(
                        gameId,
                        payload!.slot as number,
                        payload!.data as Record<string, unknown>,
                        payload as { name?: string; screenshot?: string; playtime?: number }
                    )
                    break
                case 'LOAD':
                    result = getSave(gameId, payload!.slot as number)
                    break
                case 'LIST_SAVES':
                    result = getSaves(gameId)
                    break
                case 'DELETE_SAVE':
                    result = deleteSave(gameId, payload!.slot as number)
                    break

                // 进度
                case 'GET_PROGRESS':
                    result = getProgress(gameId)
                    break
                case 'SET_PROGRESS':
                    result = updateProgress(gameId, payload as never)
                    break

                // 设置
                case 'GET_SETTINGS':
                    result = getSettings(gameId)
                    break
                case 'PATCH_SETTINGS':
                    result = patchSettings(gameId, payload as never)
                    break

                default:
                    error = `未知操作: ${action}`
            }
        } catch (e) {
            error = String(e)
        }

        // 回传结果给 iframe
        iframeRef?.contentWindow?.postMessage(
            { type: 'GAME_STORAGE_RESPONSE', requestId, result, error },
            '*'
        )
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
}

// ─── 注入到游戏 HTML 的 SDK 代码片段 ───────────────────────────
// GameView.vue 在渲染 game_code 时，将此片段注入 <head>

export const GAME_SDK_SNIPPET = /* html */`
<script>
(function() {
  var _pending = {};
  var _gameId = null; // 由宿主注入

  function _sendMessage(action, payload) {
    return new Promise(function(resolve, reject) {
      var requestId = Math.random().toString(36).slice(2);
      _pending[requestId] = { resolve: resolve, reject: reject };
      window.parent.postMessage({
        type: 'GAME_STORAGE',
        action: action,
        gameId: _gameId,
        requestId: requestId,
        payload: payload || {}
      }, '*');
      // 超时保护
      setTimeout(function() {
        if (_pending[requestId]) {
          delete _pending[requestId];
          reject(new Error('Storage timeout'));
        }
      }, 3000);
    });
  }

  window.addEventListener('message', function(e) {
    var msg = e.data;
    if (!msg || msg.type !== 'GAME_STORAGE_RESPONSE') return;
    var pending = _pending[msg.requestId];
    if (!pending) return;
    delete _pending[msg.requestId];
    if (msg.error) pending.reject(new Error(msg.error));
    else pending.resolve(msg.result);
  });

  window.GameStorage = {
    _init: function(gameId) { _gameId = gameId; },
    /** 写入存档: save(slot, data, options?) */
    save: function(slot, data, options) {
      return _sendMessage('SAVE', Object.assign({ slot: slot, data: data }, options || {}));
    },
    /** 读取存档: load(slot) -> Promise<GameSave|null> */
    load: function(slot) {
      return _sendMessage('LOAD', { slot: slot });
    },
    /** 列出所有存档 */
    listSaves: function() {
      return _sendMessage('LIST_SAVES');
    },
    /** 删除存档 */
    deleteSave: function(slot) {
      return _sendMessage('DELETE_SAVE', { slot: slot });
    },
    /** 获取游戏进度 */
    getProgress: function() {
      return _sendMessage('GET_PROGRESS');
    },
    /** 更新游戏进度 */
    setProgress: function(data) {
      return _sendMessage('SET_PROGRESS', data);
    },
    /** 获取游戏设置 */
    getSettings: function() {
      return _sendMessage('GET_SETTINGS');
    },
    /** 更新游戏设置（部分更新） */
    patchSettings: function(patch) {
      return _sendMessage('PATCH_SETTINGS', patch);
    },
  };
})();
<\/script>
`