/**
 * AI Key 集成 · 统一调用客户端
 *
 * 各项目不再自己拼 base_url / 自己判厂商，只调：
 *   var ai = AIKeyClient.create({ endpoint: 'api/ai/chat' });
 *   ai.chat(messages, { feature: 'daily-card', maxTokens: 800 }).then(function (r) {
 *     if (!r.ok) { 提示 r.error; return; }  用 r.text
 *   });
 *
 * 两条通道：
 *   - 半托管（默认）：Key 在服务端，浏览器只发对话内容 → POST endpoint
 *   - 纯本机：Key 在浏览器（AIKeyStore.local），每次调用带上 baseUrl/model/apiKey → 仍由服务端转发，
 *     避免浏览器直连厂商（厂商接口普遍不放 CORS）
 *
 * 安全：不记录、不上报任何正文；错误只回一句人话。
 */
(function (root) {
  'use strict';

  function create(options) {
    var opt = options || {};
    var endpoint = (opt.endpoint || '/api/ai/chat').replace(/\/+$/, '');
    var owner = opt.owner || '';
    var call = typeof opt.call === 'function' ? opt.call : null;
    var store = opt.store || null;
    var timeoutMs = opt.timeoutMs || 90000;

    function post(url, body) {
      var ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
      var timer = ctrl ? setTimeout(function () { ctrl.abort(); }, timeoutMs) : null;
      var headers = { 'Content-Type': 'application/json' };
      if (owner) { headers['X-Owner'] = owner; }
      return fetch(url, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body),
        signal: ctrl ? ctrl.signal : undefined
      }).then(function (r) { return r.json(); })
        .then(function (j) { if (timer) { clearTimeout(timer); } return j; })
        .catch(function (e) {
          if (timer) { clearTimeout(timer); }
          var msg = (e && e.name === 'AbortError') ? '请求超时，请稍后重试。' : '网络请求失败：' + ((e && e.message) || e);
          return { ok: false, code: 'network', error: msg };
        });
    }

    /** 本机模式的 Key 从 store 现取；半托管模式不带 Key */
    function keyPayload() {
      if (!store || store.mode !== 'local' && store.mode !== 'chrome') { return Promise.resolve({}); }
      return store.get().then(function (info) {
        if (!info || !info.hasKey) { return {}; }
        return store.reveal().then(function (k) {
          if (!k || !k.ok) { return {}; }
          return { baseUrl: info.baseUrl, model: info.model, apiKey: k.key };
        });
      });
    }

    function chat(messages, opts2) {
      var o = opts2 || {};
      if (!Array.isArray(messages) || !messages.length) {
        return Promise.resolve({ ok: false, code: 'param', error: '缺少对话内容' });
      }
      return keyPayload().then(function (kp) {
        var payload = {
          owner: owner,
          messages: messages,
          feature: o.feature || '',
          maxTokens: o.maxTokens || 0,
          temperature: typeof o.temperature === 'number' ? o.temperature : 0.7
        };
        if (kp.apiKey) {
          payload.baseUrl = kp.baseUrl;
          payload.model = kp.model;
          payload.apiKey = kp.apiKey;
        }
        if (call) { return call('aiChat', payload); }
        return post(endpoint, payload);
      }).then(function (j) {
        if (!j) { return { ok: false, code: 'empty', error: '服务没有返回内容。' }; }
        if (typeof j.ok === 'boolean') {
          return j.ok ? j : { ok: false, code: j.code || 'failed', error: j.error || '生成失败，请稍后重试。' };
        }
        if (j.error) { return { ok: false, code: j.code || 'failed', error: j.error }; }
        if (j.text) { return { ok: true, text: j.text, usage: j.usage || null, provider: j.provider || '', model: j.model || '' }; }
        return { ok: false, code: 'empty', error: 'AI 返回结果无效' };
      });
    }

    return { chat: chat, endpoint: endpoint, owner: owner };
  }

  root.AIKeyClient = { create: create };
})(typeof window !== 'undefined' ? window : globalThis);
