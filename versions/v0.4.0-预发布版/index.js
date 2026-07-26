/* ============================================================
 *  新标签页 - 配置区
 * ============================================================ */

const DEFAULT_CONFIG = {
  backgroundImage: 'https://cdn.pixabay.com/photo/2023/11/13/07/18/pumpkin-8384698_960_720.jpg',
  bgBlur: true,
  theme: 'auto',

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

  load() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        CONFIG = this.deepMerge(JSON.parse(JSON.stringify(DEFAULT_CONFIG)), parsed);
      }
      const bgUrl = localStorage.getItem(this.BG_STORAGE_KEY);
      if (bgUrl) {
        CONFIG.backgroundImage = bgUrl;
      }
    } catch (e) {
      console.warn('Config load failed:', e);
    }
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(CONFIG));
    } catch (e) {
      console.error('Config save failed:', e);
    }
  },

  saveBgUrl(url) {
    try {
      localStorage.setItem(this.BG_STORAGE_KEY, url);
    } catch (e) {
      console.error('BG save failed:', e);
    }
  },

  reset() {
    CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
    localStorage.removeItem(this.BG_STORAGE_KEY);
    this.save();
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
  },

  set(theme) {
    CONFIG.theme = theme;
    this.apply(theme);
    ConfigStore.save();
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
      '<button type="button" class="search-option" data-name="' + engine.name + '">' + engine.name + '</button>'
    ).join('');

    dropdown.querySelectorAll('.search-option').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentEngine = CONFIG.engines.find(e => e.name === btn.dataset.name);
        CONFIG.search.defaultEngine = this.currentEngine.name;
        this.updatePlaceholder();
        this.closeDropdown();
        ConfigStore.save();
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
      sectionEl.innerHTML = '<h2>' + section.title + '</h2>';
      frag.appendChild(sectionEl);

      const listEl = document.createElement('div');
      listEl.className = 'nav-list';

      section.items.forEach(item => {
        const card = document.createElement('a');
        const isText = item.style === 'text';
        card.className = 'nav-card' + (isText ? ' nav-card-text' : '');
        card.href = item.url;
        card.target = '_self';
        card.rel = 'noopener noreferrer';

        if (isText) {
          card.innerHTML = '<div class="text-wrap text-only"><span class="title">' + item.title + '</span><span class="url">' + item.domain + '</span></div>';
        } else {
          card.innerHTML = '<div class="logo-wrap"><img src="' + item.logo + '" alt="" loading="lazy" style="transform: scale(' + (item.scale || 1) + ');" onerror="this.src=\'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239b9b9b%22 font-size=%2220%22%3E' + item.title.charAt(0) + '%3C/text%3E%3C/svg%3E\'"></div><div class="text-wrap"><span class="title">' + item.title + '</span><span class="url">' + item.domain + '</span></div>';
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
    this.createSectionAbout(panelInner);
  },

  createSectionAppearance(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>外观</div>' +
      '<label class="settings-label">背景图片</label>' +
      '<div class="settings-input-wrap"><input type="text" class="settings-input" id="bg-url-input" placeholder="输入图片 URL..." value="' + (CONFIG.backgroundImage.startsWith('data:') ? '' : CONFIG.backgroundImage) + '"><button type="button" class="settings-btn" id="bg-apply-btn">应用</button></div>' +
      '<div class="settings-file-wrap"><input type="file" id="bg-file-input" accept="image/*" style="display:none;"><button type="button" class="settings-btn settings-btn-full" id="bg-upload-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>上传本地图片</button></div>' +
      '<div class="settings-toggle-wrap"><span class="settings-toggle-label">背景毛玻璃</span><label class="settings-toggle"><input type="checkbox" id="bg-blur-toggle"' + (CONFIG.bgBlur ? ' checked' : '') + '><span class="settings-toggle-slider"></span></label></div>' +
      '<label class="settings-label" style="margin-top:12px;">主题</label>' +
      '<div class="settings-radio-group" id="theme-group">' +
      '<label class="settings-radio"><input type="radio" name="theme" value="light"' + (CONFIG.theme === 'light' ? ' checked' : '') + '><span>亮色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="dark"' + (CONFIG.theme === 'dark' ? ' checked' : '') + '><span>暗色</span></label>' +
      '<label class="settings-radio"><input type="radio" name="theme" value="auto"' + (CONFIG.theme === 'auto' ? ' checked' : '') + '><span>跟随系统</span></label>' +
      '</div>';
    container.appendChild(section);

    const bgInput = document.getElementById('bg-url-input');
    const applyBgUrl = () => {
      let url = bgInput.value.trim();
      if (!url) {
        url = DEFAULT_CONFIG.backgroundImage;
        bgInput.value = url;
      }
      CONFIG.backgroundImage = url;
      document.body.style.setProperty('--bg-image', 'url("' + url + '")');
      ConfigStore.saveBgUrl(url);
      ConfigStore.save();
    };
    document.getElementById('bg-apply-btn').addEventListener('click', applyBgUrl);
    bgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBgUrl(); });

    const fileInput = document.getElementById('bg-file-input');
    const uploadBtn = document.getElementById('bg-upload-btn');
    uploadBtn.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      if (file.size > 5 * 1024 * 1024) {
        alert('图片过大，请选择小于 5MB 的文件');
        fileInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        CONFIG.backgroundImage = dataUrl;
        document.body.style.setProperty('--bg-image', 'url("' + dataUrl + '")');
        ConfigStore.saveBgUrl(dataUrl);
        bgInput.value = '';
      };
      reader.readAsDataURL(file);
    });

    document.getElementById('bg-blur-toggle').addEventListener('change', (e) => {
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
      ConfigStore.save();
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
      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueLabel.textContent = Math.round(val * 100) + '%';
        CONFIG.effects[item.key] = val;
        document.documentElement.style.setProperty(item.cssVar, String(val));
        ConfigStore.save();
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
      let html = '<div class="settings-engine-item"><span class="settings-engine-name">' + engine.name + '</span><span class="settings-engine-url">' + engine.base + '</span>';
      if (CONFIG.engines.length > 1) {
        html += '<button type="button" class="settings-engine-delete" data-idx="' + idx + '" title="删除">×</button>';
      }
      html += '</div>';
      return html;
    }).join('');

    list.querySelectorAll('.settings-engine-delete').forEach(btn => {
      btn.addEventListener('click', (e) => {
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
        ConfigStore.save();
        this.renderEngineList();
      });
    });
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
      '<button type="button" class="settings-btn settings-btn-full" id="section-add-btn">+ 添加分组</button>';

    this.renderNavSections();

    document.getElementById('section-add-btn').addEventListener('click', () => {
      document.getElementById('section-add-form').style.display = 'flex';
      document.getElementById('section-title-input').focus();
    });

    document.getElementById('section-cancel-btn').addEventListener('click', () => {
      document.getElementById('section-add-form').style.display = 'none';
      document.getElementById('section-title-input').value = '';
    });

    document.getElementById('section-save-btn').addEventListener('click', () => {
      const title = document.getElementById('section-title-input').value.trim();
      if (!title) return;
      App.addSection({ title, items: [] });
      document.getElementById('section-add-form').style.display = 'none';
      document.getElementById('section-title-input').value = '';
      this.renderNavManager();
    });
  },

  renderNavSections() {
    const list = document.getElementById('nav-sections-list');
    if (!list) return;

    list.innerHTML = CONFIG.sections.map((section, sIdx) => {
      let html = '<div class="settings-nav-manager-section"><div class="settings-nav-manager-header"><span class="settings-nav-manager-title">' + section.title + '</span><div class="settings-nav-manager-actions">' +
        '<button type="button" class="settings-nav-manager-action" data-action="add-card" data-section="' + sIdx + '" title="添加卡片">+</button>' +
        '<button type="button" class="settings-nav-manager-action" data-action="delete-section" data-section="' + sIdx + '" title="删除分组">×</button>' +
        '</div></div><div class="settings-nav-manager-cards">';
      section.items.forEach((item, cIdx) => {
        html += '<div class="settings-nav-manager-card"><div class="settings-nav-manager-card-info"><span class="settings-nav-manager-card-title">' + item.title + '</span><span class="settings-nav-manager-card-url">' + item.domain + '</span></div>' +
          '<button type="button" class="settings-nav-manager-card-delete" data-section="' + sIdx + '" data-card="' + cIdx + '" title="删除卡片">×</button></div>';
      });
      html += '</div><div class="settings-card-add-form" id="card-form-' + sIdx + '" style="display:none;">' +
        '<input type="text" class="settings-input" placeholder="标题" data-field="title">' +
        '<input type="text" class="settings-input" placeholder="链接地址" data-field="url">' +
        '<input type="text" class="settings-input" placeholder="小文字" data-field="domain">' +
        '<input type="text" class="settings-input" placeholder="图片 URL（可选）" data-field="logo">' +
        '<div class="settings-radio-group" style="margin:0;"><label class="settings-radio"><input type="radio" name="card-style-' + sIdx + '" value="image" checked><span>带图</span></label><label class="settings-radio"><input type="radio" name="card-style-' + sIdx + '" value="text"><span>纯文字</span></label></div>' +
        '<div class="settings-input-wrap"><button type="button" class="settings-btn settings-card-save" data-section="' + sIdx + '">保存</button><button type="button" class="settings-btn settings-btn-secondary settings-card-cancel" data-section="' + sIdx + '">取消</button></div>' +
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
      btn.addEventListener('click', (e) => {
        const sIdx = parseInt(e.currentTarget.dataset.section);
        const cIdx = parseInt(e.currentTarget.dataset.card);
        CONFIG.sections[sIdx].items.splice(cIdx, 1);
        Renderer.renderSections();
        ConfigStore.save();
        this.renderNavManager();
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
  },

  createSectionData(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/></svg>数据管理</div><div class="settings-data-actions"><button type="button" class="settings-btn settings-btn-full" id="export-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>导出配置</button><button type="button" class="settings-btn settings-btn-full" id="import-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>导入配置</button><input type="file" id="import-file" accept=".json" style="display:none;"><button type="button" class="settings-btn settings-btn-danger settings-btn-full" id="reset-btn"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>恢复默认</button></div>';
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
    importFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          App.importConfig(ev.target.result);
          this.buildPanel();
          alert('配置导入成功！');
        } catch (err) {
          alert('配置导入失败：' + err.message);
        }
      };
      reader.readAsText(file);
      importFile.value = '';
    });

    document.getElementById('reset-btn').addEventListener('click', () => {
      if (confirm('确定要恢复默认设置吗？所有自定义配置将丢失。')) {
        ConfigStore.reset();
        location.reload();
      }
    });
  },

  createSectionAbout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = '<div class="settings-section-title"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>关于</div><div class="settings-about"><div class="settings-about-name">lemon\'s NewTab</div><div class="settings-about-version">v0.3.1</div><div class="settings-about-desc">一个简洁、可自定义的新标签页插件</div></div>';
    container.appendChild(section);
  },

  bindEvents() {
    const trigger = document.getElementById('settings-trigger');
    trigger.addEventListener('click', () => this.open());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
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
    document.documentElement.classList.remove('settings-locked');
    document.body.classList.remove('settings-locked', 'settings-panel-open');
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('settings-overlay').classList.remove('open');
  }
};

