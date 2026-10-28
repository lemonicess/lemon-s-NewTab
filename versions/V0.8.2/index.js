/* ============================================================
 *  新标签页 - 配置区
 * ============================================================ */

const CONFIG_SCHEMA_VERSION = 2;
const _bgCacheAttempted = new Set();

const DEFAULT_CONFIG = {
  schemaVersion: CONFIG_SCHEMA_VERSION,
  backgroundImage: 'pumpkin-8384698_960_720.jpg',
  bgBlur: true,
  bingDaily: false,
  bingImage: '',
  bingDate: '',
  theme: 'auto',
  sectionOrder: [],
  customCSS: '',

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

  search: {
    defaultEngineId: 'engine_bing',
    defaultEngine: 'Bing',
    placeholder: '使用{engine}搜索',
  },

  engines: [
    { id: 'engine_bing', name: 'Bing', base: 'https://cn.bing.com/search?q=' },
    { id: 'engine_google', name: 'Google', base: 'https://www.google.com/search?q=' },
  ],

  sections: []
};

let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

/* ============================================================
 *  ConfigStore
 * ============================================================ */

const ConfigStore = {
  STORAGE_KEY: 'lemon_newtab_config',
  BG_STORAGE_KEY: 'lemon_newtab_bg_url', // 仅用于旧版迁移，不再作为第二事实源
  BG_BASE64_KEY: 'lemon_newtab_bg_base64',
  BG_CACHED_URL_KEY: 'lemon_newtab_bg_cached_url',
  _saveTimer: null,

  _hasStorage() {
    return typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  },

  _report(action, error) {
    const detail = error && error.message ? error.message : String(error || '未知错误');
    console.error(action + ':', error);
    notify(action + '，请检查存储空间后重试', 'error');
    return false;
  },

  _keys() {
    return [this.STORAGE_KEY, this.BG_STORAGE_KEY, this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY];
  },

  _parseSaved(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    return JSON.parse(raw);
  },

  load() {
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        let needsSave = false;
        try {
          const raw = localStorage.getItem(this.STORAGE_KEY);
          const parsed = this._parseSaved(raw);
          CONFIG = normalizeConfig(parsed || {}, false);
          needsSave = !!parsed && parsed.schemaVersion !== CONFIG_SCHEMA_VERSION;
          if (!parsed || !parsed.backgroundImage) {
            const legacyUrl = sanitizeImageSource(localStorage.getItem(this.BG_STORAGE_KEY), true);
            if (legacyUrl) {
              CONFIG.backgroundImage = legacyUrl;
              needsSave = true;
            }
          }
          CONFIG._bgBase64 = localStorage.getItem(this.BG_BASE64_KEY) || (parsed && parsed._bgBase64) || '';
          CONFIG._bgCachedUrl = localStorage.getItem(this.BG_CACHED_URL_KEY) || (parsed && parsed._bgCachedUrl) || '';
        } catch (e) {
          console.warn('Config load failed:', e);
          CONFIG = normalizeConfig({}, false);
        }
        resolve(needsSave);
        return;
      }

      chrome.storage.local.get(this._keys(), async (result) => {
        if (chrome.runtime.lastError) {
          this._report('配置读取失败', chrome.runtime.lastError);
          CONFIG = normalizeConfig({}, false);
          resolve(false);
          return;
        }
        try {
          const migrated = await this._migrateLegacyStorage(result);
          const parsed = this._parseSaved(result[this.STORAGE_KEY]);
          CONFIG = normalizeConfig(parsed || {}, false);
          let needsSave = migrated || (!!parsed && parsed.schemaVersion !== CONFIG_SCHEMA_VERSION);

          // 旧版背景镜像只在配置本体缺少背景时参与迁移，避免覆盖用户原图。
          if (!parsed || !parsed.backgroundImage) {
            const legacyUrl = sanitizeImageSource(result[this.BG_STORAGE_KEY], true);
            if (legacyUrl) {
              CONFIG.backgroundImage = legacyUrl;
              needsSave = true;
            }
          }
          CONFIG._bgBase64 = result[this.BG_BASE64_KEY] || (parsed && parsed._bgBase64) || '';
          CONFIG._bgCachedUrl = result[this.BG_CACHED_URL_KEY] || (parsed && parsed._bgCachedUrl) || '';
          resolve(needsSave);
        } catch (e) {
          console.warn('Config parse failed:', e);
          notify('配置格式异常，已临时使用默认设置', 'error');
          CONFIG = normalizeConfig({}, false);
          resolve(false);
        }
      });
    });
  },

  save() {
    const serialized = JSON.stringify(getPublicConfig(CONFIG));
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.setItem(this.STORAGE_KEY, serialized);
          resolve(true);
        } catch (e) {
          resolve(this._report('配置保存失败', e));
        }
        return;
      }
      chrome.storage.local.set({ [this.STORAGE_KEY]: serialized }, () => {
        if (chrome.runtime.lastError) {
          resolve(this._report('配置保存失败', chrome.runtime.lastError));
        } else {
          resolve(true);
        }
      });
    });
  },

  saveDebounced(delay = 300) {
    clearTimeout(this._saveTimer);
    this._saveTimer = setTimeout(() => {
      this._saveTimer = null;
      this.save();
    }, delay);
  },

  flush() {
    if (!this._saveTimer) return Promise.resolve(true);
    clearTimeout(this._saveTimer);
    this._saveTimer = null;
    return this.save();
  },

  saveBgBase64(url, dataUrl) {
    CONFIG._bgBase64 = dataUrl;
    CONFIG._bgCachedUrl = url;
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.setItem(this.BG_BASE64_KEY, dataUrl);
          localStorage.setItem(this.BG_CACHED_URL_KEY, url);
          resolve(true);
        } catch (e) {
          console.warn('Base64 cache save failed:', e);
          resolve(false);
        }
        return;
      }
      chrome.storage.local.set({
        [this.BG_BASE64_KEY]: dataUrl,
        [this.BG_CACHED_URL_KEY]: url
      }, () => {
        if (chrome.runtime.lastError) {
          console.warn('Base64 cache save failed:', chrome.runtime.lastError);
          resolve(false);
        } else {
          resolve(true);
        }
      });
    });
  },

  clearBgCache() {
    delete CONFIG._bgBase64;
    delete CONFIG._bgCachedUrl;
    _bgCacheAttempted.clear();
    return new Promise((resolve) => {
      if (!this._hasStorage()) {
        try {
          localStorage.removeItem(this.BG_BASE64_KEY);
          localStorage.removeItem(this.BG_CACHED_URL_KEY);
          resolve(true);
        } catch (e) {
          resolve(this._report('图片缓存清理失败', e));
        }
        return;
      }
      chrome.storage.local.remove([this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY], () => {
        if (chrome.runtime.lastError) {
          resolve(this._report('图片缓存清理失败', chrome.runtime.lastError));
        } else {
          resolve(true);
        }
      });
    });
  },

  reset() {
    CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    return new Promise((resolve) => {
      const finish = async () => resolve(await this.save());
      if (!this._hasStorage()) {
        try {
          localStorage.removeItem(this.BG_STORAGE_KEY);
          localStorage.removeItem(this.BG_BASE64_KEY);
          localStorage.removeItem(this.BG_CACHED_URL_KEY);
        } catch (e) {}
        finish();
        return;
      }
      chrome.storage.local.remove([this.BG_STORAGE_KEY, this.BG_BASE64_KEY, this.BG_CACHED_URL_KEY], () => {
        if (chrome.runtime.lastError) {
          resolve(this._report('恢复默认失败', chrome.runtime.lastError));
          return;
        }
        finish();
      });
    });
  },

  _migrateLegacyStorage(result) {
    const toMigrate = {};
    this._keys().forEach((key) => {
      if (result[key] !== undefined && result[key] !== null) return;
      try {
        const value = localStorage.getItem(key);
        if (value !== null) {
          toMigrate[key] = value;
          result[key] = value;
        }
      } catch (e) {}
    });
    const keys = Object.keys(toMigrate);
    if (!keys.length) return Promise.resolve(false);

    return new Promise((resolve) => {
      chrome.storage.local.set(toMigrate, () => {
        if (chrome.runtime.lastError) {
          this._report('旧配置迁移失败', chrome.runtime.lastError);
          resolve(false);
          return;
        }
        // 只有确认写入成功后，才删除旧 localStorage 数据。
        keys.forEach((key) => { try { localStorage.removeItem(key); } catch (e) {} });
        resolve(true);
      });
    });
  }
};

