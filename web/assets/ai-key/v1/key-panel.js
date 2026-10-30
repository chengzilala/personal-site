/**
 * AI Key 集成 · 统一填写面板
 *
 * 用法（零构建，普通 <script> 引入即可）：
 *   <script src="assets/ai-key/providers.js"></script>
 *   <script src="assets/ai-key/key-store.js"></script>
 *   <script src="assets/ai-key/key-panel.js"></script>
 *   <link rel="stylesheet" href="assets/ai-key/key-panel.css">
 *   <script>
 *     AIKeyPanel.mount(document.getElementById('slot'), {
 *       store: AIKeyStore.remote({ call: myRpc }),   // 或 AIKeyStore.local({ scope:'site' })
 *       title: 'AI Key',
 *       note: '自己填、加密托管，随时可清除'
 *     });
 *   </script>
 *
 * 设计口径：选平台即自动填好地址与模型，用户只需要粘贴 Key；DeepSeek 始终排第一。
 */
(function (root) {
  'use strict';

  var P = root.AIKeyProviders;
  var S = root.AIKeyStore;
  if (!P || !S) { throw new Error('AIKeyPanel 依赖 providers.js 与 key-store.js，请先引入'); }

  var SEQ = 0;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function mount(el, options) {
    if (!el) { throw new Error('AIKeyPanel.mount 需要容器元素'); }
    var opt = options || {};
    var store = opt.store;
    if (!store) { throw new Error('AIKeyPanel.mount 需要 store（AIKeyStore.local / remote / chrome）'); }

    var providers = opt.providers || P.list;
    var uid = 'aik' + (++SEQ);
    var state = {
      current: '',        // 当前选中厂商 id
      hasKey: false,
      masked: '',
      fetched: false,     // 输入框里的明文是否来自服务端
      busy: false,
      confirmClear: false
    };

    el.innerHTML = render(uid, providers, opt);

    var $ = function (key) { return el.querySelector('[data-k="' + key + '"]'); };
    var chips = el.querySelector('[data-k="chips"]');
    var inputBase = $('base');
    var inputModel = $('model');
    var inputKey = $('key');
    var btnEye = el.querySelector('[data-act="eye"]');
    var msgBox = $('msg');
    var tipKey = $('keytip');
    var datalist = el.querySelector('[data-k="models"]');

    function show(text, ok) {
      msgBox.innerHTML = '<span class="aik-msg__' + (ok ? 'ok' : 'err') + '">' + esc(text) + '</span>';
    }
    function clearMsg() { msgBox.innerHTML = ''; }

    function providerById(id) {
      for (var i = 0; i < providers.length; i++) { if (providers[i].id === id) { return providers[i]; } }
      return null;
    }

    function markChips() {
      Array.prototype.forEach.call(chips.querySelectorAll('button'), function (b) {
        b.classList.toggle('is-active', b.getAttribute('data-id') === state.current);
      });
    }

    function fillModels(p) {
      datalist.innerHTML = (p && p.models || []).map(function (m) {
        return '<option value="' + esc(m) + '"></option>';
      }).join('');
    }

    function applyProvider(id, silent) {
      var p = providerById(id);
      if (!p) { return; }
      state.current = id;
      markChips();
      fillModels(p);
      if (p.custom) {
        inputBase.readOnly = false;
        inputBase.classList.remove('is-locked');
        inputModel.readOnly = false;
        if (!silent) { show('自定义端点：请填写服务地址、模型名与 API Key。', true); }
      } else {
        inputBase.value = p.baseUrl;
        inputBase.readOnly = true;
        inputBase.classList.add('is-locked');
        inputModel.readOnly = false;
        if (!silent) { inputModel.value = p.models[0] || ''; }
        if (!silent) { show('已选「' + p.name + '」，地址与模型已自动配好，只需填 API Key。', true); }
      }
      $('tipbase').textContent = p.note || '';
    }

    function renderKeyState(j) {
      var info = j || {};
      state.hasKey = !!info.hasKey;
      state.masked = info.masked || '';
      state.fetched = false;
      setShown(false);
      if (!state.hasKey) {
        tipKey.textContent = '留空表示沿用已托管的 Key。';
        inputKey.placeholder = (providerById(state.current) || {}).keyPrefix
          ? ((providerById(state.current).keyPrefix) + '...')
          : 'sk-...';
      } else {
        tipKey.innerHTML = '当前已托管：<code>' + esc(state.masked || '已托管') + '</code>；留空则保持不变。';
        inputKey.placeholder = state.masked || '已托管';
      }
      syncEye();
    }

    function setShown(on) {
      inputKey.type = on ? 'text' : 'password';
      btnEye.textContent = on ? '隐藏' : '显示';
      if (!on && state.fetched) { inputKey.value = ''; }
      if (!on) { state.fetched = false; }
    }

    function syncEye() {
      btnEye.disabled = state.busy || !(state.masked || inputKey.value);
    }

    function withBusy(btn, text, fn) {
      var old = btn.textContent;
      btn.disabled = true;
      btn.textContent = text;
      return fn().then(function (r) {
        btn.disabled = false;
        btn.textContent = old;
        return r;
      }, function (e) {
        btn.disabled = false;
        btn.textContent = old;
        return { ok: false, error: (e && e.message) || String(e) };
      });
    }

    /** 回显已保存配置：能匹配预设就选中它，否则按自定义解锁 */
    function reflect(info) {
      var baseUrl = (info && info.baseUrl) || '';
      var model = (info && info.model) || '';
      var p = baseUrl ? P.byBaseUrl(baseUrl) : null;
      if (p) {
        applyProvider(p.id, true);
        if (p.custom) {
          inputBase.value = baseUrl;
          inputModel.value = model;
        } else {
          inputModel.value = model || p.models[0] || '';
        }
      } else {
        applyProvider(P.defaultProviderId, true);
      }
      renderKeyState(info);
    }

    // 厂商切换
    chips.addEventListener('click', function (e) {
      var b = e.target.closest ? e.target.closest('button[data-id]') : null;
      if (!b || state.busy) { return; }
      applyProvider(b.getAttribute('data-id'));
      clearMsg();
    });

    // 显示 / 隐藏
    btnEye.addEventListener('click', function () {
      if (inputKey.type === 'text') { setShown(false); syncEye(); return; }
      if (inputKey.value) { setShown(true); syncEye(); return; }
      if (!state.masked) { return; }
      if (typeof store.reveal !== 'function') { show('当前存储方式不支持查看明文。', false); return; }
      btnEye.disabled = true;
      btnEye.textContent = '读取中…';
      store.reveal().then(function (j) {
        btnEye.disabled = false;
        if (!j || !j.ok) {
          btnEye.textContent = '显示';
          show((j && j.error) || '读取明文失败。', false);
          syncEye();
          return;
        }
        if (!j.key) {
          btnEye.textContent = '显示';
          show('服务端没有返回明文 Key。', false);
          syncEye();
          return;
        }
        inputKey.value = j.key;
        state.fetched = true;
        setShown(true);
        syncEye();
      });
    });

    inputKey.addEventListener('input', function () {
      if (inputKey.value) { state.fetched = false; }
      syncEye();
    });

    // 保存
    el.querySelector('[data-act="save"]').addEventListener('click', function () {
      var btn = this;
      var baseUrl = inputBase.value.trim();
      var model = inputModel.value.trim();
      if (!baseUrl) { show('请先选择一个平台（或点「自定义端点」填写服务地址）。', false); return; }
      if (!model) { show('请填写模型名。', false); return; }
      clearMsg();
      withBusy(btn, '保存中…', function () {
        return store.save({
          providerId: state.current,
          baseUrl: baseUrl,
          model: model,
          key: inputKey.value.trim()
        });
      }).then(function (j) {
        if (!j || !j.ok) { show((j && j.error) || '保存失败。', false); return; }
        inputKey.value = '';
        renderKeyState({ hasKey: true, masked: j.masked || '' });
        show(store.mode === 'local' ? '已保存到本机浏览器。' : '已加密托管，之后打开即用。', true);
        if (typeof opt.onSaved === 'function') { opt.onSaved(j); }
      });
    });

    // 测试连接
    el.querySelector('[data-act="test"]').addEventListener('click', function () {
      var btn = this;
      var baseUrl = inputBase.value.trim();
      var model = inputModel.value.trim();
      if (!baseUrl || !model) { show('请先选平台并填好模型名。', false); return; }
      show('正在测试连接…', true);
      withBusy(btn, '测试中…', function () {
        return store.test({ providerId: state.current, baseUrl: baseUrl, model: model, key: inputKey.value.trim() });
      }).then(function (j) {
        if (!j || !j.ok) { show((j && j.error) || '连接测试失败。', false); return; }
        show('连接成功，模型回复：' + ((j.reply || '').trim() || '(空)'), true);
      });
    });

    // 清除（两段式确认，避免误触）
    var clearBtn = el.querySelector('[data-act="clear"]');
    clearBtn.addEventListener('click', function () {
      if (!state.confirmClear) {
        state.confirmClear = true;
        clearBtn.textContent = '再点一次确认清除';
        setTimeout(function () {
          if (!state.confirmClear) { return; }
          state.confirmClear = false;
          clearBtn.textContent = clearBtn.getAttribute('data-label');
        }, 4000);
        return;
      }
      state.confirmClear = false;
      clearBtn.textContent = clearBtn.getAttribute('data-label');
      withBusy(clearBtn, '清除中…', function () { return store.clear(); }).then(function (j) {
        if (!j || !j.ok) { show((j && j.error) || '清除失败。', false); return; }
        inputKey.value = '';
        renderKeyState(null);
        show('已清除保存的 Key。', true);
        if (typeof opt.onCleared === 'function') { opt.onCleared(); }
      });
    });

    // 初始化
    applyProvider(P.defaultProviderId, true);
    renderKeyState(null);
    store.get().then(function (info) {
      // 读取失败（未登录 / 后端不可用）不吓用户：先按未配置渲染，用户保存时会看到具体错误
      if (info && info.ok) { reflect(info); } else { renderKeyState(null); }
    });

    return {
      refresh: function () { return store.get().then(function (info) { if (info && info.ok) { reflect(info); } }); },
      store: store
    };
  }

  function render(uid, providers, opt) {
    var chips = providers.map(function (p) {
      return '<button type="button" class="aik-chip" data-id="' + esc(p.id) + '">' +
        esc(p.name) + (p.recommended ? '<span class="aik-chip__tag">首推</span>' : '') +
        '</button>';
    }).join('');

    var guide = providers.filter(function (p) { return !p.custom; }).map(function (p) {
      return '<div class="aik-guide__item">' +
        '<a href="' + esc(p.applyUrl) + '" target="_blank" rel="noopener">' + esc(p.name) + '</a>' +
        (p.note ? '<span>' + esc(p.note) + '</span>' : '') +
        '</div>';
    }).join('');

    var footText = opt.footText || 'Key 只提交一次、由你自己的服务端加密托管，页面不保存明文，随时可以一键清除。';

    return '' +
      '<div class="aik">' +
      (opt.title ? '<div class="aik-title">' + esc(opt.title) + '</div>' : '') +
      (opt.note ? '<div class="aik-sub">' + esc(opt.note) + '</div>' : '') +
      '<div class="aik-chips" data-k="chips">' + chips + '</div>' +
      '<div class="aik-field">' +
      '  <label class="aik-label">服务地址（base_url）<span class="aik-auto">自动配置</span></label>' +
      '  <input class="aik-input is-locked" data-k="base" type="text" autocomplete="off" spellcheck="false" readonly>' +
      '  <div class="aik-tip" data-k="tipbase"></div>' +
      '</div>' +
      '<div class="aik-field">' +
      '  <label class="aik-label">模型名（model）<span class="aik-auto">可改</span></label>' +
      '  <input class="aik-input" data-k="model" type="text" list="' + uid + '-models" autocomplete="off" spellcheck="false">' +
      '  <datalist id="' + uid + '-models" data-k="models"></datalist>' +
      '</div>' +
      '<div class="aik-field">' +
      '  <label class="aik-label">API Key</label>' +
      '  <div class="aik-keyrow">' +
      '    <input class="aik-input" data-k="key" type="password" autocomplete="off" spellcheck="false">' +
      '    <button type="button" class="aik-btn aik-btn--ghost" data-act="eye" disabled>显示</button>' +
      '  </div>' +
      '  <div class="aik-tip" data-k="keytip"></div>' +
      '</div>' +
      '<div class="aik-actions">' +
      '  <button type="button" class="aik-btn aik-btn--primary" data-act="save" data-label="保存">保存</button>' +
      '  <button type="button" class="aik-btn" data-act="test" data-label="测试连接">测试连接</button>' +
      '  <button type="button" class="aik-btn aik-btn--danger" data-act="clear" data-label="清除">清除</button>' +
      '</div>' +
      '<div class="aik-msg" data-k="msg" role="status"></div>' +
      '<details class="aik-guide">' +
      '  <summary>还不知道去哪拿 Key？点开看各平台入口</summary>' +
      '  <div class="aik-guide__body">' + guide +
      '    <div class="aik-tip">通用做法：进对应平台控制台 → API Keys / 密钥管理 → 新建并复制，粘贴到上面即可。</div>' +
      '  </div>' +
      '</details>' +
      '<div class="aik-foot">' + esc(footText) + '</div>' +
      '</div>';
  }

  root.AIKeyPanel = { mount: mount };
})(typeof window !== 'undefined' ? window : globalThis);
