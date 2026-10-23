/* ============================================================
 *  新标签页 - 配置区
 * ============================================================ */

const DEFAULT_CONFIG = {
  backgroundImage: 'https://cdn.pixabay.com/photo/2023/11/13/07/18/pumpkin-8384698_960_720.jpg',
  bgBlur: true,
  bingDaily: false,
  theme: 'auto',

  // 组件配色：空字符串 = 跟随默认主题色
  colors: {
    clock: '',
    date: '',
    searchText: '',
    searchBorder: '',
    sectionTitle: '',
    cardTitle: '',
    cardUrl: '',
    accent: '',
  },

  layout: {
    pageTop: '150px',
    clockToDate: '2px',
    dateToSearch: '100px',
    searchToNav: '100px',
    sectionTitleTop: '8px',
    titleToCards: '10px',
    cardGap: '12px',
  },

  effects: {
    bgFrostOpacity: 0.05,
    bgFrostBlur: '8px',
    searchFrostOpacity: 0.14,
    searchFrostBlur: '8px',
    dropdownOpacity: 0.25,
  },

  clock: {
    updateInterval: 1000,
    textShadow: '0 4px 14px rgba(0, 0, 0, 0.28)'
  },

  search: {
    defaultEngine: 'Bing',
    placeholder: '使用{engine}搜索',
  },

  engines: [
    { name: 'Bing', base: 'https://cn.bing.com/search?q=' },
    { name: 'Google', base: 'https://www.google.com/search?q=' },
  ],

  sections: []
};

let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

/* ============================================================
 *  ConfigStore
 * ============================================================ */

const ConfigStore = {
  STORAGE_KEY: 'lemon_newtab_config',
  BG_STORAGE_KEY: 'lemon_newtab_bg_url',
  BG_BASE64_KEY: 'lemon_newtab_bg_base64',
  BG_CACHED_URL_KEY: 'lemon_newtab_bg_cached_url',

  _hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  },

  load() {
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          const saved = localStorage.getItem(this.STORAGE_KEY);
          if (saved) {
            const parsed = JSON.parse(saved);
            CONFIG = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), parsed);
          }
          const bgUrl = localStorage.getItem(this.BG_STORAGE_KEY);
          if (bgUrl) CONFIG.backgroundImage = bgUrl;
          const bgBase64 = localStorage.getItem(this.BG_BASE64_KEY);
          if (bgBase64) CONFIG._bgBase64 = bgBase64;
          const cachedUrl = localStorage.getItem(this.BG_CACHED_URL_KEY);
          if (cachedUrl) CONFIG._bgCachedUrl = cachedUrl;
        } catch (e) {
          console.warn('Config load failed:', e);
        }
        resolve();
        return;
      }
      chrome.storage.local.get([this.STORAGE_KEY, this.BG_STORAGE_KEY, this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY], (result) => {
        if (chrome.runtime.lastError) {
          console.warn('Config load failed:', chrome.runtime.lastError);
          resolve();
          return;
        }
        // 旧版本（未声明 storage 权限时）配置存放在 localStorage，缺失的 key 一次性迁移过来
        this._migrateLegacyStorage(result);
        try {
          const saved = result[this.STORAGE_KEY];
          if (saved) {
            const parsed = JSON.parse(saved);
            CONFIG = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), parsed);
          }
          const bgUrl = result[this.BG_STORAGE_KEY];
          if (bgUrl) CONFIG.backgroundImage = bgUrl;
          const bgBase64 = result[this.BG_BASE64_KEY];
          if (bgBase64) CONFIG._bgBase64 = bgBase64;
          const cachedUrl = result[this.BG_CACHED_URL_KEY];
          if (cachedUrl) CONFIG._bgCachedUrl = cachedUrl;
        } catch (e) {
          console.warn('Config parse failed:', e);
        }
        resolve();
      });
    });
  },

  save() {
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.setItem(this.STORAGE_KEY, JSON.stringify(CONFIG));
        } catch (e) {
          console.error('Config save failed:', e);
        }
        resolve();
        return;
      }
      chrome.storage.local.set({ [this.STORAGE_KEY]: JSON.stringify(CONFIG) }, () => {
        if (chrome.runtime.lastError) {
          console.error('Config save failed:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  },

  saveBgUrl(url) {
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.setItem(this.BG_STORAGE_KEY, url);
        } catch (e) {
          console.error('BG save failed:', e);
        }
        resolve();
        return;
      }
      chrome.storage.local.set({ [this.BG_STORAGE_KEY]: url }, () => {
        if (chrome.runtime.lastError) {
          console.error('BG save failed:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  },

  saveBgBase64(url, dataUrl) {
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.setItem(this.BG_BASE64_KEY, dataUrl);
          localStorage.setItem(this.BG_CACHED_URL_KEY, url);
        } catch (e) {
          console.error('Base64 cache save failed:', e);
        }
        resolve();
        return;
      }
      chrome.storage.local.set({
        [this.BG_BASE64_KEY]: dataUrl,
        [this.BG_CACHED_URL_KEY]: url
      }, () => {
        if (chrome.runtime.lastError) {
          console.error('Base64 cache save failed:', chrome.runtime.lastError);
        }
        resolve();
      });
    });
  },

  clearBgCache() {
    return new Promise((resolve) => {
      delete CONFIG._bgBase64;
      delete CONFIG._bgCachedUrl;
      if (!this._hasStorage()) {
        localStorage.removeItem(this.BG_BASE64_KEY);
        localStorage.removeItem(this.BG_CACHED_URL_KEY);
        resolve();
        return;
      }
      chrome.storage.local.remove([this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY], () => {
        resolve();
      });
    });
  },

  reset() {
    CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return new Promise((resolve) => {
      delete CONFIG._bgBase64;
      delete CONFIG._bgCachedUrl;
      if (!this._hasStorage()) {
        localStorage.removeItem(this.BG_STORAGE_KEY);
        localStorage.removeItem(this.BG_BASE64_KEY);
        localStorage.removeItem(this.BG_CACHED_URL_KEY);
        this.save().then(resolve);
        return;
      }
      chrome.storage.local.remove([this.BG_STORAGE_KEY, this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY], () => {
        this.save().then(resolve);
      });
    });
  },

  _migrateLegacyStorage(result) {
    const keys = [this.STORAGE_KEY, this.BG_STORAGE_KEY, this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY];
    const toMigrate = {};
    let hasLegacy = false;
    keys.forEach((k) => {
      if (!result[k]) {
        try {
          const v = localStorage.getItem(k);
          if (v !== null) {
            toMigrate[k] = v;
            result[k] = v; // 让本次 load 立即读到迁移值
            hasLegacy = true;
          }
        } catch (e) {}
      }
    });
    if (hasLegacy) {
      chrome.storage.local.set(toMigrate, () => {
        keys.forEach((k) => { try { localStorage.removeItem(k); } catch (e) {} });
      });
    }
  },

  deepMerge(target, source) {
    const result = JSON.parse(JSON.stringify(target));
    for (const key in source) {
      if (source[key] !== null && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    return result;
  }
};

/* ============================================================
 *  Utils
 * ============================================================ */

/** HTML 转义：拼接 innerHTML 时防注入 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** 链接白名单：仅允许 http/https，拦截 javascript: 等危险协议 */
function sanitizeUrl(url) {
  return /^https?:\/\//i.test(url) ? url : '#';
}

/* ============================================================
 *  Theme
 * ============================================================ */

const Theme = {
  _mq: null,
  init() {
    this.apply(CONFIG.theme);
    this._mq = window.matchMedia('(prefers-color-scheme: dark)');
    if (this._mq.addEventListener) {
      this._mq.addEventListener('change', () => { if (CONFIG.theme === 'auto') this.apply('auto'); });
    } else if (this._mq.addListener) {
      this._mq.addListener(() => { if (CONFIG.theme === 'auto') this.apply('auto'); });
    }
  },

  apply(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && this._mq && this._mq.matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    // 同步一份镜像到 localStorage，供 index.html 首屏防闪烁内联脚本读取
    try { localStorage.setItem('lemon_newtab_theme', theme); } catch (e) {}
  },

  async set(theme) {
    CONFIG.theme = theme;
    this.apply(theme);
    await ConfigStore.save();
  }
};

/* ============================================================
 *  Clock
 * ============================================================ */

const Clock = {
  rafId: null,
  lastTime: 0,
  currentDateKey: '',

  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return h + ':' + m;
  },

  formatDate(date) {
    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    return (date.getMonth() + 1) + '月' + date.getDate() + '日 星期' + weeks[date.getDay()];
  },

  update(ts) {
    if (ts - this.lastTime < 1000) {
      this.rafId = requestAnimationFrame(t => this.update(t));
      return;
    }
    this.lastTime = ts;
    const now = new Date();
    document.getElementById('clock').textContent = this.formatTime(now);
    const key = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    if (key !== this.currentDateKey) {
      document.getElementById('date-label').textContent = this.formatDate(now);
      this.currentDateKey = key;
    }
    this.rafId = requestAnimationFrame(t => this.update(t));
  },

  start() {
    this.stop();
    const now = new Date();
    document.getElementById('clock').textContent = this.formatTime(now);
    const key = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    if (key !== this.currentDateKey) {
      document.getElementById('date-label').textContent = this.formatDate(now);
      this.currentDateKey = key;
    }
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(t => this.update(t));
  },

  stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  },

  init() {
    document.addEventListener('visibilitychange', () => {
      document.hidden ? this.stop() : this.start();
    });
    this.start();
  }
};

/* ============================================================
 *  Search
 * ============================================================ */

const Search = {
  currentEngine: null,

  init() {
    this.currentEngine = CONFIG.engines.find(e => e.name === CONFIG.search.defaultEngine) || CONFIG.engines[0];
    this.renderDropdown();
    this.bindEvents();
    this.updatePlaceholder();
  },

  renderDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = CONFIG.engines.map(engine =>
      '<button type="button" class="search-option" data-name="' + escapeHtml(engine.name) + '">' + escapeHtml(engine.name) + '</button>'
    ).join('');

    dropdown.querySelectorAll('.search-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        this.currentEngine = CONFIG.engines.find(e => e.name === btn.dataset.name);
        CONFIG.search.defaultEngine = this.currentEngine.name;
        this.updatePlaceholder();
        this.closeDropdown();
        await ConfigStore.save();
      });
    });
  },

  updatePlaceholder() {
    const input = document.getElementById('search-input');
    if (input) input.placeholder = CONFIG.search.placeholder.replace('{engine}', this.currentEngine.name);
  },

  toggleDropdown() {
    const d = document.getElementById('search-dropdown');
    if (d) d.classList.toggle('open');
  },

  closeDropdown() {
    const d = document.getElementById('search-dropdown');
    if (d) d.classList.remove('open');
  },

  bindEvents() {
    const icon = document.getElementById('search-icon-btn');
    const input = document.getElementById('search-input');

    if (icon) icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter') return;
        const query = input.value.trim();
        if (!query) return;
        window.open(this.currentEngine.base + encodeURIComponent(query), '_self');
      });
      input.addEventListener('focus', () => {
        const d = document.getElementById('search-dropdown');
        if (d && !d.classList.contains('open') && CONFIG.engines.length > 1) d.classList.add('open');
      });
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (input) input.blur();
        this.closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('search-dropdown');
      const ic = document.getElementById('search-icon-btn');
      if (dropdown && ic && !ic.contains(e.target) && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });
  }
};