/* ============================================================
 *  Utils & Config Schema
 * ============================================================ */

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function createId(prefix) {
  let id = '';
  try {
    if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
      id = globalThis.crypto.randomUUID();
    }
  } catch (e) {}
  if (!id) id = Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 10);
  return prefix + '_' + id;
}

/** HTML 转义：拼接 innerHTML 时防注入。 */
function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}

/** 链接白名单：仅允许有效的 http/https 地址。 */
function sanitizeUrl(url) {
  if (typeof url !== 'string' || !url.trim()) return '';
  try {
    const parsed = new URL(url.trim());
    return parsed.protocol === 'http:' || parsed.protocol === 'https:' ? parsed.href : '';
  } catch (e) {
    return '';
  }
}

function normalizeUserUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const raw = value.trim();
  return sanitizeUrl(/^https?:\/\//i.test(raw) ? raw : 'https://' + raw);
}

function sanitizeImageSource(value, allowLocal = false) {
  if (typeof value !== 'string' || !value.trim()) return '';
  const url = value.trim();
  if (/^data:image\//i.test(url)) return url;
  if (allowLocal && url === 'pumpkin-8384698_960_720.jpg') return url;
  return sanitizeUrl(url);
}

function getPublicConfig(config) {
  return JSON.parse(JSON.stringify(config, (key, value) => key.startsWith('_') ? undefined : value));
}

function makeFallbackIcon(title) {
  const text = String(title || '?').trim();
  const char = Array.from(text)[0] || '?';
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48">' +
    '<rect width="48" height="48" rx="10" fill="#e5e7eb"/>' +
    '<text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#6b7280" font-size="20">' + char + '</text></svg>';
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function notify(message, type = 'info') {
  if (!document.body) return;
  let el = document.getElementById('app-notice');
  if (!el) {
    el = document.createElement('div');
    el.id = 'app-notice';
    el.className = 'app-notice';
    el.setAttribute('aria-live', 'polite');
    document.body.appendChild(el);
  }
  clearTimeout(el._hideTimer);
  el.textContent = message;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.className = 'app-notice show' + (type === 'error' ? ' error' : '');
  el._hideTimer = setTimeout(() => { el.classList.remove('show'); }, type === 'error' ? 5000 : 2600);
}

function normalizeConfig(input, strict = false) {
  const fail = (message) => { if (strict) throw new Error(message); };
  if (!isPlainObject(input)) {
    fail('配置根节点必须是对象');
    input = {};
  }
  const cfg = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  cfg.schemaVersion = CONFIG_SCHEMA_VERSION;

  if (input.backgroundImage !== undefined) {
    const value = sanitizeImageSource(input.backgroundImage, true);
    if (!value) fail('背景图片地址无效');
    else cfg.backgroundImage = value;
  }
  if (input.bingImage !== undefined) {
    if (input.bingImage === '') cfg.bingImage = '';
    else {
      const value = sanitizeImageSource(input.bingImage, true);
      if (!value) fail('Bing 壁纸地址无效');
      else cfg.bingImage = value;
    }
  }
  ['bgBlur', 'bingDaily'].forEach((key) => {
    if (input[key] !== undefined) {
      if (typeof input[key] !== 'boolean') fail(key + ' 必须是布尔值');
      else cfg[key] = input[key];
    }
  });
  if (input.theme !== undefined) {
    if (!['light', 'dark', 'auto'].includes(input.theme)) fail('主题值无效');
    else cfg.theme = input.theme;
  }
  if (input.customCSS !== undefined) {
    if (typeof input.customCSS !== 'string') fail('自定义 CSS 必须是字符串');
    else cfg.customCSS = input.customCSS;
  }
  cfg.bingDate = typeof input.bingDate === 'string' ? input.bingDate :
    (typeof input._bingDate === 'string' ? input._bingDate : '');
  cfg.sectionOrder = Array.isArray(input.sectionOrder) ? input.sectionOrder.filter(k => typeof k === 'string') : [];

  if (input.colors !== undefined) {
    if (!isPlainObject(input.colors)) fail('颜色配置无效');
    else {
      Object.keys(cfg.colors).forEach((key) => {
        const value = input.colors[key];
        if (value === undefined || value === '') return;
        if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) cfg.colors[key] = value;
        else fail('颜色值无效：' + key);
      });
    }
  }

  const readPx = (value, fallback, label, min, max) => {
    if (value === undefined) return fallback;
    const raw = typeof value === 'string' ? value.trim().replace(/px$/i, '') : value;
    const number = typeof raw === 'number' ? raw : (raw === '' ? NaN : Number(raw));
    if (!Number.isFinite(number)) {
      fail(label + ' 必须是有效的像素值');
      return fallback;
    }
    return Math.min(max, Math.max(min, number)) + 'px';
  };
  if (input.layout !== undefined && !isPlainObject(input.layout)) fail('布局配置无效');
  Object.keys(cfg.layout).forEach((key) => {
    const source = isPlainObject(input.layout) ? input.layout[key] : undefined;
    cfg.layout[key] = readPx(source, cfg.layout[key], '布局项 ' + key, 0, 1000);
  });

  if (input.effects !== undefined && !isPlainObject(input.effects)) fail('视觉效果配置无效');
  ['bgFrostOpacity', 'searchFrostOpacity', 'dropdownOpacity'].forEach((key) => {
    const value = isPlainObject(input.effects) ? input.effects[key] : undefined;
    if (value === undefined) return;
    const number = value === '' ? NaN : Number(value);
    if (!Number.isFinite(number)) fail('透明度无效：' + key);
    else cfg.effects[key] = Math.min(1, Math.max(0, number));
  });
  ['bgFrostBlur', 'searchFrostBlur'].forEach((key) => {
    const source = isPlainObject(input.effects) ? input.effects[key] : undefined;
    cfg.effects[key] = readPx(source, cfg.effects[key], '模糊半径 ' + key, 0, 60);
  });

  if (input.search !== undefined && !isPlainObject(input.search)) fail('搜索配置无效');
  if (isPlainObject(input.search) && input.search.placeholder !== undefined) {
    if (typeof input.search.placeholder !== 'string') fail('搜索提示文字无效');
    else cfg.search.placeholder = input.search.placeholder;
  }

  const engineIds = new Set();
  if (input.engines !== undefined) {
    if (!Array.isArray(input.engines)) fail('搜索引擎列表无效');
    else {
      const engines = [];
      input.engines.forEach((engine) => {
        if (!isPlainObject(engine)) { fail('搜索引擎条目无效'); return; }
        const name = typeof engine.name === 'string' ? engine.name.trim() : '';
        const base = sanitizeUrl(engine.base);
        if (!name || !base) { fail('搜索引擎「' + (name || '未命名') + '」的名称或地址无效'); return; }
        let id = typeof engine.id === 'string' && engine.id.trim() ? engine.id.trim() : createId('engine');
        while (engineIds.has(id)) id = createId('engine');
        engineIds.add(id);
        engines.push({ id, name, base });
      });
      if (engines.length) cfg.engines = engines;
      else fail('至少需要保留一个有效的搜索引擎');
    }
  }

  const requestedEngineId = isPlainObject(input.search) ? input.search.defaultEngineId : undefined;
  const requestedEngineName = isPlainObject(input.search) ? input.search.defaultEngine : undefined;
  const selectedEngine = cfg.engines.find(e => e.id === requestedEngineId) ||
    cfg.engines.find(e => e.name === requestedEngineName) || cfg.engines[0];
  cfg.search.defaultEngineId = selectedEngine.id;
  cfg.search.defaultEngine = selectedEngine.name;

  const sectionIds = new Set();
  const cardIds = new Set();
  if (input.sections !== undefined) {
    if (!Array.isArray(input.sections)) fail('导航分组列表无效');
    else {
      const sections = [];
      input.sections.forEach((section) => {
        if (!isPlainObject(section)) { fail('导航分组条目无效'); return; }
        const title = typeof section.title === 'string' ? section.title.trim() : '';
        if (!title) { fail('存在没有名称的导航分组'); return; }
        let id = typeof section.id === 'string' && section.id.trim() ? section.id.trim() : createId('section');
        while (sectionIds.has(id)) id = createId('section');
        sectionIds.add(id);
        const items = [];
        if (section.items !== undefined && !Array.isArray(section.items)) fail('分组「' + title + '」的卡片列表无效');
        (Array.isArray(section.items) ? section.items : []).forEach((item) => {
          if (!isPlainObject(item)) { fail('分组「' + title + '」中存在无效卡片'); return; }
          const cardTitle = typeof item.title === 'string' ? item.title.trim() : '';
          const url = sanitizeUrl(item.url);
          if (!cardTitle || !url) { fail('分组「' + title + '」中存在标题或链接无效的卡片'); return; }
          let cardId = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : createId('card');
          while (cardIds.has(cardId)) cardId = createId('card');
          cardIds.add(cardId);
          let domain = typeof item.domain === 'string' ? item.domain.trim() : '';
          if (!domain) {
            try { domain = new URL(url).hostname; } catch (e) {}
          }
          const logo = sanitizeImageSource(item.logo || '', false);
          const rawScale = Number(item.scale);
          items.push({
            id: cardId,
            title: cardTitle,
            url,
            domain,
            logo,
            scale: Number.isFinite(rawScale) ? Math.min(4, Math.max(0.25, rawScale)) : 1,
            style: item.style === 'text' ? 'text' : 'image'
          });
        });
        sections.push({ id, title, items });
      });
      cfg.sections = sections;
    }
  }

  return cfg;
}

/* ============================================================
 *  Theme
 * ============================================================ */

const Theme = {
  _mq: null,

  init() {
    this.apply(CONFIG.theme);
    if (this._mq) {
      if (this._mq.addEventListener) {
        this._mq.addEventListener('change', () => { if (CONFIG.theme === 'auto') this.apply('auto'); });
      } else if (this._mq.addListener) {
        this._mq.addListener(() => { if (CONFIG.theme === 'auto') this.apply('auto'); });
      }
    }
  },

  apply(theme) {
    if (!['light', 'dark', 'auto'].includes(theme)) theme = 'auto';
    if (!this._mq && window.matchMedia) this._mq = window.matchMedia('(prefers-color-scheme: dark)');
    const isDark = theme === 'dark' || (theme === 'auto' && this._mq && this._mq.matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    try { localStorage.setItem('lemon_newtab_theme', theme); } catch (e) {}
  },

  async set(theme) {
    CONFIG.theme = ['light', 'dark', 'auto'].includes(theme) ? theme : 'auto';
    this.apply(CONFIG.theme);
    return ConfigStore.save();
  }
};

/* ============================================================
 *  Clock
 * ============================================================ */

const Clock = {
  timerId: null,
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

  update() {
    const now = new Date();
    document.getElementById('clock').textContent = this.formatTime(now);
    const key = now.getFullYear() + '-' + (now.getMonth() + 1) + '-' + now.getDate();
    if (key !== this.currentDateKey) {
      document.getElementById('date-label').textContent = this.formatDate(now);
      this.currentDateKey = key;
    }
  },

  schedule() {
    const now = new Date();
    // 页面只显示到分钟，对齐到下一分钟更新，避免持续 requestAnimationFrame。
    const delay = Math.max(250, (60 - now.getSeconds()) * 1000 - now.getMilliseconds() + 30);
    this.timerId = setTimeout(() => {
      this.update();
      this.schedule();
    }, delay);
  },

  start() {
    this.stop();
    this.update();
    this.schedule();
  },

  stop() {
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  },

  init() {
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.stop();
      else this.start();
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
    this.refresh();
    this.bindEvents();
  },

  findCurrentEngine() {
    return CONFIG.engines.find(e => e.id === CONFIG.search.defaultEngineId) ||
      CONFIG.engines.find(e => e.name === CONFIG.search.defaultEngine) || CONFIG.engines[0];
  },

  refresh() {
    this.currentEngine = this.findCurrentEngine();
    this.renderDropdown();
    this.updatePlaceholder();
  },

  renderDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (!dropdown) return;
    dropdown.innerHTML = CONFIG.engines.map(engine =>
      '<button type="button" class="search-option" role="menuitemradio" aria-checked="' +
      (this.currentEngine && engine.id === this.currentEngine.id ? 'true' : 'false') +
      '" data-id="' + escapeHtml(engine.id) + '">' + escapeHtml(engine.name) + '</button>'
    ).join('');

    dropdown.querySelectorAll('.search-option').forEach(btn => {
      btn.addEventListener('click', async () => {
        const selected = CONFIG.engines.find(e => e.id === btn.dataset.id);
        if (!selected) return;
        this.currentEngine = selected;
        CONFIG.search.defaultEngineId = selected.id;
        CONFIG.search.defaultEngine = selected.name;
        this.updatePlaceholder();
        this.closeDropdown();
        await ConfigStore.save();
      });
    });
  },

  updatePlaceholder() {
    const input = document.getElementById('search-input');
    if (input && this.currentEngine) {
      input.placeholder = CONFIG.search.placeholder.replace('{engine}', this.currentEngine.name);
    }
    document.querySelectorAll('.search-option').forEach(btn => {
      btn.setAttribute('aria-checked', this.currentEngine && btn.dataset.id === this.currentEngine.id ? 'true' : 'false');
    });
  },

  openDropdown(focusCurrent = false) {
    const dropdown = document.getElementById('search-dropdown');
    const icon = document.getElementById('search-icon-btn');
    if (!dropdown) return;
    dropdown.classList.add('open');
    if (icon) icon.setAttribute('aria-expanded', 'true');
    if (focusCurrent) {
      const options = Array.from(dropdown.querySelectorAll('.search-option'));
      const current = options.find(btn => this.currentEngine && btn.dataset.id === this.currentEngine.id) || options[0];
      if (current) current.focus();
    }
  },

  toggleDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    if (dropdown && dropdown.classList.contains('open')) this.closeDropdown();
    else this.openDropdown();
  },

  closeDropdown() {
    const dropdown = document.getElementById('search-dropdown');
    const icon = document.getElementById('search-icon-btn');
    if (dropdown) dropdown.classList.remove('open');
    if (icon) icon.setAttribute('aria-expanded', 'false');
  },

  bindEvents() {
    const icon = document.getElementById('search-icon-btn');
    const input = document.getElementById('search-input');
    const dropdown = document.getElementById('search-dropdown');

    if (icon) icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });
    if (icon) icon.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this.openDropdown(true);
      }
    });

    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          this.openDropdown(true);
          return;
        }
        if (e.key !== 'Enter') return;
        const query = input.value.trim();
        if (!query) return;
        this.currentEngine = this.findCurrentEngine();
        if (!this.currentEngine) {
          notify('请先配置一个有效的搜索引擎', 'error');
          return;
        }
        window.open(this.currentEngine.base + encodeURIComponent(query), '_self');
      });
      input.addEventListener('focus', () => {
        if (CONFIG.engines.length > 1) this.openDropdown();
      });
    }

    if (dropdown) dropdown.addEventListener('keydown', (e) => {
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const options = Array.from(dropdown.querySelectorAll('.search-option'));
      if (!options.length) return;
      const current = options.indexOf(document.activeElement);
      let next = current;
      if (e.key === 'Home') next = 0;
      else if (e.key === 'End') next = options.length - 1;
      else if (e.key === 'ArrowDown') next = (current + 1 + options.length) % options.length;
      else next = (current - 1 + options.length) % options.length;
      options[next].focus();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && dropdown && dropdown.classList.contains('open')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        this.closeDropdown();
        if (input) input.focus();
      }
    });

    document.addEventListener('click', (e) => {
      if (dropdown && icon && !icon.contains(e.target) && !dropdown.contains(e.target)) this.closeDropdown();
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
        const safeUrl = sanitizeUrl(item.url);
        card.className = 'nav-card' + (isText ? ' nav-card-text' : '');
        if (safeUrl) {
          card.href = safeUrl;
          card.target = '_self';
          card.rel = 'noopener noreferrer';
        } else {
          card.classList.add('nav-card-disabled');
          card.setAttribute('aria-disabled', 'true');
          card.title = '链接无效，请在导航管理中编辑';
        }

        if (isText) {
          card.innerHTML = '<div class="text-wrap text-only"><span class="title">' + escapeHtml(item.title) + '</span><span class="url">' + escapeHtml(item.domain) + '</span></div>';
        } else {
          card.innerHTML = '<div class="logo-wrap"><img alt="" loading="lazy"></div><div class="text-wrap"><span class="title">' + escapeHtml(item.title) + '</span><span class="url">' + escapeHtml(item.domain) + '</span></div>';
          const img = card.querySelector('img');
          const scale = Math.min(4, Math.max(0.25, Number(item.scale) || 1));
          const fallback = makeFallbackIcon(item.title);
          img.style.transform = 'scale(' + scale + ')';
          img.referrerPolicy = 'no-referrer';
          img.addEventListener('error', () => {
            if (img.src !== fallback) img.src = fallback;
          }, { once: true });
          img.src = sanitizeImageSource(item.logo || '', false) || fallback;
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

  // 主面板板块定义（「关于」不在其中，永远垫底）
  SECTION_DEFS: [
    { key: 'appearance', label: '外观',     build: 'createSectionAppearance' },
    { key: 'layout',     label: '布局间距', build: 'createSectionLayout' },
    { key: 'effects',    label: '视觉效果', build: 'createSectionEffects' },
    { key: 'engines',    label: '搜索引擎', build: 'createSectionEngines' },
    { key: 'nav',        label: '导航管理', build: 'createSectionNavManager' },
    { key: 'data',       label: '数据管理', build: 'createSectionData' },
    { key: 'colors',     label: '颜色',     build: 'createSectionColors' },
    { key: 'advanced',   label: '高级',     build: 'createSectionAdvanced' },
  ],

  // 当前生效的板块顺序：优先用户自定义，未涵盖的板块按默认顺序补齐
  currentSectionOrder() {
    const known = this.SECTION_DEFS.map(d => d.key);
    const order = (Array.isArray(CONFIG.sectionOrder) ? CONFIG.sectionOrder : []).filter(k => known.indexOf(k) !== -1);
    known.forEach(k => { if (order.indexOf(k) === -1) order.push(k); });
    return order;
  },

  buildPanel() {
    const panelInner = document.getElementById('settings-panel-inner');
    if (!panelInner) return;
    panelInner.innerHTML = '';
    this.currentSectionOrder().forEach(k => {
      const def = this.SECTION_DEFS.find(d => d.key === k);
      this[def.build](panelInner);
    });
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
      input.addEventListener('input', () => {
        resetBtn.classList.add('is-custom');
        Colors.set(item.key, input.value, true);
      });
      input.addEventListener('change', () => ConfigStore.flush());
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
      '<span>高级设置</span>' +
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button>';
    container.appendChild(section);
    document.getElementById('advanced-css-entry').addEventListener('click', () => Advanced.open());
  },

  createSectionAppearance(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    const backgroundValue = CONFIG.backgroundImage.startsWith('data:') ? '' : CONFIG.backgroundImage;
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>外观</div>' +
      '<label class="settings-label" for="bg-url-input">背景图片</label>' +
      '<div class="settings-input-wrap"><input type="text" class="settings-input" id="bg-url-input" placeholder="输入图片 URL..." value="' + escapeHtml(backgroundValue) + '"><button type="button" class="settings-btn" id="bg-apply-btn">应用</button></div>' +
      '<div class="settings-file-wrap"><input type="file" id="bg-file-input" accept="image/*" style="display:none;"><button type="button" class="settings-btn settings-btn-full" id="bg-upload-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3V15"/></svg>上传本地图片</button></div>' +
      '<div class="settings-toggle-wrap"><span class="settings-toggle-label">背景毛玻璃</span><label class="settings-toggle"><input type="checkbox" id="bg-blur-toggle" aria-label="背景毛玻璃"' + (CONFIG.bgBlur ? ' checked' : '') + '><span class="settings-toggle-slider"></span></label></div>' +
      '<div class="settings-toggle-wrap"><span class="settings-toggle-label">Bing 每日壁纸</span><label class="settings-toggle"><input type="checkbox" id="bing-daily-toggle" aria-label="Bing 每日壁纸"' + (CONFIG.bingDaily ? ' checked' : '') + '><span class="settings-toggle-slider"></span></label></div>' +
      '<label class="settings-label" style="margin-top:12px;">主题</label>' +
      '<div class="settings-radio-group" id="theme-group">' +
      '<label class="settings-radio"><input type="radio" name="theme" value="light"' + (CONFIG.theme === 'light' ? ' checked' : '') + '><span>亮色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="dark"' + (CONFIG.theme === 'dark' ? ' checked' : '') + '><span>暗色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="auto"' + (CONFIG.theme === 'auto' ? ' checked' : '') + '><span>跟随系统</span></label>' +
      '</div>';
    container.appendChild(section);

    const bgInput = document.getElementById('bg-url-input');
    const applyBtn = document.getElementById('bg-apply-btn');
    const applyBgUrl = async () => {
      const raw = bgInput.value.trim() || DEFAULT_CONFIG.backgroundImage;
      let url = raw;
      if (raw !== DEFAULT_CONFIG.backgroundImage && !/^data:image\//i.test(raw)) url = normalizeUserUrl(raw);
      if (!sanitizeImageSource(url, true)) {
        notify('请输入有效的图片 URL', 'error');
        return;
      }
      applyBtn.disabled = true;
      applyBtn.textContent = '加载中…';
      try {
        await loadImage(url);
        const ok = await Background.setUserImage(url);
        if (ok) {
          bgInput.value = url.startsWith('data:') ? '' : url;
          notify(CONFIG.bingDaily ? '背景已保存，关闭 Bing 每日壁纸后启用' : '背景已更新');
        }
      } catch (e) {
        notify('背景应用失败：' + e.message, 'error');
      } finally {
        applyBtn.disabled = false;
        applyBtn.textContent = '应用';
      }
    };
    applyBtn.addEventListener('click', applyBgUrl);
    bgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBgUrl(); });

    const fileInput = document.getElementById('bg-file-input');
    const uploadBtn = document.getElementById('bg-upload-btn');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (!file.type.startsWith('image/')) {
        notify('请选择图片文件', 'error');
        fileInput.value = '';
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        notify('图片过大，请选择小于 5MB 的文件', 'error');
        fileInput.value = '';
        return;
      }
      uploadBtn.disabled = true;
      try {
        const dataUrl = await prepareLocalImage(file);
        const ok = await Background.setUserImage(dataUrl);
        if (ok) {
          bgInput.value = '';
          notify(CONFIG.bingDaily ? '本地背景已保存，关闭 Bing 每日壁纸后启用' : '本地背景已更新');
        }
      } catch (err) {
        notify('图片处理失败：' + err.message, 'error');
      } finally {
        uploadBtn.disabled = false;
        fileInput.value = '';
      }
    });

    const syncBgOpacityState = () => {
      const wrap = document.getElementById('bg-opacity-wrap');
      if (!wrap) return;
      wrap.style.opacity = CONFIG.bgBlur ? '1' : '0.35';
      const slider = wrap.querySelector('input');
      if (slider) slider.disabled = !CONFIG.bgBlur;
    };
    document.getElementById('bg-blur-toggle').addEventListener('change', async (e) => {
      CONFIG.bgBlur = e.target.checked;
      document.body.classList.toggle('no-bg-blur', !CONFIG.bgBlur);
      syncBgOpacityState();
      await ConfigStore.save();
    });

    document.getElementById('bing-daily-toggle').addEventListener('change', async (e) => {
      const toggle = e.target;
      if (toggle.checked) {
        const previous = { daily: CONFIG.bingDaily, image: CONFIG.bingImage, date: CONFIG.bingDate };
        toggle.disabled = true;
        try {
          const granted = await BingWallpaper.requestPermission();
          if (granted === false) throw new Error('需要允许访问 bing.com 才能获取每日壁纸');
          CONFIG.bingDaily = true;
          const ok = await BingWallpaper.enable();
          if (!ok) throw new Error('壁纸配置保存失败');
          notify('Bing 每日壁纸已开启');
        } catch (err) {
          CONFIG.bingDaily = previous.daily;
          CONFIG.bingImage = previous.image;
          CONFIG.bingDate = previous.date;
          toggle.checked = previous.daily;
          Background.applyActive();
          await ConfigStore.save();
          notify('开启失败：' + err.message, 'error');
        } finally {
          toggle.disabled = false;
        }
      } else {
        toggle.disabled = true;
        CONFIG.bingDaily = false;
        await ConfigStore.clearBgCache();
        Background.applyActive();
        const ok = await ConfigStore.save();
        if (ok && CONFIG.backgroundImage && !CONFIG.backgroundImage.startsWith('data:')) {
          setTimeout(() => cacheUrlToBase64(CONFIG.backgroundImage), 0);
        }
        toggle.disabled = false;
        if (ok) notify('已恢复你的背景');
      }
    });

    section.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => Theme.set(e.target.value));
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
      slider.addEventListener('change', () => ConfigStore.flush());
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
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueLabel.textContent = Math.round(val * 100) + '%';
        CONFIG.effects[item.key] = val;
        document.documentElement.style.setProperty(item.cssVar, String(val));
        ConfigStore.saveDebounced();
      });
      slider.addEventListener('change', () => ConfigStore.flush());
    });

    // 初始化背景遮罩不透明度滑块的锁定状态
    const bgOpacityWrap = document.getElementById('bg-opacity-wrap');
    if (bgOpacityWrap && !CONFIG.bgBlur) {
      bgOpacityWrap.style.opacity = '0.35';
      const slider = bgOpacityWrap.querySelector('input');
      if (slider) slider.disabled = true;
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

    document.getElementById('engine-save-btn').addEventListener('click', async () => {
      const name = document.getElementById('engine-name').value.trim();
      const base = document.getElementById('engine-base').value.trim();
      if (!name || !base) {
        notify('请填写搜索引擎名称和地址', 'error');
        return;
      }
      const ok = await App.addEngine({ name, base });
      if (!ok) return;
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
        if (CONFIG.search.defaultEngineId === removed.id || CONFIG.search.defaultEngine === removed.name) {
          CONFIG.search.defaultEngineId = CONFIG.engines[0].id;
          CONFIG.search.defaultEngine = CONFIG.engines[0].name;
        }
        Search.refresh();
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
      const ok = await App.addSection({ title, items: [] });
      if (!ok) return;
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
          App.removeSection(CONFIG.sections[sIdx].id);
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

        const ok = await App.editCard(sIdx, cIdx, {
          title,
          url: finalUrl,
          domain,
          logo: logo || '',
          scale: 1,
          style
        });
        if (!ok) return;

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
      btn.addEventListener('click', async (e) => {
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

        const ok = await App.addCard(CONFIG.sections[sIdx].id, {
          title,
          url: finalUrl,
          domain,
          logo: logo || '',
          scale: 1,
          style
        });
        if (!ok) return;

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
      setTimeout(() => URL.revokeObjectURL(url), 0);
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
          Advanced.dirty = false;
          notify('配置导入成功');
        } catch (err) {
          notify('配置导入失败：' + err.message, 'error');
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', async () => {
      if (confirm('确定要恢复默认设置吗？所有自定义配置将丢失。')) {
        const ok = await ConfigStore.reset();
        if (ok) location.reload();
      }
    });
  },

  createSectionAbout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>关于</div><div class="settings-about"><div class="settings-about-name">lemon\'s NewTab</div><div class="settings-about-version">v0.8.2</div><div class="settings-about-desc">一个简洁、可自定义的新标签页插件</div></div>';
    container.appendChild(section);
  },

  _activePanel() {
    return Advanced.isOpen ? document.getElementById('settings-advanced-panel') : document.getElementById('settings-panel');
  },

  _trapFocus(e) {
    const panel = this._activePanel();
    if (!panel) return;
    const focusable = Array.from(panel.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'))
      .filter(el => !el.closest('[inert]') && el.getClientRects().length > 0);
    if (!focusable.length) {
      e.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!panel.contains(document.activeElement)) {
      e.preventDefault();
      first.focus();
    } else if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  },

  bindEvents() {
    const trigger = document.getElementById('settings-trigger');
    trigger.addEventListener('click', () => this.open());
    document.getElementById('settings-close').addEventListener('click', () => this.close());
    document.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Tab') {
        this._trapFocus(e);
        return;
      }
      if (e.key === 'Escape') {
        if (e.target && e.target.id === 'custom-css-input') { e.target.blur(); return; }
        if (Advanced.isOpen) { Advanced.close(); return; }
        this.close();
      }
    });
  },

  open() {
    if (this.isOpen) return;
    this.previousFocus = document.activeElement;
    this.isOpen = true;
    Search.closeDropdown();
    const panel = document.getElementById('settings-panel');
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    document.querySelector('.page').inert = true;
    document.querySelector('.settings-trigger-wrap').inert = true;
    document.documentElement.classList.add('settings-locked');
    document.body.classList.add('settings-locked', 'settings-panel-open');
    panel.classList.add('open');
    document.getElementById('settings-overlay').classList.add('open');
    requestAnimationFrame(() => document.getElementById('settings-close').focus({ preventScroll: true }));
  },

  close() {
    if (!this.isOpen) return;
    this.isOpen = false;
    Advanced.close();
    ConfigStore.flush();
    const panel = document.getElementById('settings-panel');
    panel.classList.remove('open');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    document.querySelector('.page').inert = false;
    document.querySelector('.settings-trigger-wrap').inert = false;
    document.documentElement.classList.remove('settings-locked');
    document.body.classList.remove('settings-locked', 'settings-panel-open');
    document.getElementById('settings-overlay').classList.remove('open');
    const target = this.previousFocus && this.previousFocus.isConnected ? this.previousFocus : document.getElementById('settings-trigger');
    if (target) {
      try { target.focus({ preventScroll: true }); } catch (e) {}
    }
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

  async set(key, val, debounce = false) {
    if (!CONFIG.colors) CONFIG.colors = {};
    CONFIG.colors[key] = val;
    this.apply();
    if (debounce) {
      ConfigStore.saveDebounced();
      return true;
    }
    return ConfigStore.save();
  },

  async resetAll() {
    CONFIG.colors = {};
    this.apply();
    return ConfigStore.save();
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
    return ConfigStore.save();
  }
};