/* ============================================================
 *  App
 * ============================================================ */

const App = {
  addEngine(engine) {
    if (CONFIG.engines.find(e => e.name === engine.name)) {
      console.warn('Engine exists:', engine.name);
      return;
    }
    CONFIG.engines.push(engine);
    Search.renderDropdown();
    ConfigStore.save();
  },

  addSection(section) {
    CONFIG.sections.push(section);
    Renderer.renderSections();
    ConfigStore.save();
  },

  addCard(sectionTitle, card) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (section) {
      section.items.push(card);
      Renderer.renderSections();
      ConfigStore.save();
    }
  },

  removeSection(title) {
    CONFIG.sections = CONFIG.sections.filter(s => s.title !== title);
    Renderer.renderSections();
    ConfigStore.save();
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

  updateLayout(key, value) {
    if (CONFIG.layout[key] !== undefined) {
      CONFIG.layout[key] = value;
      this.syncLayout();
      ConfigStore.save();
    }
  },

  exportConfig() {
    return JSON.stringify(CONFIG, null, 2);
  },

  importConfig(json) {
    try {
      const data = JSON.parse(json);
      Object.assign(CONFIG, ConfigStore.deepMerge(DEFAULT_CONFIG, data));
      Renderer.renderSections();
      Search.renderDropdown();
      this.syncLayout();
      this.syncEffects();
      Theme.apply(CONFIG.theme);
      document.body.style.setProperty('--bg-image', 'url("' + CONFIG.backgroundImage + '")');
      if (CONFIG.bgBlur) {
        document.body.classList.remove('no-bg-blur');
      } else {
        document.body.classList.add('no-bg-blur');
      }
      ConfigStore.save();
    } catch (e) {
      console.error('Config parse failed:', e);
      throw e;
    }
  },

  toggleCardStyle(sectionTitle, cardTitle) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    const card = section.items.find(i => i.title === cardTitle);
    if (!card) return;
    card.style = card.style === 'text' ? 'image' : 'text';
    Renderer.renderSections();
    ConfigStore.save();
  },

  setCardStyle(sectionTitle, cardTitle, style) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    const card = section.items.find(i => i.title === cardTitle);
    if (!card) return;
    card.style = style;
    Renderer.renderSections();
    ConfigStore.save();
  },

  setSectionStyle(sectionTitle, style) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (!section) return;
    section.items.forEach(item => { item.style = style; });
    Renderer.renderSections();
    ConfigStore.save();
  },

  init() {
    ConfigStore.load();
    this.syncLayout();
    this.syncEffects();

    /* ============================================================
     *  背景加载策略（优先级最高，确保用户打开瞬间就有背景）
     * ============================================================
     *  1. HTML <head> 中已通过 <style> 和 preload 让本地图片秒开
     *  2. 这里统一负责：如果用户设置了自定义背景，后台加载 URL
     *     图片，加载完成后无缝切换到用户设置的图
     *  3. 默认配置（同一张南瓜图）不走网络，避免浪费请求
     * ============================================================ */
    const LOCAL_BG = 'pumpkin-8384698_960_720.jpg';
    const urlBg = CONFIG.backgroundImage;
    const isDefaultUrl = urlBg.indexOf('pumpkin-8384698') !== -1;

    if (isDefaultUrl) {
      // 默认配置：本地图和网络图是同一张，直接用本地路径，秒开且不浪费请求
      document.body.style.setProperty('--bg-image', 'url("' + LOCAL_BG + '")');
    } else {
      // 用户自定义了背景：先保持本地图显示（已由 HTML 内联样式设置），
      // 后台静默加载 URL 图片，加载完立即切换，人眼感知不到空白
      document.body.style.setProperty('--bg-image', 'url("' + LOCAL_BG + '")');
      const img = new Image();
      img.onload = function() {
        document.body.style.setProperty('--bg-image', 'url("' + urlBg + '")');
      };
      img.onerror = function() {
        // URL 图片加载失败，保持本地图片，不报错
      };
      img.src = urlBg;
    }

    if (CONFIG.bgBlur) {
      document.body.classList.remove('no-bg-blur');
    } else {
      document.body.classList.add('no-bg-blur');
    }
    Theme.init();
    Clock.init();
    Search.init();
    Renderer.init();
    Settings.init();
    ConfigStore.save();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