/* ============================================================
 *  Renderer
 * ============================================================ */

const Renderer = {
  init() {
    this.renderSections();
  },

  renderSections() {
    const page = document.querySelector('.page');
    if (!page) return;
    page.querySelectorAll('.section-block, .nav-list').forEach(el => el.remove());
    const frag = document.createDocumentFragment();

    CONFIG.sections.forEach(section => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'section-block';
      sectionEl.innerHTML = '<h2>' + escapeHtml(section.title) + '</h2>';
      frag.appendChild(sectionEl);

      const listEl = document.createElement('div');
      listEl.className = 'nav-list';

      section.items.forEach(item => {
        const card = document.createElement('a');
        const isText = item.style === 'text';
        card.className = 'nav-card' + (isText ? ' nav-card-text' : '');
        card.href = sanitizeUrl(item.url);
        card.target = '_self';
        card.rel = 'noopener noreferrer';

        if (isText) {
          card.innerHTML = '<div class="text-wrap text-only"><span class="title">' + escapeHtml(item.title) + '</span><span class="url">' + escapeHtml(item.domain) + '</span></div>';
        } else {
          const scale = parseFloat(item.scale) || 1;
          card.innerHTML = '<div class="logo-wrap"><img src="' + escapeHtml(item.logo) + '" alt="" loading="lazy" style="transform: scale(' + scale + ');" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239b9b9b%22 font-size=%2220%22%3E' + encodeURIComponent(item.title.charAt(0)) + '%3C/text%3E%3C/svg%3E\'"></div><div class="text-wrap"><span class="title">' + escapeHtml(item.title) + '</span><span class="url">' + escapeHtml(item.domain) + '</span></div>';
        }
        listEl.appendChild(card);
      });

      frag.appendChild(listEl);
    });
    page.appendChild(frag);
  }
};

/* ============================================================
 *  Settings
 * ============================================================ */