/* ============================================================
 *  Advanced（高级：二级设置面板）
 * ============================================================ */

const Advanced = {
  isOpen: false,
  dirty: false,

  init() {
    this.buildSubpanel();
  },

  buildSubpanel() {
    const panel = document.createElement('aside');
    panel.id = 'settings-advanced-panel';
    panel.className = 'settings-panel settings-subpanel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', '高级设置');
    panel.setAttribute('aria-hidden', 'true');
    panel.inert = true;
    panel.innerHTML =
      '<div class="settings-panel-inner">' +
        '<div class="settings-subpanel-header">' +
          '<button type="button" class="settings-subpanel-back" id="advanced-back-btn" aria-label="返回">' +
          '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg></button>' +
          '<span class="settings-subpanel-title">高级</span>' +
        '</div>' +
        '<div class="settings-label" style="margin-top:4px;">板块排列</div>' +
        '<div class="settings-engine-list settings-order-list" id="section-order-list"></div>' +
        '<p class="settings-subpanel-hint" style="margin:6px 0 0;">拖动调整主面板各板块的排列顺序，「关于」固定在最底部。</p>' +
        '<div class="settings-label" style="margin-top:16px;">自定义 CSS</div>' +
        '<textarea class="settings-input settings-css-editor" id="custom-css-input" spellcheck="false" placeholder="/* 在这里输入自定义 CSS，例如：&#10;#clock { letter-spacing: 4px; }&#10;.nav-card { backdrop-filter: blur(8px); } */"></textarea>' +
        '<div class="settings-input-wrap">' +
          '<button type="button" class="settings-btn" id="custom-css-apply">应用并保存</button>' +
          '<button type="button" class="settings-btn settings-btn-secondary" id="custom-css-clear">清空</button>' +
        '</div>' +
        '<p class="settings-subpanel-hint">CSS 会注入到页面 &lt;head&gt; 末尾，同优先级下覆盖默认样式。填写错误可能导致显示异常，清空后重新应用即可恢复。</p>' +
      '</div>';
    document.body.appendChild(panel);
    this.renderSectionOrder();

    const input = document.getElementById('custom-css-input');
    input.value = CONFIG.customCSS || '';
    input.setAttribute('aria-label', '自定义 CSS');
    input.addEventListener('input', () => { this.dirty = input.value !== (CONFIG.customCSS || ''); });

    document.getElementById('advanced-back-btn').addEventListener('click', () => this.close());

    document.getElementById('custom-css-apply').addEventListener('click', async (e) => {
      const ok = await CustomCSS.set(input.value);
      const btn = e.currentTarget;
      this.dirty = !ok && input.value !== (CONFIG.customCSS || '');
      if (ok) this.dirty = false;
      btn.textContent = ok ? '已应用 ✓' : '保存失败';
      setTimeout(() => { btn.textContent = '应用并保存'; }, 1200);
    });

    document.getElementById('custom-css-clear').addEventListener('click', async () => {
      if (!input.value) return;
      input.value = '';
      const ok = await CustomCSS.set('');
      if (ok) this.dirty = false;
    });
  },

  /* ---------- 板块排列（拖拽排序） ---------- */

  renderSectionOrder() {
    const list = document.getElementById('section-order-list');
    if (!list) return;
    const order = Settings.currentSectionOrder();
    list.innerHTML = order.map((k, i) => {
      const def = Settings.SECTION_DEFS.find(d => d.key === k);
      return '<div class="settings-engine-item" data-idx="' + i + '" data-key="' + k + '">' +
        '<span class="settings-engine-name">' + def.label + '</span></div>';
    }).join('');
    this._initOrderDragAndDrop(list);
  },

  _initOrderDragAndDrop(listContainer) {
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
        e.preventDefault();
        if (!draggedItem || draggedItem === item) return;
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
        clearHighlights();
        self._moveSection(draggedIdx, targetIdx, after);
      });
    });
  },

  async _moveSection(fromIdx, toIdx, after) {
    if (fromIdx === toIdx) return;
    const order = Settings.currentSectionOrder();
    if (fromIdx < 0 || fromIdx >= order.length) return;

    const moved = order.splice(fromIdx, 1)[0];
    let insertIdx = toIdx;
    if (toIdx > fromIdx) insertIdx = toIdx - 1;
    if (after) insertIdx += 1;
    insertIdx = Math.max(0, Math.min(insertIdx, order.length));
    order.splice(insertIdx, 0, moved);

    CONFIG.sectionOrder = order;
    await ConfigStore.save();
    Settings.buildPanel();      // 主面板实时应用新顺序
    this.renderSectionOrder();  // 重渲染列表（更新 data-idx）
  },

  open() {
    this.isOpen = true;
    this.renderSectionOrder();
    const panel = document.getElementById('settings-advanced-panel');
    const mainPanel = document.getElementById('settings-panel');
    mainPanel.inert = true;
    panel.inert = false;
    panel.setAttribute('aria-hidden', 'false');
    panel.classList.add('open');
    const input = document.getElementById('custom-css-input');
    if (!this.dirty) input.value = CONFIG.customCSS || '';
    requestAnimationFrame(() => document.getElementById('advanced-back-btn').focus({ preventScroll: true }));
  },

  close() {
    const wasOpen = this.isOpen;
    this.isOpen = false;
    const panel = document.getElementById('settings-advanced-panel');
    if (panel) {
      panel.classList.remove('open');
      panel.setAttribute('aria-hidden', 'true');
      panel.inert = true;
    }
    if (wasOpen && Settings.isOpen) {
      const mainPanel = document.getElementById('settings-panel');
      mainPanel.inert = false;
      const entry = document.getElementById('advanced-css-entry');
      if (entry) entry.focus({ preventScroll: true });
    }
  }

};

