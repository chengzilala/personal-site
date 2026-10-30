/**
 * AI Key 集成 · 存储适配层
 *
 * 目标：面板（key-panel.js）只认这一层接口，换存储方式不动 UI。
 * 统一接口（全部返回 Promise，失败不 reject，返回 { ok:false, error }）：
 *   get()                        → { ok, hasKey, masked, providerId, baseUrl, model }
 *   save({providerId,baseUrl,model,key}) → { ok, masked }
 *   clear()                      → { ok }
 *   test({providerId,baseUrl,model,key}) → { ok, reply } | { ok:false, error }
 *   reveal()                     → { ok, key }（只有「服务端托管」模式支持）
 *   mode                         → 'local' | 'remote' | 'chrome'
 *
 * 三种实现：
 *   local()  浏览器 localStorage，Key 只在本机；测试需显式给 proxyUrl
 *   remote() 交给你自己的服务端（加密托管），通过 call(action,payload) 接入
 *   chrome() 浏览器扩展 chrome.storage.local
 *
 * 安全红线：任何模式都不把 Key 写进日志、不拼进 URL、不写入 localStorage 的明文以外的持久化副本。
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) { module.exports = api; }
  root.AIKeyStore = api;
})(typeof window !== 'undefined' ? window : globalThis, function () {
  'use strict';

  function mask(key) {
    var k = String(key || '');
    if (!k) { return ''; }
    if (k.length <= 10) { return '****'; }
    return k.slice(0, 6) + '……' + k.slice(-4);
  }

  function errText(j, dflt) {
    if (!j) { return dflt || '服务没有返回内容。'; }
    if (j.error) { return j.error; }
    if (j.ok === false) { return j.error || dflt || '操作失败，请重试。'; }
    return '';
  }

  function inferProvider(baseUrl) {
    var P = root.AIKeyProviders;
    if (!P || !baseUrl) { return ''; }
    var p = P.byBaseUrl(baseUrl);
    return p ? p.id : '';
  }

  // ---------------- 本机模式 ----------------
  function local(options) {
    var opt = options || {};
    var KEY = 'aikey:' + (opt.scope || 'default') + ':v1';
    var proxyUrl = String(opt.proxyUrl || '').replace(/\/+$/, '');

    function read() {
      try { return JSON.parse(root.localStorage.getItem(KEY) || 'null') || {}; }
      catch (e) { return {}; }
    }
    function write(obj) {
      try { root.localStorage.setItem(KEY, JSON.stringify(obj)); } catch (e) { /* 隐私模式可能拒绝 */ }
    }

    return {
      mode: 'local',
      get: function () {
        var v = read();
        return Promise.resolve({
          ok: true,
          hasKey: !!v.key,
          masked: v.key ? mask(v.key) : '',
          providerId: v.providerId || '',
          baseUrl: v.baseUrl || '',
          model: v.model || ''
        });
      },
      save: function (payload) {
        var old = read();
        var key = String(payload.key || '').trim() || old.key || '';
        if (!key) { return Promise.resolve({ ok: false, error: '请填写 API Key。' }); }
        if (!payload.baseUrl || !payload.model) {
          return Promise.resolve({ ok: false, error: '服务地址和模型名不能为空。' });
        }
        write({
          providerId: payload.providerId || '',
          baseUrl: payload.baseUrl,
          model: payload.model,
          key: key,
          updatedAt: Date.now()
        });
        return Promise.resolve({ ok: true, masked: mask(key) });
      },
      clear: function () {
        try { root.localStorage.removeItem(KEY); } catch (e) {}
        return Promise.resolve({ ok: true });
      },
      test: function (payload) {
        var v = read();
        var key = String(payload.key || '').trim() || v.key || '';
        if (!key) { return Promise.resolve({ ok: false, error: '请先填写 API Key。' }); }
        if (!proxyUrl) {
          return Promise.resolve({ ok: false, error: '本机模式没有转发地址，测试连接需要先配 proxyUrl（见 README §三）。' });
        }
        return fetch(proxyUrl + '/api/ai/test', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            baseUrl: payload.baseUrl || v.baseUrl,
            model: payload.model || v.model,
            apiKey: key
          })
        }).then(function (r) { return r.json(); })
          .then(function (j) { return j; })
          .catch(function (e) {
            return { ok: false, error: '请求失败：' + ((e && e.message) || e) };
          });
      },
      reveal: function () {
        var v = read();
        return Promise.resolve(v.key ? { ok: true, key: v.key } : { ok: false, error: '还没有保存 Key。' });
      }
    };
  }

  // ---------------- 服务端托管模式 ----------------
  /**
   * @param {{ call:function, actions?:object }} options
   *   call(action, payload) → Promise<响应对象>（宿主自己实现：fetch 本机服务 / 云函数 / 你的 API）
   *   actions 可改名，默认：get=keyGet / save=keySave / clear=keyClear / test=keyTest / reveal=keyReveal
   */
  function remote(options) {
    var opt = options || {};
    if (typeof opt.call !== 'function') {
      throw new Error('AIKeyStore.remote 需要 call(action, payload) 函数');
    }
    var call = opt.call;
    var A = opt.actions || {};
    var act = {
      get: A.get || 'keyGet',
      save: A.save || 'keySave',
      clear: A.clear || 'keyClear',
      test: A.test || 'keyTest',
      reveal: A.reveal || 'keyReveal'
    };

    return {
      mode: 'remote',
      get: function () {
        return Promise.resolve(call(act.get, {})).then(function (j) {
          var e = errText(j, '读取已托管 Key 失败。');
          var baseUrl = (j && (j.baseUrl || j.base_url)) || '';
          var model = (j && j.model) || '';
          if (e) {
            return { ok: false, error: e, hasKey: false, masked: '', baseUrl: baseUrl, model: model };
          }
          return {
            ok: true,
            hasKey: !!(j && (j.hasKey || j.has_key)),
            masked: (j && j.masked) || '',
            providerId: inferProvider(baseUrl),
            baseUrl: baseUrl,
            model: model
          };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e), hasKey: false, masked: '' };
        });
      },
      save: function (payload) {
        return Promise.resolve(call(act.save, {
          base_url: payload.baseUrl,
          api_key: payload.key || '',
          model: payload.model
        })).then(function (j) {
          var e = errText(j, '保存失败。');
          if (e) { return { ok: false, error: e }; }
          return { ok: true, masked: (j && j.masked) || mask(payload.key) };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e) };
        });
      },
      clear: function () {
        return Promise.resolve(call(act.clear, {})).then(function (j) {
          var e = errText(j, '清除失败。');
          return e ? { ok: false, error: e } : { ok: true };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e) };
        });
      },
      test: function (payload) {
        return Promise.resolve(call(act.test, {
          base_url: payload.baseUrl,
          api_key: payload.key || '',
          model: payload.model
        })).then(function (j) {
          var e = errText(j, '连接测试失败。');
          if (e) { return { ok: false, error: e }; }
          return { ok: true, reply: (j && j.reply) || '' };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e) };
        });
      },
      reveal: function () {
        return Promise.resolve(call(act.reveal, {})).then(function (j) {
          var e = errText(j, '读取明文失败。');
          if (e) { return { ok: false, error: e }; }
          return { ok: true, key: (j && j.key) || '' };
        }).catch(function (e) {
          return { ok: false, error: (e && e.message) || String(e) };
        });
      }
    };
  }

  // ---------------- 扩展模式 ----------------
  function chromeStore(options) {
    var opt = options || {};
    var KEY = 'aikey:' + (opt.scope || 'default') + ':v1';
    var area = (root.chrome && root.chrome.storage && root.chrome.storage.local) || null;

    function getRaw() {
      if (!area) { return Promise.resolve(null); }
      return new Promise(function (resolve) {
        area.get([KEY], function (obj) { resolve((obj && obj[KEY]) || null); });
      });
    }

    return {
      mode: 'chrome',
      get: function () {
        return getRaw().then(function (v) {
          v = v || {};
          return {
            ok: true,
            hasKey: !!v.key,
            masked: v.key ? mask(v.key) : '',
            providerId: v.providerId || '',
            baseUrl: v.baseUrl || '',
            model: v.model || ''
          };
        });
      },
      save: function (payload) {
        return getRaw().then(function (old) {
          old = old || {};
          var key = String(payload.key || '').trim() || old.key || '';
          if (!key) { return { ok: false, error: '请填写 API Key。' }; }
          if (!payload.baseUrl || !payload.model) {
            return { ok: false, error: '服务地址和模型名不能为空。' };
          }
          var v = {
            providerId: payload.providerId || '',
            baseUrl: payload.baseUrl,
            model: payload.model,
            key: key,
            updatedAt: Date.now()
          };
          return new Promise(function (resolve) {
            var obj = {}; obj[KEY] = v;
            area.set(obj, function () { resolve({ ok: true, masked: mask(key) }); });
          });
        });
      },
      clear: function () {
        if (!area) { return Promise.resolve({ ok: true }); }
        return new Promise(function (resolve) {
          area.remove([KEY], function () { resolve({ ok: true }); });
        });
      },
      test: function () {
        return Promise.resolve({ ok: false, error: '扩展模式请在后台脚本里发起测试请求。' });
      },
      reveal: function () {
        return getRaw().then(function (v) {
          return (v && v.key) ? { ok: true, key: v.key } : { ok: false, error: '还没有保存 Key。' };
        });
      }
    };
  }

  return {
    local: local,
    remote: remote,
    chrome: chromeStore,
    mask: mask,
    inferProvider: inferProvider
  };
});