const Settings = {
  isOpen: false,

  init() {
    this.bindEvents();
    this.createOverlay();
    this.buildPanel();
  },

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => this.close());
  },

  buildPanel() {
    const panelInner = document.getElementById('settings-panel-inner');
    if (!panelInner) return;
    panelInner.innerHTML = '';
    this.createSectionAppearance(panelInner);
    this.createSectionLayout(panelInner);
    this.createSectionEffects(panelInner);
    this.createSectionEngines(panelInner);
    this.createSectionNavManager(panelInner);
    this.createSectionData(panelInner);
    this.createSectionColors(panelInner);
    this.createSectionAdvanced(panelInner);
    // 关于永远垫底
    this.createSectionAbout(panelInner);
  },

  createSectionColors(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    let html = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2s5 5.58 5 10a5 5 0 01-10 0c0-4.42 5-10 5-10z"/><path d="M7.5 15.5C4.5 14 3 11.5 3 9c2.5 0 4.5 1 6 2.5M16.5 15.5c3-1.5 4.5-4 4.5-6.5-2.5 0-4.5 1-6 2.5"/></svg>颜色</div>';
    Colors.ITEMS.forEach(item => {
      const cur = (CONFIG.colors && CONFIG.colors[item.key]) || '';
      const custom = cur ? ' is-custom' : '';
      html += '<div class="settings-color-row">' +
        '<span class="settings-color-label">' + item.label + '</span>' +
        '<input type="color" class="settings-color-input" id="color-input-' + item.key + '" value="' + (cur || item.fallback) + '">' +
        '<button type="button" class="settings-color-reset' + custom + '" data-key="' + item.key + '" title="恢复默认">&#8634;</button>' +
        '</div>';
    });
    html += '<button type="button" class="settings-btn settings-btn-full settings-btn-secondary" id="colors-reset-all" style="margin-top:8px;">全部恢复默认</button>';
    section.innerHTML = html;
    container.appendChild(section);

    Colors.ITEMS.forEach(item => {
      const input = document.getElementById('color-input-' + item.key);
      const resetBtn = section.querySelector('.settings-color-reset[data-key="' + item.key + '"]');
      input.addEventListener('input', async () => {
        resetBtn.classList.add('is-custom');
        await Colors.set(item.key, input.value);
      });
      resetBtn.addEventListener('click', async () => {
        input.value = item.fallback;
        resetBtn.classList.remove('is-custom');
        await Colors.set(item.key, '');
      });
    });
    document.getElementById('colors-reset-all').addEventListener('click', async () => {
      await Colors.resetAll();
      Settings.buildPanel();
    });
  },

  createSectionAdvanced(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 18l6-6-6-6M8 6l-6 6 6 6"/></svg>高级</div>' +
      '<button type="button" class="settings-advanced-entry" id="advanced-css-entry">' +
      '<span>自定义 CSS</span>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button>';
    container.appendChild(section);
    document.getElementById('advanced-css-entry').addEventListener('click', () => Advanced.open());
  },

  createSectionAppearance(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>外观</div>' +
      '<label class="settings-label">背景图片</label>' +
      '<div class="settings-input-wrap"><input type="text" class="settings-input" id="bg-url-input" placeholder="输入图片 URL..." value="' + (CONFIG.backgroundImage.startsWith('data:') ? '' : CONFIG.backgroundImage) + '"><button type="button" class="settings-btn" id="bg-apply-btn">应用</button></div>' +
      '<div class="settings-file-wrap"><input type="file" id="bg-file-input" accept="image/*" style="display:none;"><button type="button" class="settings-btn settings-btn-full" id="bg-upload-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3V15"/></svg>上传本地图片</button></div>' +
      '<div class="settings-toggle-wrap"><span class="settings-toggle-label">背景毛玻璃</span><label class="settings-toggle"><input type="checkbox" id="bg-blur-toggle"' + (CONFIG.bgBlur ? ' checked' : '') + '><span class="settings-toggle-slider"></span></label></div>' +
      '<div class="settings-toggle-wrap"><span class="settings-toggle-label">Bing 每日壁纸</span><label class="settings-toggle"><input type="checkbox" id="bing-daily-toggle"' + (CONFIG.bingDaily ? ' checked' : '') + '><span class="settings-toggle-slider"></span></label></div>' +
      '<label class="settings-label" style="margin-top:12px;">主题</label>' +
      '<div class="settings-radio-group" id="theme-group">' +
      '<label class="settings-radio"><input type="radio" name="theme" value="light"' + (CONFIG.theme === 'light' ? ' checked' : '') + '><span>亮色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="dark"' + (CONFIG.theme === 'dark' ? ' checked' : '') + '><span>暗色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="auto"' + (CONFIG.theme === 'auto' ? ' checked' : '') + '><span>跟随系统</span></label>' +
      '</div>';
    container.appendChild(section);

    const bgInput = document.getElementById('bg-url-input');
    const applyBgUrl = async () => {
      let url = bgInput.value.trim();
      if (!url) {
        url = DEFAULT_CONFIG.backgroundImage;
        bgInput.value = url;
      }
      const isNewUrl = url !== CONFIG.backgroundImage;

      // 1. 立刻更换背景（同步，瞬间完成，用户立刻看到）
      CONFIG.backgroundImage = url;
      document.body.style.setProperty('--bg-image', 'url("' + url + '")');

      // 2. 后台处理存储和缓存（不阻塞 UI）
      if (isNewUrl) {
        await ConfigStore.clearBgCache();
      }
      await ConfigStore.saveBgUrl(url);
      await ConfigStore.save();
      // 延迟启动 base64 缓存，让出主线程
      setTimeout(() => cacheUrlToBase64(url), 0);
    };
    document.getElementById('bg-apply-btn').addEventListener('click', applyBgUrl);
    bgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBgUrl(); });

    const fileInput = document.getElementById('bg-file-input');
    const uploadBtn = document.getElementById('bg-upload-btn');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('图片过大，请选择小于 5MB 的文件');
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = async (ev) => {
        const dataUrl = ev.target.result;
        // 1. 立刻更换背景
        CONFIG.backgroundImage = dataUrl;
        document.body.style.setProperty('--bg-image', 'url("' + dataUrl + '")');
        bgInput.value = '';
        // 2. 后台处理存储
        await ConfigStore.clearBgCache();
        await ConfigStore.saveBgUrl(dataUrl);
        await ConfigStore.save();
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('bg-blur-toggle').addEventListener('change', async (e) => {
      CONFIG.bgBlur = e.target.checked;
      if (CONFIG.bgBlur) {
        document.body.classList.remove('no-bg-blur');
      } else {
        document.body.classList.add('no-bg-blur');
      }
      const bgOpacityWrap = document.getElementById('bg-opacity-wrap');
      if (bgOpacityWrap) {
        bgOpacityWrap.style.opacity = e.target.checked ? '1' : '0.35';
        bgOpacityWrap.style.pointerEvents = e.target.checked ? 'auto' : 'none';
      }
      await ConfigStore.save();
    });

    document.getElementById('bing-daily-toggle').addEventListener('change', async (e) => {
      if (e.target.checked) {
        e.target.disabled = true;
        try {
          const granted = await BingWallpaper.requestPermission();
          if (granted === false) {
            alert('需要允许访问 bing.com 才能获取每日壁纸');
            e.target.checked = false;
            return;
          }
          await BingWallpaper.enable();
          bgInput.value = CONFIG.backgroundImage;
          CONFIG.bingDaily = true;
          await ConfigStore.save();
        } catch (err) {
          alert('获取 Bing 壁纸失败：' + err.message);
          e.target.checked = false;
        } finally {
          e.target.disabled = false;
        }
      } else {
        CONFIG.bingDaily = false;
        await ConfigStore.save();
      }
    });

    section.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        Theme.set(e.target.value);
      });
    });
  },

  createSectionLayout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/></svg>布局间距</div><div class="settings-slider-group" id="layout-sliders"></div>';
    container.appendChild(section);

    const sliderGroup = section.querySelector('#layout-sliders');
    const layoutMap = [
      { key: 'pageTop', label: '页面顶部间距', min: 50, max: 300, step: 10, unit: 'px' },
      { key: 'clockToDate', label: '时钟与日期间距', min: 0, max: 50, step: 1, unit: 'px' },
      { key: 'dateToSearch', label: '日期与搜索框间距', min: 20, max: 200, step: 10, unit: 'px' },
      { key: 'searchToNav', label: '搜索框与导航间距', min: 20, max: 200, step: 10, unit: 'px' },
      { key: 'sectionTitleTop', label: '分区标题顶部间距', min: 0, max: 50, step: 2, unit: 'px' },
      { key: 'titleToCards', label: '标题与卡片间距', min: 0, max: 50, step: 2, unit: 'px' },
      { key: 'cardGap', label: '卡片间距', min: 4, max: 32, step: 2, unit: 'px' },
    ];

    layoutMap.forEach(item => {
      const currentVal = parseInt(CONFIG.layout[item.key]) || item.min;
      const wrap = document.createElement('div');
      wrap.className = 'settings-slider-wrap';
      wrap.innerHTML = '<div class="settings-slider-header"><span class="settings-slider-label">' + item.label + '</span><span class="settings-slider-value">' + currentVal + item.unit + '</span></div><input type="range" class="settings-slider" data-key="' + item.key + '" min="' + item.min + '" max="' + item.max + '" step="' + item.step + '" value="' + currentVal + '">';
      sliderGroup.appendChild(wrap);

      const slider = wrap.querySelector('.settings-slider');
      const valueLabel = wrap.querySelector('.settings-slider-value');
      slider.addEventListener('input', (e) => {
        const val = e.target.value;
        valueLabel.textContent = val + item.unit;
        App.updateLayout(item.key, val + item.unit);
      });
    });
  },

  createSectionEffects(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/></svg>视觉效果</div><div class="settings-slider-group" id="effect-sliders"></div>';
    container.appendChild(section);

    const sliderGroup = section.querySelector('#effect-sliders');
    const effectMap = [
      { key: 'bgFrostOpacity', label: '背景遮罩不透明度', min: 0, max: 1, step: 0.01, cssVar: '--bg-frost-opacity' },
      { key: 'searchFrostOpacity', label: '搜索框不透明度', min: 0, max: 1, step: 0.01, cssVar: '--search-frost-opacity' },
      { key: 'dropdownOpacity', label: '下拉菜单不透明度', min: 0, max: 1, step: 0.01, cssVar: '--dropdown-opacity' },
    ];

    effectMap.forEach(item => {
      const currentVal = CONFIG.effects[item.key] || 0;
      const wrap = document.createElement('div');
      wrap.className = 'settings-slider-wrap';
      if (item.key === 'bgFrostOpacity') wrap.id = 'bg-opacity-wrap';
      wrap.innerHTML = '<div class="settings-slider-header"><span class="settings-slider-label">' + item.label + '</span><span class="settings-slider-value">' + Math.round(currentVal * 100) + '%</span></div><input type="range" class="settings-slider" data-key="' + item.key + '" min="0" max="1" step="0.01" value="' + currentVal + '">';
      sliderGroup.appendChild(wrap);

      const slider = wrap.querySelector('.settings-slider');
      const valueLabel = wrap.querySelector('.settings-slider-value');
      slider.addEventListener('input', async (e) => {
        const val = parseFloat(e.target.value);
        valueLabel.textContent = Math.round(val * 100) + '%';
        CONFIG.effects[item.key] = val;
        document.documentElement.style.setProperty(item.cssVar, String(val));
        await ConfigStore.save();
      });
    });

    // 初始化背景遮罩不透明度滑块的锁定状态
    const bgOpacityWrap = document.getElementById('bg-opacity-wrap');
    if (bgOpacityWrap && !CONFIG.bgBlur) {
      bgOpacityWrap.style.opacity = '0.35';
      bgOpacityWrap.style.pointerEvents = 'none';
    }
  },

  createSectionEngines(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>搜索引擎</div><div class="settings-engine-list" id="engine-list"></div><div class="settings-add-form" id="engine-add-form" style="display:none;"><input type="text" class="settings-input" id="engine-name" placeholder="名称，如 Bing"><input type="text" class="settings-input" id="engine-base" placeholder="搜索地址前缀，如 https://cn.bing.com/search?q="><div class="settings-input-wrap"><button type="button" class="settings-btn" id="engine-save-btn">保存</button><button type="button" class="settings-btn settings-btn-secondary" id="engine-cancel-btn">取消</button></div></div><button type="button" class="settings-btn settings-btn-full" id="engine-add-btn">+ 添加搜索引擎</button>';
    container.appendChild(section);

    this.renderEngineList();

    document.getElementById('engine-add-btn').addEventListener('click', () => {
      document.getElementById('engine-add-form').style.display = 'flex';
      document.getElementById('engine-name').focus();
    });

    document.getElementById('engine-cancel-btn').addEventListener('click', () => {
      document.getElementById('engine-add-form').style.display = 'none';
      document.getElementById('engine-name').value = '';
      document.getElementById('engine-base').value = '';
    });

    document.getElementById('engine-save-btn').addEventListener('click', () => {
      const name = document.getElementById('engine-name').value.trim();
      let base = document.getElementById('engine-base').value.trim();
      if (!name || !base) return;
      if (!/^https?:\/\//i.test(base)) {
        base = 'https://' + base;
      }
      App.addEngine({ name, base });
      document.getElementById('engine-add-form').style.display = 'none';
      document.getElementById('engine-name').value = '';
      document.getElementById('engine-base').value = '';
      this.renderEngineList();
    });
  },

  renderEngineList() {
    const list = document.getElementById('engine-list');
    if (!list) return;
    list.innerHTML = CONFIG.engines.map((engine, idx) => {
      let html = '<div class="settings-engine-item" data-idx="' + idx + '"><span class="settings-engine-name">' + escapeHtml(engine.name) + '</span><span class="settings-engine-url">' + escapeHtml(engine.base) + '</span>';
      if (CONFIG.engines.length > 1) {
        html += '<button type="button" class="settings-engine-delete" data-idx="' + idx + '" title="删除">×</button>';
      }
      html += '</div>';
      return html;
    }).join('');

    list.querySelectorAll('.settings-engine-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const idx = parseInt(e.target.dataset.idx);
        if (CONFIG.engines.length <= 1) return;
        const removed = CONFIG.engines[idx];
        CONFIG.engines.splice(idx, 1);
        if (CONFIG.search.defaultEngine === removed.name) {
          CONFIG.search.defaultEngine = CONFIG.engines[0].name;
          Search.currentEngine = CONFIG.engines[0];
          Search.updatePlaceholder();
        }
        Search.renderDropdown();
        await ConfigStore.save();
        this.renderEngineList();
      });
    });

    // 引擎拖拽排序
    this._initEngineDragAndDrop(list);
  },

  /* ---------- 搜索引擎拖拽排序 ---------- */

  _initEngineDragAndDrop(listContainer) {
    const self = this;
    let draggedItem = null;
    let draggedIdx = -1;

    const clearHighlights = () => {
      listContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      listContainer.querySelectorAll('.drag-over-bottom').forEach(el => el.classList.remove('drag-over-bottom'));
    };

    listContainer.querySelectorAll('.settings-engine-item').forEach(item => {
      item.setAttribute('draggable', 'true');

      item.addEventListener('dragstart', (e) => {
        draggedItem = item;
        draggedIdx = parseInt(item.dataset.idx);
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(draggedIdx));
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        draggedItem = null;
        draggedIdx = -1;
        clearHighlights();
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault(); // 必须调用，否则 drop 不会触发
        if (!draggedItem || draggedItem === item) return;
        // 指针在目标上半部分 = 插到其前面，下半部分 = 插到其后面
        const rect = item.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        item.classList.toggle('drag-over', !after);
        item.classList.toggle('drag-over-bottom', after);
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-over');
        item.classList.remove('drag-over-bottom');
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedItem || draggedItem === item) return;
        const targetIdx = parseInt(item.dataset.idx);
        const rect = item.getBoundingClientRect();
        const after = (e.clientY - rect.top) > rect.height / 2;
        item.classList.remove('drag-over');
        item.classList.remove('drag-over-bottom');
        self._moveEngine(draggedIdx, targetIdx, after);
      });
    });
  },

  async _moveEngine(fromIdx, toIdx, after) {
    if (fromIdx === toIdx) return;
    if (fromIdx < 0 || fromIdx >= CONFIG.engines.length) return;

    const engine = CONFIG.engines.splice(fromIdx, 1)[0];
    if (!engine) return;

    let insertIdx = toIdx;
    if (toIdx > fromIdx) insertIdx = toIdx - 1; // 先删除导致目标位置前移
    if (after) insertIdx += 1;
    insertIdx = Math.max(0, Math.min(insertIdx, CONFIG.engines.length));
    CONFIG.engines.splice(insertIdx, 0, engine);

    await ConfigStore.save();
    Search.renderDropdown();
    this.renderEngineList();
  },

  createSectionNavManager(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v16m8-8H4"/></svg>导航管理</div><div class="settings-nav-manager" id="nav-manager"></div>';
    container.appendChild(section);
    this.renderNavManager();
  },

  renderNavManager() {
    const container = document.getElementById('nav-manager');
    if (!container) return;

    container.innerHTML = '<div class="settings-nav-sections" id="nav-sections-list"></div>' +
      '<div class="settings-add-form" id="section-add-form" style="display:none;"><input type="text" class="settings-input" id="section-title-input" placeholder="分组名称"><div class="settings-input-wrap"><button type="button" class="settings-btn" id="section-save-btn">添加分组</button><button type="button" class="settings-btn settings-btn-secondary" id="section-cancel-btn">取消</button></div></div>' +
      '<button type="button" class="settings-btn settings-btn-full" id="import-bookmarks-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>从书签导入</button>' +
      '<input type="file" id="import-bookmarks-file" accept=".html" style="display:none;">' +
      '<button type="button" class="settings-btn settings-btn-full" id="section-add-btn">+ 添加分组</button>';

    this.renderNavSections();

    document.getElementById('section-add-btn').addEventListener('click', () => {
      document.getElementById('section-add-form').style.display = 'flex';
      document.getElementById('section-title-input').focus();
    });

    // 从书签导入
    const bookmarksFileInput = document.getElementById('import-bookmarks-file');
    document.getElementById('import-bookmarks-btn').addEventListener('click', () => {
      bookmarksFileInput.click();
    });
    bookmarksFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await App.importBookmarks(ev.target.result);
          this.renderNavManager();
          alert('书签导入成功！');
        } catch (err) {
          alert('书签导入失败：' + err.message);
        }
      };
      reader.readAsText(file);
      bookmarksFileInput.value = '';
    });

    document.getElementById('section-cancel-btn').addEventListener('click', () => {
      document.getElementById('section-add-form').style.display = 'none';
      document.getElementById('section-title-input').value = '';
    });

    document.getElementById('section-save-btn').addEventListener('click', async () => {
      const title = document.getElementById('section-title-input').value.trim();
      if (!title) return;
      await App.addSection({ title, items: [] });
      document.getElementById('section-add-form').style.display = 'none';
      document.getElementById('section-title-input').value = '';
      this.renderNavManager();
    });
  },

  renderNavSections() {
    const list = document.getElementById('nav-sections-list');
    if (!list) return;

    list.innerHTML = CONFIG.sections.map((section, sIdx) => {
      let html = '<div class="settings-nav-manager-section"><div class="settings-nav-manager-header"><span class="settings-nav-manager-title">' + escapeHtml(section.title) + '</span><div class="settings-nav-manager-actions">' +
        '<button type="button" class="settings-nav-manager-action" data-action="add-card" data-section="' + sIdx + '" title="添加卡片">+</button>' +
        '<button type="button" class="settings-nav-manager-action" data-action="delete-section" data-section="' + sIdx + '" title="删除分组">×</button>' +
        '</div></div><div class="settings-nav-manager-cards">';
      section.items.forEach((item, cIdx) => {
        html += '<div class="settings-nav-manager-card"><div class="settings-nav-manager-card-info"><span class="settings-nav-manager-card-title">' + escapeHtml(item.title) + '</span><span class="settings-nav-manager-card-url">' + escapeHtml(item.domain) + '</span></div>' +
          '<div class="settings-nav-manager-card-actions">' +
          '<button type="button" class="settings-nav-manager-card-edit" data-section="' + sIdx + '" data-card="' + cIdx + '" title="编辑卡片">✎</button>' +
          '<button type="button" class="settings-nav-manager-card-delete" data-section="' + sIdx + '" data-card="' + cIdx + '" title="删除卡片">×</button>' +
          '</div></div>' +
          // 每个卡片的内联编辑表单
          '<div class="settings-card-inline-form" id="card-inline-form-' + sIdx + '-' + cIdx + '" style="display:none;">' +
          '<input type="text" class="settings-input" placeholder="标题" data-field="edit-title">' +
          '<input type="text" class="settings-input" placeholder="链接地址" data-field="edit-url">' +
          '<input type="text" class="settings-input" placeholder="小文字" data-field="edit-domain">' +
          '<input type="text" class="settings-input" placeholder="图片 URL（可选）" data-field="edit-logo">' +
          '<div class="settings-radio-group" style="margin:0;"><label class="settings-radio"><input type="radio" name="card-inline-style-' + sIdx + '-' + cIdx + '" value="image" checked><span>带图</span></label><label class="settings-radio"><input type="radio" name="card-inline-style-' + sIdx + '-' + cIdx + '" value="text"><span>纯文字</span></label></div>' +
          '<div class="settings-input-wrap"><button type="button" class="settings-btn settings-card-inline-save" data-section="' + sIdx + '" data-card="' + cIdx + '">保存</button><button type="button" class="settings-btn settings-btn-secondary settings-card-inline-cancel" data-section="' + sIdx + '" data-card="' + cIdx + '">取消</button></div>' +
          '</div>';
      });
      html += '</div>' +
        // 添加卡片表单
        '<div class="settings-card-add-form" id="card-form-' + sIdx + '" style="display:none;">' +
        '<input type="text" class="settings-input" placeholder="标题" data-field="title">' +
        '<input type="text" class="settings-input" placeholder="链接地址" data-field="url">' +
        '<input type="text" class="settings-input" placeholder="小文字" data-field="domain">' +
        '<input type="text" class="settings-input" placeholder="图片 URL（可选）" data-field="logo">' +
        '<div class="settings-radio-group" style="margin:0;"><label class="settings-radio"><input type="radio" name="card-style-' + sIdx + '" value="image" checked><span>带图</span></label><label class="settings-radio"><input type="radio" name="card-style-' + sIdx + '" value="text"><span>纯文字</span></label></div>' +
        '<div class="settings-input-wrap"><button type="button" class="settings-btn settings-card-save" data-section="' + sIdx + '">保存</button><button type="button" class="settings-btn settings-btn-secondary settings-card-cancel" data-section="' + sIdx + '">取消</button></div>' +
        '</div>' +

        '</div></div>';
      return html;
    }).join('');

    // 删除分组
    list.querySelectorAll('[data-action="delete-section"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const title = CONFIG.sections[sIdx].title;
        if (confirm('确定要删除分组「' + title + '」吗？')) {
          App.removeSection(title);
          this.renderNavManager();
        }
      });
    });

    // 显示添加卡片表单
    list.querySelectorAll('[data-action="add-card"]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = e.currentTarget.dataset.section;
        const form = document.getElementById('card-form-' + sIdx);
        if (form) {
          const wasHidden = form.style.display === 'none';
          form.style.display = wasHidden ? 'flex' : 'none';
          if (wasHidden) {
            const styleRadio = form.querySelector('input[name="card-style-' + sIdx + '"]:checked');
            const logoInput = form.querySelector('[data-field="logo"]');
            if (logoInput && styleRadio) {
              logoInput.style.display = styleRadio.value === 'text' ? 'none' : 'block';
            }
          }
        }
      });
    });

    // 删除卡片
    list.querySelectorAll('.settings-nav-manager-card-delete').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const cIdx = parseInt(e.currentTarget.dataset.card);
        CONFIG.sections[sIdx].items.splice(cIdx, 1);
        Renderer.renderSections();
        await ConfigStore.save();
        this.renderNavManager();
      });
    });

    // 编辑卡片 - 点击编辑按钮，填充内联表单并显示
    list.querySelectorAll('.settings-nav-manager-card-edit').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const cIdx = parseInt(e.currentTarget.dataset.card);
        const item = CONFIG.sections[sIdx].items[cIdx];

        // 先隐藏所有其他内联编辑表单
        list.querySelectorAll('.settings-card-inline-form').forEach(f => f.style.display = 'none');

        // 显示当前卡片的内联编辑表单
        const inlineForm = document.getElementById('card-inline-form-' + sIdx + '-' + cIdx);
        if (!inlineForm) return;

        // 填充数据
        inlineForm.querySelector('[data-field="edit-title"]').value = item.title;
        inlineForm.querySelector('[data-field="edit-url"]').value = item.url;
        inlineForm.querySelector('[data-field="edit-domain"]').value = item.domain;
        inlineForm.querySelector('[data-field="edit-logo"]').value = item.logo || '';

        // 设置样式单选
        const styleVal = item.style || (item.logo ? 'image' : 'text');
        const styleRadio = inlineForm.querySelector('input[name="card-inline-style-' + sIdx + '-' + cIdx + '"][value="' + styleVal + '"]');
        if (styleRadio) styleRadio.checked = true;

        // 控制图片 URL 输入框显示/隐藏
        const logoInput = inlineForm.querySelector('[data-field="edit-logo"]');
        if (logoInput) {
          logoInput.style.display = styleVal === 'text' ? 'none' : 'block';
        }

        inlineForm.style.display = 'flex';
      });
    });

    // 内联编辑表单 - 样式切换
    list.querySelectorAll('.settings-card-inline-form').forEach(form => {
      const formId = form.id;
      if (!formId || !formId.startsWith('card-inline-form-')) return;
      const parts = formId.replace('card-inline-form-', '').split('-');
      const sIdx = parts[0];
      const cIdx = parts[1];
      form.querySelectorAll('input[name="card-inline-style-' + sIdx + '-' + cIdx + '"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const logoInput = form.querySelector('[data-field="edit-logo"]');
          if (logoInput) {
            logoInput.style.display = e.target.value === 'text' ? 'none' : 'block';
          }
        });
      });
    });

    // 内联编辑表单 - 保存修改
    list.querySelectorAll('.settings-card-inline-save').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const cIdx = parseInt(e.currentTarget.dataset.card);
        const inlineForm = document.getElementById('card-inline-form-' + sIdx + '-' + cIdx);
        if (!inlineForm) return;

        const inputs = inlineForm.querySelectorAll('.settings-input');
        const styleRadio = inlineForm.querySelector('input[name="card-inline-style-' + sIdx + '-' + cIdx + '"]:checked');

        const title = inputs[0].value.trim();
        const url = inputs[1].value.trim();
        const domain = inputs[2].value.trim();
        const logo = inputs[3].value.trim();
        const style = styleRadio ? styleRadio.value : (logo ? 'image' : 'text');

        if (!title || !url || !domain) return;

        let finalUrl = url;
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }

        await App.editCard(sIdx, cIdx, {
          title,
          url: finalUrl,
          domain,
          logo: logo || '',
          scale: 1,
          style
        });

        inlineForm.style.display = 'none';
        this.renderNavManager();
      });
    });

    // 内联编辑表单 - 取消
    list.querySelectorAll('.settings-card-inline-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = e.currentTarget.dataset.section;
        const cIdx = e.currentTarget.dataset.card;
        const inlineForm = document.getElementById('card-inline-form-' + sIdx + '-' + cIdx);
        if (inlineForm) {
          inlineForm.style.display = 'none';
          inlineForm.querySelectorAll('.settings-input').forEach(i => i.value = '');
        }
      });
    });

    // 样式选择切换：纯文字时隐藏图片 URL 输入框
    list.querySelectorAll('.settings-card-add-form').forEach(form => {
      const sIdx = form.id.replace('card-form-', '');
      form.querySelectorAll('input[name="card-style-' + sIdx + '"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
          const logoInput = form.querySelector('[data-field="logo"]');
          if (logoInput) {
            logoInput.style.display = e.target.value === 'text' ? 'none' : 'block';
          }
        });
      });
    });

    // 保存卡片
    list.querySelectorAll('.settings-card-save').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const form = document.getElementById('card-form-' + sIdx);
        if (!form) return;
        const inputs = form.querySelectorAll('.settings-input');
        const styleRadio = form.querySelector('input[name="card-style-' + sIdx + '"]:checked');

        const title = inputs[0].value.trim();
        const url = inputs[1].value.trim();
        const domain = inputs[2].value.trim();
        const logo = inputs[3].value.trim();
        const style = styleRadio ? styleRadio.value : (logo ? 'image' : 'text');

        if (!title || !url || !domain) return;

        let finalUrl = url;
        if (!/^https?:\/\//i.test(finalUrl)) {
          finalUrl = 'https://' + finalUrl;
        }

        App.addCard(CONFIG.sections[sIdx].title, {
          title,
          url: finalUrl,
          domain,
          logo: logo || '',
          scale: 1,
          style
        });

        form.style.display = 'none';
        inputs.forEach(i => i.value = '');
        this.renderNavManager();
      });
    });

    // 取消添加
    list.querySelectorAll('.settings-card-cancel').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const sIdx = e.currentTarget.dataset.section;
        const form = document.getElementById('card-form-' + sIdx);
        if (form) {
          form.style.display = 'none';
          form.querySelectorAll('.settings-input').forEach(i => i.value = '');
        }
      });
    });

    // ========== 卡片拖拽排序 ==========
    this._initCardDragAndDrop(list);
  },

  _initCardDragAndDrop(listContainer) {
    const self = this;
    let draggedCard = null;
    let draggedSIdx = -1;
    let draggedCIdx = -1;

    // 清除之前可能残留的高亮
    const clearHighlights = () => {
      listContainer.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      listContainer.querySelectorAll('.drag-over-section').forEach(el => el.classList.remove('drag-over-section'));
      listContainer.querySelectorAll('.drag-over-header').forEach(el => el.classList.remove('drag-over-header'));
    };

    // 使所有卡片可拖拽
    listContainer.querySelectorAll('.settings-nav-manager-card').forEach(card => {
      card.setAttribute('draggable', 'true');

      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        const editBtn = card.querySelector('.settings-nav-manager-card-edit');
        draggedSIdx = parseInt(editBtn.dataset.section);
        draggedCIdx = parseInt(editBtn.dataset.card);
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', draggedSIdx + ',' + draggedCIdx);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
        clearHighlights();
      });

      // 卡片作为放置目标（同组内排序 + 跨组放置）
      card.addEventListener('dragover', (e) => {
        e.preventDefault(); // 必须调用，否则 drop 不会触发
        if (!draggedCard || draggedCard === card) return;
        const editBtn = card.querySelector('.settings-nav-manager-card-edit');
        const targetSIdx = parseInt(editBtn.dataset.section);
        const targetCIdx = parseInt(editBtn.dataset.card);

        if (targetSIdx === draggedSIdx) {
          // 同组内排序：显示顶部指示线
          card.classList.add('drag-over');
        } else {
          // 跨组：高亮整个卡片作为放置目标
          card.classList.add('drag-over-section');
        }
      });

      card.addEventListener('dragleave', () => {
        card.classList.remove('drag-over');
        card.classList.remove('drag-over-section');
      });

      card.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedCard || draggedCard === card) return;

        const editBtn = card.querySelector('.settings-nav-manager-card-edit');
        const targetSIdx = parseInt(editBtn.dataset.section);
        const targetCIdx = parseInt(editBtn.dataset.card);

        card.classList.remove('drag-over');
        card.classList.remove('drag-over-section');

        self._moveCard(draggedSIdx, draggedCIdx, targetSIdx, targetCIdx);
      });
    });

    // 分组标题作为放置区（跨组移动 - 放到该组最前面）
    listContainer.querySelectorAll('.settings-nav-manager-header').forEach(header => {
      header.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedCard) return;
        const addBtn = header.querySelector('[data-action="add-card"]');
        if (!addBtn) return;
        const targetSIdx = parseInt(addBtn.dataset.section);
        if (targetSIdx !== draggedSIdx) {
          header.classList.add('drag-over-header');
          header.closest('.settings-nav-manager-section').classList.add('drag-over-section');
        }
      });

      header.addEventListener('dragleave', (e) => {
        header.classList.remove('drag-over-header');
        const section = header.closest('.settings-nav-manager-section');
        if (section) section.classList.remove('drag-over-section');
      });

      header.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedCard) return;
        const addBtn = header.querySelector('[data-action="add-card"]');
        if (!addBtn) return;
        const targetSIdx = parseInt(addBtn.dataset.section);

        header.classList.remove('drag-over-header');
        const section = header.closest('.settings-nav-manager-section');
        if (section) section.classList.remove('drag-over-section');

        if (targetSIdx === draggedSIdx) return;
        // 跨组移动：放到目标分组的第0个位置（最前面）
        self._moveCard(draggedSIdx, draggedCIdx, targetSIdx, 0);
      });
    });

    // 分组卡片区域作为放置区（跨组移动 - 放到该组最后）
    listContainer.querySelectorAll('.settings-nav-manager-cards').forEach(cardsContainer => {
      const sectionEl = cardsContainer.closest('.settings-nav-manager-section');
      if (!sectionEl) return;
      const header = sectionEl.querySelector('.settings-nav-manager-header');
      if (!header) return;
      const addBtn = header.querySelector('[data-action="add-card"]');
      if (!addBtn) return;

      cardsContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedCard) return;
        const targetSIdx = parseInt(addBtn.dataset.section);
        if (targetSIdx !== draggedSIdx) {
          sectionEl.classList.add('drag-over-section');
        }
      });

      cardsContainer.addEventListener('dragleave', (e) => {
        sectionEl.classList.remove('drag-over-section');
      });

      cardsContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedCard) return;
        const targetSIdx = parseInt(addBtn.dataset.section);

        sectionEl.classList.remove('drag-over-section');

        if (targetSIdx === draggedSIdx) return;
        // 跨组移动：放到目标分组的末尾
        const targetCIdx = CONFIG.sections[targetSIdx].items.length;
        self._moveCard(draggedSIdx, draggedCIdx, targetSIdx, targetCIdx);
      });
    });
  },

  async _moveCard(fromSIdx, fromCIdx, toSIdx, toCIdx) {
    if (fromSIdx === toSIdx && fromCIdx === toCIdx) return;
    if (fromSIdx < 0 || fromSIdx >= CONFIG.sections.length) return;
    if (toSIdx < 0 || toSIdx >= CONFIG.sections.length) return;

    const fromSection = CONFIG.sections[fromSIdx];
    const toSection = CONFIG.sections[toSIdx];
    if (fromCIdx < 0 || fromCIdx >= fromSection.items.length) return;

    // 取出要移动的卡片
    const card = fromSection.items.splice(fromCIdx, 1)[0];
    if (!card) return;

    // 计算插入位置
    let insertIdx = toCIdx;
    if (fromSIdx === toSIdx && toCIdx > fromCIdx) {
      insertIdx = toCIdx - 1;
    }
    insertIdx = Math.max(0, Math.min(insertIdx, toSection.items.length));

    // 插入到新位置
    toSection.items.splice(insertIdx, 0, card);

    // 保存并刷新
    await ConfigStore.save();
    Renderer.renderSections();
    this.renderNavManager();
  },

  createSectionData(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>数据管理</div><div class="settings-data-actions"><button type="button" class="settings-btn settings-btn-full" id="export-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3V15"/></svg>导出配置</button><button type="button" class="settings-btn settings-btn-full" id="import-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>导入配置</button><input type="file" id="import-file" accept=".json" style="display:none;"><button type="button" class="settings-btn settings-btn-danger settings-btn-full" id="reset-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>恢复默认</button></div>';
    container.appendChild(section);

    document.getElementById('export-btn').addEventListener('click', () => {
      const blob = new Blob([App.exportConfig()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'lemon-newtab-config-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      URL.revokeObjectURL(url);
    });

    const importFile = document.getElementById('import-file');
    document.getElementById('import-btn').addEventListener('click', () => {
      importFile.click();
    });
    importFile.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          await App.importConfig(ev.target.result);
          this.buildPanel();
          alert('配置导入成功！');
        } catch (err) {
          alert('配置导入失败：' + err.message);
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', async () => {
      if (confirm('确定要恢复默认设置吗？所有自定义配置将丢失。')) {
        await ConfigStore.reset();
        location.reload();
      }
    });
  },

  createSectionAbout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>关于</div><div class="settings-about"><div class="settings-about-name">lemon\'s NewTab</div><div class="settings-about-version">v0.7.0</div><div class="settings-about-desc">一个简洁、可自定义的新标签页插件</div></div>';
    container.appendChild(section);
  },

  bindEvents() {
    const trigger = document.getElementById('settings-trigger');
    trigger.addEventListener('click', () => this.open());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        // CSS 编辑器内按 Esc：仅失焦，避免误关面板丢失未保存内容
        if (e.target && e.target.id === 'custom-css-input') { e.target.blur(); return; }
        // 二级面板打开时：先关二级，再按一次才关主面板
        if (Advanced.isOpen) { Advanced.close(); return; }
        this.close();
      }
    });
  },

  open() {
    this.isOpen = true;
    document.documentElement.classList.add('settings-locked');
    document.body.classList.add('settings-locked', 'settings-panel-open');
    document.getElementById('settings-panel').classList.add('open');
    document.getElementById('settings-overlay').classList.add('open');
  },

  close() {
    this.isOpen = false;
    Advanced.close();
    document.documentElement.classList.remove('settings-locked');
    document.body.classList.remove('settings-locked', 'settings-panel-open');
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('settings-overlay').classList.remove('open');
  }
};