/* ============================================================
 *  Background & Image Helpers
 * ============================================================ */

const Background = {
  LOCAL_BG: 'pumpkin-8384698_960_720.jpg',
  _requestId: 0,

  activeUrl() {
    return (CONFIG.bingDaily && CONFIG.bingImage) ? CONFIG.bingImage : CONFIG.backgroundImage;
  },

  cssValue(url) {
    return 'url(' + JSON.stringify(url) + ')';
  },

  show(url) {
    this._requestId += 1;
    document.body.style.setProperty('--bg-image', this.cssValue(url || this.LOCAL_BG));
  },

  applyActive() {
    this.show(this.activeUrl());
  },

  init() {
    let urlBg = sanitizeImageSource(this.activeUrl(), true) || this.LOCAL_BG;
    const cachedBase64 = CONFIG._bgBase64;
    const cachedUrl = CONFIG._bgCachedUrl;
    const isDefaultUrl = urlBg === this.LOCAL_BG || urlBg.indexOf('pumpkin-8384698') !== -1;

    if (urlBg.startsWith('data:')) {
      this.show(urlBg);
    } else if (cachedBase64 && cachedUrl === urlBg) {
      this.show(cachedBase64);
    } else if (isDefaultUrl) {
      this.show(this.LOCAL_BG);
    } else {
      this.show(this.LOCAL_BG);
      const requestId = this._requestId;
      const img = new Image();
      img.onload = () => {
        if (this._requestId === requestId && this.activeUrl() === urlBg) this.show(urlBg);
      };
      img.onerror = () => console.warn('Background load failed:', urlBg);
      img.src = urlBg;
      cacheUrlToBase64(urlBg);
    }
  },

  async setUserImage(url) {
    const safe = sanitizeImageSource(url, true);
    if (!safe) throw new Error('请输入有效的图片 URL');
    const changed = safe !== CONFIG.backgroundImage;
    CONFIG.backgroundImage = safe;
    if (changed) await ConfigStore.clearBgCache();
    this.applyActive();
    const ok = await ConfigStore.save();
    if (ok && !CONFIG.bingDaily && !safe.startsWith('data:')) {
      setTimeout(() => cacheUrlToBase64(safe), 0);
    }
    return ok;
  }
};