/* ============================================================
 *  Colors（组件配色：内联 CSS 变量覆盖，空值 = 默认）
 * ============================================================ */

const Colors = {
  ITEMS: [
    { key: 'clock',        label: '时钟',       cssVar: '--clock-color',         fallback: '#ffffff' },
    { key: 'date',         label: '日期',       cssVar: '--date-color',          fallback: '#ffffff' },
    { key: 'searchText',   label: '搜索框文字', cssVar: '--search-text',         fallback: '#ffffff' },
    { key: 'searchBorder', label: '搜索框边框', cssVar: '--search-border',       fallback: '#ffffff' },
    { key: 'sectionTitle', label: '分组标题',   cssVar: '--section-title-color', fallback: '#9b9b9b' },
    { key: 'cardTitle',    label: '卡片标题',   cssVar: '--card-title-color',    fallback: '#111827' },
    { key: 'cardUrl',      label: '卡片域名',   cssVar: '--card-url-color',      fallback: '#9b9b9b' },
    { key: 'accent',       label: '强调色',     cssVar: '--accent',              fallback: '#8b5cf6' },
  ],

  hexToRgb(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return null;
    const n = parseInt(m[1], 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255].join(', ');
  },

  apply() {
    if (!CONFIG.colors) CONFIG.colors = {};
    const root = document.documentElement;
    this.ITEMS.forEach(item => {
      const val = CONFIG.colors[item.key];
      if (val) {
        root.style.setProperty(item.cssVar, val);
        if (item.key === 'accent') {
          const rgb = this.hexToRgb(val);
          if (rgb) root.style.setProperty('--accent-rgb', rgb);
        }
      } else {
        root.style.removeProperty(item.cssVar);
        if (item.key === 'accent') root.style.removeProperty('--accent-rgb');
      }
    });
  },

  async set(key, val) {
    if (!CONFIG.colors) CONFIG.colors = {};
    CONFIG.colors[key] = val;
    this.apply();
    await ConfigStore.save();
  },

  async resetAll() {
    CONFIG.colors = {};
    this.apply();
    await ConfigStore.save();
  }
};

/* ============================================================
 *  CustomCSS（自定义样式注入）
 * ============================================================ */

const CustomCSS = {
  STYLE_ID: 'custom-css-style',

  apply(cssText) {
    let el = document.getElementById(this.STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = this.STYLE_ID;
      document.head.appendChild(el); // 最后注入，同优先级下覆盖默认样式
    }
    el.textContent = cssText || '';
  },

  async set(cssText) {
    CONFIG.customCSS = cssText;
    this.apply(cssText);
    await ConfigStore.save();
  }
};

/* ============================================================
 *  Advanced（高级：二级设置面板）
 * ============================================================ */

const Advanced = {
  isOpen: false,

  init() {
    this.buildSubpanel();
  },

  buildSubpanel() {
    const panel = document.createElement('aside');
    panel.id = 'settings-advanced-panel';
    panel.className = 'settings-panel settings-subpanel';
    panel.innerHTML =
      '<div class="settings-panel-inner">' +
        '<div class="settings-subpanel-header">' +
          '<button type="button" class="settings-subpanel-back" id="advanced-back-btn" aria-label="返回">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>' +
          '<span class="settings-subpanel-title">自定义 CSS</span>' +
        '</div>' +
        '<textarea class="settings-input settings-css-editor" id="custom-css-input" spellcheck="false" placeholder="/* 在这里输入自定义 CSS，例如：&#10;#clock { letter-spacing: 4px; }&#10;.nav-card { backdrop-filter: blur(8px); } */"></textarea>' +
        '<div class="settings-input-wrap">' +
          '<button type="button" class="settings-btn" id="custom-css-apply">应用并保存</button>' +
          '<button type="button" class="settings-btn settings-btn-secondary" id="custom-css-clear">清空</button>' +
        '</div>' +
        '<p class="settings-subpanel-hint">CSS 会注入到页面 &lt;head&gt; 末尾，同优先级下覆盖默认样式。填写错误可能导致显示异常，清空后重新应用即可恢复。</p>' +
      '</div>';
    document.body.appendChild(panel);

    const input = document.getElementById('custom-css-input');
    input.value = CONFIG.customCSS || '';

    document.getElementById('advanced-back-btn').addEventListener('click', () => this.close());

    document.getElementById('custom-css-apply').addEventListener('click', async (e) => {
      await CustomCSS.set(input.value);
      const btn = e.currentTarget;
      btn.textContent = '已应用 ✓';
      setTimeout(() => { btn.textContent = '应用并保存'; }, 1200);
    });

    document.getElementById('custom-css-clear').addEventListener('click', async () => {
      if (!input.value) return;
      input.value = '';
      await CustomCSS.set('');
    });
  },

  open() {
    this.isOpen = true;
    document.getElementById('settings-advanced-panel').classList.add('open');
    // 同步最新保存值（导入配置等外部变更后保持一致）
    document.getElementById('custom-css-input').value = CONFIG.customCSS || '';
  },

  close() {
    this.isOpen = false;
    const p = document.getElementById('settings-advanced-panel');
    if (p) p.classList.remove('open');
  }
};