function loadImage(src, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      callback(value);
    };
    const timer = setTimeout(() => finish(reject, new Error('图片加载超时')), timeout);
    img.onload = () => finish(resolve, img);
    img.onerror = () => finish(reject, new Error('图片无法加载'));
    img.src = src;
  });
}

function imageToDataUrl(img, maxEdge = 1920, quality = 0.86) {
  const naturalWidth = img.naturalWidth;
  const naturalHeight = img.naturalHeight;
  if (!naturalWidth || !naturalHeight) throw new Error('图片尺寸无效');
  const scale = Math.min(1, maxEdge / Math.max(naturalWidth, naturalHeight));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(naturalHeight * scale));
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/webp', quality);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsDataURL(file);
  });
}

async function prepareLocalImage(file) {
  const source = await readFileAsDataUrl(file);
  const img = await loadImage(source);
  // 限制超长边，避免原图 Base64 占满扩展存储。
  return imageToDataUrl(img, 2560, 0.9);
}

function cacheUrlToBase64(url) {
  if (!url || url.startsWith('data:') || url.indexOf('pumpkin-8384698') !== -1) return;
  if (_bgCacheAttempted.has(url)) return;
  _bgCacheAttempted.add(url);

  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.onload = function() {
    try {
      const dataUrl = imageToDataUrl(img, 1920, 0.86);
      ConfigStore.saveBgBase64(url, dataUrl);
    } catch (e) {
      console.warn('Base64 cache failed:', e);
    }
  };
  img.onerror = function() {
    // 无 CORS 的远程图片仍可直接显示，只是不生成离线缓存。
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

  async fetchTodayUrl() {
    const resp = await fetch(this.API);
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const data = await resp.json();
    const img = data && data.images && data.images[0];
    const base = img && (img.urlbase || (img.url || '').replace(/_\d+x\d+\.jpg.*$/, ''));
    if (!base) throw new Error('接口返回格式异常');
    const url = sanitizeUrl('https://www.bing.com' + base + this.RES);
    if (!url) throw new Error('壁纸地址无效');
    return url;
  },

  async applyUrl(url) {
    const safe = sanitizeUrl(url);
    if (!safe) throw new Error('壁纸地址无效');
    CONFIG.bingImage = safe;
    CONFIG.bingDate = this._today();
    await ConfigStore.clearBgCache();
    Background.show(safe);
    const ok = await ConfigStore.save();
    if (ok) setTimeout(() => cacheUrlToBase64(safe), 0);
    return ok;
  },

  async enable() {
    const url = await this.fetchTodayUrl();
    return this.applyUrl(url);
  },

  async maybeUpdate() {
    if (!CONFIG.bingDaily || CONFIG.bingDate === this._today()) return;
    const granted = await this.hasPermission();
    if (granted === false) {
      console.warn('Bing 每日壁纸：未授权访问 bing.com，跳过更新');
      return;
    }
    try {
      const url = await this.fetchTodayUrl();
      if (url !== CONFIG.bingImage) {
        await this.applyUrl(url);
      } else {
        CONFIG.bingDate = this._today();
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
  _findSection(ref) {
    return CONFIG.sections.find(s => s.id === ref) || CONFIG.sections.find(s => s.title === ref);
  },

  async addEngine(engine) {
    const name = engine && typeof engine.name === 'string' ? engine.name.trim() : '';
    const base = normalizeUserUrl(engine && engine.base);
    if (!name || !base) {
      notify('请输入有效的搜索引擎名称和地址', 'error');
      return false;
    }
    if (CONFIG.engines.some(e => e.name.toLowerCase() === name.toLowerCase())) {
      notify('同名搜索引擎已存在', 'error');
      return false;
    }
    CONFIG.engines.push({ id: createId('engine'), name, base });
    Search.renderDropdown();
    return ConfigStore.save();
  },

  async addSection(section) {
    try {
      const normalized = normalizeConfig({ sections: [section] }, true).sections[0];
      CONFIG.sections.push(normalized);
      Renderer.renderSections();
      return ConfigStore.save();
    } catch (e) {
      notify(e.message, 'error');
      return false;
    }
  },

  async addCard(sectionRef, card) {
    const section = this._findSection(sectionRef);
    if (!section) return false;
    try {
      const normalized = normalizeConfig({ sections: [{ title: '临时分组', items: [card] }] }, true).sections[0].items[0];
      section.items.push(normalized);
      Renderer.renderSections();
      return ConfigStore.save();
    } catch (e) {
      notify(e.message, 'error');
      return false;
    }
  },

  async editCard(sectionIdx, cardIdx, card) {
    const section = CONFIG.sections[sectionIdx];
    if (!section || !section.items[cardIdx]) return false;
    try {
      const normalized = normalizeConfig({ sections: [{ title: '临时分组', items: [card] }] }, true).sections[0].items[0];
      normalized.id = section.items[cardIdx].id;
      section.items[cardIdx] = normalized;
      Renderer.renderSections();
      return ConfigStore.save();
    } catch (e) {
      notify(e.message, 'error');
      return false;
    }
  },

  async removeSection(ref) {
    const section = this._findSection(ref);
    if (!section) return false;
    CONFIG.sections = CONFIG.sections.filter(s => s !== section);
    Renderer.renderSections();
    return ConfigStore.save();
  },

  setTheme(themeName) {
    return Theme.set(themeName);
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
    root.style.setProperty('--bg-frost-blur', E.bgFrostBlur);
    root.style.setProperty('--search-frost-blur', E.searchFrostBlur);
  },

  updateLayout(key, value) {
    if (CONFIG.layout[key] === undefined) return;
    CONFIG.layout[key] = value;
    this.syncLayout();
    ConfigStore.saveDebounced();
  },

  exportConfig() {
    return JSON.stringify(getPublicConfig(CONFIG), null, 2);
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

    CONFIG.sections = normalizeConfig({ sections: CONFIG.sections }, false).sections;
    Renderer.renderSections();
    return ConfigStore.save();
  },

  applyCurrentConfig() {
    this.syncLayout();
    this.syncEffects();
    CustomCSS.apply(CONFIG.customCSS || '');
    Colors.apply();
    Theme.apply(CONFIG.theme);
    Search.refresh();
    Renderer.renderSections();
    document.body.classList.toggle('no-bg-blur', !CONFIG.bgBlur);
    Background.init();
    if (Settings.isOpen) Settings.buildPanel();
  },

  async importConfig(json) {
    const data = JSON.parse(json);
    // 先完整校验候选配置，验证通过前不修改运行中的 CONFIG。
    const candidate = normalizeConfig(data, true);
    const previous = CONFIG;
    CONFIG = candidate;
    try {
      await ConfigStore.clearBgCache();
      this.applyCurrentConfig();
      const ok = await ConfigStore.save();
      if (!ok) throw new Error('配置无法写入存储');
      return true;
    } catch (e) {
      CONFIG = previous;
      this.applyCurrentConfig();
      throw e;
    }
  },

  async toggleCardStyle(sectionRef, cardRef) {
    const section = this._findSection(sectionRef);
    if (!section) return false;
    const card = section.items.find(i => i.id === cardRef) || section.items.find(i => i.title === cardRef);
    if (!card) return false;
    card.style = card.style === 'text' ? 'image' : 'text';
    Renderer.renderSections();
    return ConfigStore.save();
  },

  async setCardStyle(sectionRef, cardRef, style) {
    const section = this._findSection(sectionRef);
    if (!section) return false;
    const card = section.items.find(i => i.id === cardRef) || section.items.find(i => i.title === cardRef);
    if (!card) return false;
    card.style = style === 'text' ? 'text' : 'image';
    Renderer.renderSections();
    return ConfigStore.save();
  },

  async setSectionStyle(sectionRef, style) {
    const section = this._findSection(sectionRef);
    if (!section) return false;
    section.items.forEach(item => { item.style = style === 'text' ? 'text' : 'image'; });
    Renderer.renderSections();
    return ConfigStore.save();
  },

  async init() {
    const needsSave = await ConfigStore.load();
    let legacyBingMigrated = false;
    if (CONFIG.bingDaily && !CONFIG.bingImage && CONFIG.backgroundImage.indexOf('bing.com') !== -1) {
      CONFIG.bingImage = CONFIG.backgroundImage;
      CONFIG.backgroundImage = DEFAULT_CONFIG.backgroundImage;
      legacyBingMigrated = true;
    }

    this.syncLayout();
    this.syncEffects();
    CustomCSS.apply(CONFIG.customCSS || '');
    Colors.apply();
    Background.init();
    document.body.classList.toggle('no-bg-blur', !CONFIG.bgBlur);
    Theme.init();
    Clock.init();
    Search.init();
    Renderer.init();
    Settings.init();
    Advanced.init();
    Shortcuts.init();

    document.addEventListener('dragstart', () => document.body.classList.add('sort-dragging'), true);
    document.addEventListener('dragend', () => document.body.classList.remove('sort-dragging'), true);
    document.addEventListener('drop', () => document.body.classList.remove('sort-dragging'), true);

    // 仅在旧配置迁移或结构升级时写入，普通新标签页启动不再全量保存。
    if (needsSave || legacyBingMigrated) await ConfigStore.save();
    BingWallpaper.maybeUpdate().catch(e => console.warn('Bing 每日壁纸检查失败:', e));
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(e => {
    console.error('App initialization failed:', e);
    notify('页面初始化失败，请检查控制台或恢复默认配置', 'error');
  });
});