/* ============================================================
 *  Background Cache Helper
 * ============================================================ */

// 本次会话内已尝试过的 URL，避免重复下载
const _bgCacheAttempted = new Set();

function cacheUrlToBase64(url) {
  if (!url || url.startsWith('data:')) return;
  if (url.indexOf('pumpkin-8384698') !== -1) return;
  if (_bgCacheAttempted.has(url)) return;
  _bgCacheAttempted.add(url);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
      ConfigStore.saveBgBase64(url, dataUrl);
    } catch (e) {
      console.warn('Base64 cache failed:', e);
    }
  };
  img.onerror = function() {
    console.warn('Base64 cache download failed:', url);
  };
  img.src = url;
}

/* ============================================================
 *  Shortcuts（键盘快捷键）
 * ============================================================ */

const Shortcuts = {
  init() {
    document.addEventListener('keydown', (e) => {
      // Ctrl/Cmd + K：打开 / 关闭设置面板
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        Settings.isOpen ? Settings.close() : Settings.open();
        return;
      }

      // /：聚焦搜索框（不在输入框中、设置面板未打开时）
      if (e.key === '/' && !e.ctrlKey && !e.metaKey && !e.altKey && !Settings.isOpen) {
        const t = e.target;
        const isEditable = t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable);
        if (isEditable) return;
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input) input.focus();
      }
    });
  }
};

/* ============================================================
 *  BingWallpaper（Bing 每日壁纸）
 * ============================================================
 *  接口：https://www.bing.com/HPImageArchive.aspx（无需密钥）
 *  注意：接口不返回 CORS 头，纯网页环境无法直接 fetch；
 *        扩展环境通过 optional_host_permissions 授权后不受限。
 *  图片本身带 Access-Control-Allow-Origin: *，base64 缓存可用。
 * ============================================================ */

const BingWallpaper = {
  API: 'https://www.bing.com/HPImageArchive.aspx?format=js&idx=0&n=1&mkt=zh-CN',
  ORIGIN: 'https://www.bing.com/',
  RES: '_1920x1080.jpg',

  _today() {
    const d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  },

  /* 权限查询/请求：扩展环境返回 true/false；非扩展环境返回 null（直接尝试 fetch） */
  hasPermission() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.permissions) { resolve(null); return; }
      chrome.permissions.contains({ origins: [this.ORIGIN] }, (granted) => resolve(!!granted));
    });
  },

  requestPermission() {
    return new Promise((resolve) => {
      if (typeof chrome === 'undefined' || !chrome.permissions) { resolve(null); return; }
      chrome.permissions.request({ origins: [this.ORIGIN] }, (granted) => resolve(!!granted));
    });
  },

  /** 拉取今日壁纸的完整 URL（1920x1080） */
  async fetchTodayUrl() {
    const resp = await fetch(this.API);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const img = data && data.images && data.images[0];
    const base = img && (img.urlbase || (img.url || '').replace(/_\d+x\d+\.jpg.*$/, ''));
    if (!base) throw new Error('接口返回格式异常');
    return 'https://www.bing.com' + base + this.RES;
  },

  /** 应用壁纸：复用现有管线（即时切换 + 持久化 + base64 缓存） */
  async applyUrl(url) {
    CONFIG.backgroundImage = url;
    CONFIG._bingDate = this._today();
    document.body.style.setProperty('--bg-image', 'url("' + url + '")');
    await ConfigStore.clearBgCache();
    await ConfigStore.saveBgUrl(url);
    await ConfigStore.save();
    setTimeout(() => cacheUrlToBase64(url), 0);
  },

  /** 开启时立即拉取（异常向上抛，由调用方提示） */
  async enable() {
    const url = await this.fetchTodayUrl();
    await this.applyUrl(url);
  },

  /** 每日检查：仅在已授权且日期变化时拉取，失败静默保留当前背景 */
  async maybeUpdate() {
    if (!CONFIG.bingDaily) return;
    if (CONFIG._bingDate === this._today()) return;
    const granted = await this.hasPermission();
    if (granted === false) {
      console.warn('Bing 每日壁纸：未授权访问 bing.com，跳过更新');
      return;
    }
    try {
      const url = await this.fetchTodayUrl();
      if (url !== CONFIG.backgroundImage) {
        await this.applyUrl(url);
      } else {
        CONFIG._bingDate = this._today();
        await ConfigStore.save();
      }
    } catch (e) {
      console.warn('Bing 每日壁纸更新失败，保留当前背景:', e);
    }
  }
};

/* ============================================================
 *  App
 * ============================================================ */

const App = {
  async addEngine(engine) {
    if (CONFIG.engines.find(e => e.name === engine.name)) {
      console.warn('Engine exists:', engine.name);
      return;
    }
    CONFIG.engines.push(engine);
    Search.renderDropdown();
    await ConfigStore.save();
  },

  async addSection(section) {
    CONFIG.sections.push(section);
    Renderer.renderSections();
    await ConfigStore.save();
  },

  async addCard(sectionTitle, card) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (section) {
      section.items.push(card);
      Renderer.renderSections();
      await ConfigStore.save();
    }
  },

  async editCard(sectionIdx, cardIdx, card) {
    const section = CONFIG.sections[sectionIdx];
    if (section && section.items[cardIdx]) {
      section.items[cardIdx] = card;
      Renderer.renderSections();
      await ConfigStore.save();
    }
  },

  async removeSection(title) {
    CONFIG.sections = CONFIG.sections.filter(s => s.title !== title);
    Renderer.renderSections();
    await ConfigStore.save();
  },

  setTheme(themeName) {
    Theme.set(themeName);
  },

  syncLayout() {
    const root = document.documentElement;
    const L = CONFIG.layout;
    root.style.setProperty('--spacing-page-top', L.pageTop);
    root.style.setProperty('--spacing-clock-date', L.clockToDate);
    root.style.setProperty('--spacing-date-search', L.dateToSearch);
    root.style.setProperty('--spacing-search-nav', L.searchToNav);
    root.style.setProperty('--spacing-section-title', L.sectionTitleTop);
    root.style.setProperty('--spacing-section-list', L.titleToCards);
    root.style.setProperty('--spacing-card', L.cardGap);
  },

  syncEffects() {
    const root = document.documentElement;
    const E = CONFIG.effects;
    root.style.setProperty('--bg-frost-opacity', String(E.bgFrostOpacity));
    root.style.setProperty('--search-frost-opacity', String(E.searchFrostOpacity));
    root.style.setProperty('--dropdown-opacity', String(E.dropdownOpacity));
  },

  async updateLayout(key, value) {
    if (CONFIG.layout[key] !== undefined) {
      CONFIG.layout[key] = value;
      this.syncLayout();
      await ConfigStore.save();
    }
  },

  exportConfig() {
    return JSON.stringify(CONFIG, null, 2);
  },

  async importBookmarks(htmlContent) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    // 根容器名称列表（会被跳过，只解析其子内容）
    const ROOT_CONTAINERS = ['书签栏', '收藏夹栏', 'Bookmarks', 'Bookmarks Bar', 'Favorites Bar'];

    // 递归解析 DL 结构
    const parseDL = (dlElement, parentTitle, depth) => {
      const sections = [];
      let currentSection = null;
      const children = Array.from(dlElement.children);

      for (let i = 0; i < children.length; i++) {
        const child = children[i];
        if (child.tagName !== 'DT') continue;

        const h3 = child.querySelector(':scope > H3');
        const a = child.querySelector(':scope > A');
        const nestedDL = child.querySelector(':scope > DL');

        if (h3) {
          // 这是一个分组标题
          const title = h3.textContent.trim();
          if (!title) continue;

          const isRootContainer = ROOT_CONTAINERS.includes(title);

          if (nestedDL) {
            // 有嵌套内容，递归解析
            const nestedSections = parseDL(nestedDL, title, depth + 1);

            if (isRootContainer) {
              // 根容器（书签栏/收藏夹栏等）：直接添加子分组，不把自己当作分组
              sections.push(...nestedSections);
            } else if (depth === 0) {
              // 根级别但不是已知根容器：当作实际分组处理
              currentSection = { title, items: [] };
              nestedSections.forEach(ns => {
                currentSection.items.push(...ns.items);
              });
              if (currentSection.items.length > 0) {
                sections.push(currentSection);
              }
            } else {
              // 非根级别：这是一个实际分组
              currentSection = { title, items: [] };
              nestedSections.forEach(ns => {
                currentSection.items.push(...ns.items);
              });
              // 也包含直接在这个 DT 下的 A 标签（但通常 A 在 DL 里）
              if (currentSection.items.length > 0) {
                sections.push(currentSection);
              }
            }
          } else {
            // 空分组，跳过
          }
        } else if (a) {
          // 这是一个书签
          const title = a.textContent.trim();
          const url = a.getAttribute('HREF');
          const icon = a.getAttribute('ICON');
          if (!title || !url) continue;

          // 提取 domain
          let domain = '';
          try {
            const urlObj = new URL(url);
            domain = urlObj.hostname;
          } catch (e) {
            domain = url.replace(/^https?:\/\//, '').split('/')[0];
          }

          const card = {
            title,
            url,
            domain,
            logo: icon || '',
            scale: 1,
            style: icon ? 'image' : 'text'
          };

          if (currentSection) {
            currentSection.items.push(card);
          } else {
            // 如果没有当前分组，创建一个默认分组
            const defaultTitle = ROOT_CONTAINERS.includes(parentTitle) ? '未分组' : (parentTitle || '未分组');
            if (sections.length === 0 || sections[sections.length - 1].title !== defaultTitle) {
              sections.push({ title: defaultTitle, items: [] });
            }
            sections[sections.length - 1].items.push(card);
          }
        }
      }

      return sections;
    };

    // 找到根 DL
    const rootDL = doc.querySelector('DL');
    if (!rootDL) {
      throw new Error('无法解析书签文件');
    }

    const importedSections = parseDL(rootDL, '导入的书签', 0);

    // 过滤掉空分组
    const validSections = importedSections.filter(s => s.items.length > 0);
    if (validSections.length === 0) {
      throw new Error('未找到有效的书签数据');
    }

    // 导入前清理已存在的根容器分组（避免旧数据干扰）
    CONFIG.sections = CONFIG.sections.filter(s => !ROOT_CONTAINERS.includes(s.title));

    // 合并到现有配置中（避免重复标题）
    validSections.forEach(newSection => {
      const existing = CONFIG.sections.find(s => s.title === newSection.title);
      if (existing) {
        // 如果分组已存在，追加卡片（去重）
        newSection.items.forEach(card => {
          const dup = existing.items.find(i => i.url === card.url);
          if (!dup) existing.items.push(card);
        });
      } else {
        CONFIG.sections.push(newSection);
      }
    });

    Renderer.renderSections();
    await ConfigStore.save();
  },

  async importConfig(json) {
    try {
      const data = JSON.parse(json);
      Object.assign(CONFIG, ConfigStore.deepMerge(DEFAULT_CONFIG, data));
      Renderer.renderSections();
      Search.renderDropdown();
      this.syncLayout();
      this.syncEffects();
      Theme.apply(CONFIG.theme);
      CustomCSS.apply(CONFIG.customCSS || '');
      Colors.apply();
      document.body.style.setProperty('--bg-image', 'url("' + CONFIG.backgroundImage + '")');
      if (CONFIG.bgBlur) {
        document.body.classList.remove('no-bg-blur');
      } else {
        document.body.classList.add('no-bg-blur');
      }
      await ConfigStore.save();
      // 导入的是 URL 背景则后台缓存（下次秒开）
      if (!CONFIG.backgroundImage.startsWith('data:')) {
        cacheUrlToBase64(CONFIG.backgroundImage);
      }
    } catch (e) {
      console.error('Config parse failed:', e);
      throw e;
    }
  },

  async toggleCardStyle(sectionTitle, cardTitle) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    const card = section.items.find(i => i.title === cardTitle);
    if (!card) return;
    card.style = card.style === 'text' ? 'image' : 'text';
    Renderer.renderSections();
    await ConfigStore.save();
  },

  async setCardStyle(sectionTitle, cardTitle, style) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    const card = section.items.find(i => i.title === cardTitle);
    if (!card) return;
    card.style = style;
    Renderer.renderSections();
    await ConfigStore.save();
  },

  async setSectionStyle(sectionTitle, style) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    section.items.forEach(item => { item.style = style; });
    Renderer.renderSections();
    await ConfigStore.save();
  },

  async init() {
    await ConfigStore.load();
    this.syncLayout();
    this.syncEffects();
    CustomCSS.apply(CONFIG.customCSS || '');
    Colors.apply();

    /* ============================================================
     *  背景加载策略（v0.4.0-fix3：URL 图片自动转 base64 缓存）
     * ============================================================
     *  优先级：base64 缓存（匹配当前 URL）> 本地图占位
     *
     *  1. 用户上传的本地图片（data URL）：直接用，无网络
     *  2. 有 base64 缓存且匹配当前 URL：从 storage 秒开
     *  3. 无缓存或缓存过期：本地图占位 + 后台加载 URL +
     *     自动转 base64 缓存（下次秒开）
     * ============================================================ */
    const LOCAL_BG = 'pumpkin-8384698_960_720.jpg';
    const urlBg = CONFIG.backgroundImage;
    const cachedBase64 = CONFIG._bgBase64;
    const cachedUrl = CONFIG._bgCachedUrl;
    const isDefaultUrl = urlBg.indexOf('pumpkin-8384698') !== -1;

    if (urlBg.startsWith('data:')) {
      // 用户上传的本地图片：直接用 base64
      document.body.style.setProperty('--bg-image', 'url("' + urlBg + '")');
    } else if (cachedBase64 && cachedUrl === urlBg) {
      // 缓存命中：从 storage 直接读，秒开，零网络
      document.body.style.setProperty('--bg-image', 'url("' + cachedBase64 + '")');
    } else if (isDefaultUrl) {
      // 默认配置：本地图秒开，不浪费请求
      document.body.style.setProperty('--bg-image', 'url("' + LOCAL_BG + '")');
    } else {
      // 无缓存或缓存过期：本地图占位，后台加载 URL
      document.body.style.setProperty('--bg-image', 'url("' + LOCAL_BG + '")');
      const img = new Image();
      img.onload = function() {
        document.body.style.setProperty('--bg-image', 'url("' + urlBg + '")');
      };
      img.onerror = function() {
        // URL 图片加载失败，保持本地图片
      };
      img.src = urlBg;
      // 同时后台缓存 base64（下次秒开）
      cacheUrlToBase64(urlBg);
    }

    if (CONFIG.bgBlur) {
      document.body.classList.remove('no-bg-blur');
    } else {
      document.body.classList.add('no-bg-blur');
    }
    BingWallpaper.maybeUpdate(); // Bing 每日壁纸：日期变化才拉取，失败静默
    Theme.init();
    Clock.init();
    Search.init();
    Renderer.init();
    Settings.init();
    Advanced.init();
    Shortcuts.init();
    await ConfigStore.save();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
