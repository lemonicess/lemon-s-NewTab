/* ============================================================
 *  新标签页 - 配置区
 *  修改以下内容即可自定义页面，无需改动 HTML 结构
 * ============================================================ */

/* 默认配置 */
const DEFAULT_CONFIG = {
  backgroundImage: 'https://cdn.pixabay.com/photo/2023/11/13/07/18/pumpkin-8384698_960_720.jpg',

  theme: 'auto', // 'light' | 'dark' | 'auto'

  /* ===== 布局间距 ===== */
  layout: {
    pageTop: '150px',
    clockToDate: '2px',
    dateToSearch: '100px',
    searchToNav: '100px',
    sectionTitleTop: '8px',
    titleToCards: '10px',
    cardGap: '12px',
  },

  /* ===== 视觉效果 ===== */
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
    { name: '百度', base: 'https://www.baidu.com/s?wd=' },
  ],

  sections: [
    {
      title: '常用站点',
      items: [
        {
          title: 'Google',
          url: 'https://www.google.com',
          domain: 'google.com',
          logo: 'https://s41.ax1x.com/2026/07/23/pmgfiOs.jpg',
          scale: 1
        },
        {
          title: 'Bing',
          url: 'https://www.bing.com',
          domain: 'bing.com',
          logo: 'https://s41.ax1x.com/2026/07/23/pmgfkmn.webp',
          scale: 0.7
        },
        {
          title: 'GitHub',
          url: 'https://github.com',
          domain: 'github.com',
          logo: 'https://github.com/favicon.ico',
          scale: 1
        },
        {
          title: 'Bilibili',
          url: 'https://www.bilibili.com',
          domain: 'bilibili.com',
          logo: 'https://www.bilibili.com/favicon.ico',
          scale: 1
        }
      ]
    },
    {
      title: '工具',
      items: [
        {
          title: 'DeepL 翻译',
          url: 'https://www.deepl.com/translator',
          domain: 'deepl.com',
          logo: 'https://www.deepl.com/favicon.ico',
          scale: 1
        },
        {
          title: 'Excalidraw',
          url: 'https://excalidraw.com',
          domain: 'excalidraw.com',
          logo: 'https://excalidraw.com/favicon.ico',
          scale: 1
        }
      ]
    }
  ]
};

/* 当前配置 */
let CONFIG = JSON.parse(JSON.stringify(DEFAULT_CONFIG));

/* ============================================================
 *  模块：配置持久化
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
      // 单独加载背景 URL（base64 或网络 URL）
      const bgUrl = localStorage.getItem(this.BG_STORAGE_KEY);
      if (bgUrl) {
        CONFIG.backgroundImage = bgUrl;
      }
    } catch (e) {
      console.warn('配置加载失败，使用默认配置:', e);
    }
    return false;
  },

  save() {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(CONFIG));
    } catch (e) {
      console.error('配置保存失败:', e);
    }
  },

  saveBgUrl(url) {
    try {
      localStorage.setItem(this.BG_STORAGE_KEY, url);
    } catch (e) {
      console.error('背景 URL 保存失败:', e);
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
 *  模块：主题系统
 * ============================================================ */

const Theme = {
  init() {
    this.apply(CONFIG.theme);
    if (window.matchMedia) {
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (CONFIG.theme === 'auto') this.apply('auto');
      });
    }
  },

  apply(theme) {
    const isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
  },

  set(theme) {
    CONFIG.theme = theme;
    this.apply(theme);
    ConfigStore.save();
  }
};

/* ============================================================
 *  模块：时钟
 * ============================================================ */

const Clock = {
  interval: null,
  currentDateKey: '',

  formatTime(date) {
    const h = String(date.getHours()).padStart(2, '0');
    const m = String(date.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  },

  formatDate(date) {
    const weeks = ['日', '一', '二', '三', '四', '五', '六'];
    return `${date.getMonth() + 1}月${date.getDate()}日 星期${weeks[date.getDay()]}`;
  },

  update() {
    if (document.hidden) return;
    const now = new Date();
    document.getElementById('clock').textContent = this.formatTime(now);
    const key = `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;
    if (key !== this.currentDateKey) {
      document.getElementById('date-label').textContent = this.formatDate(now);
      this.currentDateKey = key;
    }
  },

  start() {
    this.stop();
    this.update();
    this.interval = setInterval(() => this.update(), CONFIG.clock.updateInterval);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
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
 *  模块：搜索
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
    const dropdown = document.querySelector('.search-dropdown');
    dropdown.innerHTML = CONFIG.engines.map(engine =>
      `<button type="button" class="search-option" data-name="${engine.name}" data-base="${engine.base}">${engine.name}</button>`
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
    const input = document.querySelector('.search-input');
    input.placeholder = CONFIG.search.placeholder.replace('{engine}', this.currentEngine.name);
  },

  toggleDropdown() {
    document.querySelector('.search-dropdown').classList.toggle('open');
  },

  closeDropdown() {
    document.querySelector('.search-dropdown').classList.remove('open');
  },

  bindEvents() {
    const icon = document.querySelector('.search-icon');
    const input = document.querySelector('.search-input');

    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleDropdown();
    });

    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter') return;
      const query = input.value.trim();
      if (!query) return;
      window.open(this.currentEngine.base + encodeURIComponent(query), '_self');
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        input.blur();
        this.closeDropdown();
      }
    });

    document.addEventListener('click', (e) => {
      const dropdown = document.querySelector('.search-dropdown');
      if (!icon.contains(e.target) && !dropdown.contains(e.target)) {
        this.closeDropdown();
      }
    });
  }
};

/* ============================================================
 *  模块：渲染器
 * ============================================================ */

const Renderer = {
  init() {
    this.renderSections();
  },

  renderSections() {
    const page = document.querySelector('.page');
    page.querySelectorAll('.section-block, .nav-list').forEach(el => el.remove());

    CONFIG.sections.forEach(section => {
      const sectionEl = document.createElement('div');
      sectionEl.className = 'section-block';
      sectionEl.innerHTML = `<h2>${section.title}</h2>`;
      page.appendChild(sectionEl);

      const listEl = document.createElement('div');
      listEl.className = 'nav-list';

      section.items.forEach(item => {
        const card = document.createElement('a');
        card.className = 'nav-card';
        card.href = item.url;
        card.target = '_self';
        card.rel = 'noopener noreferrer';
        card.innerHTML = `
          <div class="logo-wrap">
            <img src="${item.logo}" alt="${item.title} logo" style="transform: scale(${item.scale || 1});" onerror="this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2248%22 height=%2248%22%3E%3Crect width=%2248%22 height=%2248%22 fill=%22%23e5e7eb%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%239b9b9b%22 font-size=%2220%22%3E${item.title.charAt(0)}%3C/text%3E%3C/svg%3E'">
          </div>
          <div class="text-wrap">
            <span class="title">${item.title}</span>
            <span class="url">@${item.domain}</span>
          </div>
        `;
        listEl.appendChild(card);
      });

      page.appendChild(listEl);
    });
  }
};

/* ============================================================
 *  模块：设置面板
 * ============================================================ */

const Settings = {
  isOpen: false,
  registry: [],

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
    const panelInner = document.querySelector('.settings-panel-inner');
    panelInner.innerHTML = '';
    this.createSectionAppearance(panelInner);
    this.createSectionLayout(panelInner);
    this.createSectionEffects(panelInner);
    this.createSectionEngines(panelInner);
    this.createSectionData(panelInner);
    this.createSectionAbout(panelInner);
  },

  /* ---------- 外观设置 ---------- */
  createSectionAppearance(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>
        </svg>
        外观
      </div>

      <label class="settings-label">背景图片</label>
      <div class="settings-input-wrap">
        <input type="text" class="settings-input" id="bg-url-input" placeholder="输入图片 URL..." value="${CONFIG.backgroundImage.startsWith('data:') ? '' : CONFIG.backgroundImage}">
        <button type="button" class="settings-btn" id="bg-apply-btn">应用</button>
      </div>

      <div class="settings-file-wrap">
        <input type="file" id="bg-file-input" accept="image/*" style="display:none;">
        <button type="button" class="settings-btn settings-btn-full" id="bg-upload-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          上传本地图片
        </button>
        <div class="settings-file-name" id="bg-file-name"></div>
      </div>

      <label class="settings-label" style="margin-top:12px;">主题</label>
      <div class="settings-radio-group" id="theme-group">
        <label class="settings-radio"><input type="radio" name="theme" value="light" ${CONFIG.theme === 'light' ? 'checked' : ''}><span>亮色</span></label>
        <label class="settings-radio"><input type="radio" name="theme" value="dark" ${CONFIG.theme === 'dark' ? 'checked' : ''}><span>暗色</span></label>
        <label class="settings-radio"><input type="radio" name="theme" value="auto" ${CONFIG.theme === 'auto' ? 'checked' : ''}><span>跟随系统</span></label>
      </div>
    `;
    container.appendChild(section);

    // URL 应用
    const bgInput = document.getElementById('bg-url-input');
    const applyBgUrl = () => {
      let url = bgInput.value.trim();
      if (!url) {
        url = DEFAULT_CONFIG.backgroundImage;
        bgInput.value = url;
      }
      CONFIG.backgroundImage = url;
      document.body.style.setProperty('--bg-image', `url("${url}")`);
      ConfigStore.saveBgUrl(url);
      ConfigStore.save();
    };
    document.getElementById('bg-apply-btn').addEventListener('click', applyBgUrl);
    bgInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') applyBgUrl(); });

    // 文件上传
    const fileInput = document.getElementById('bg-file-input');
    const uploadBtn = document.getElementById('bg-upload-btn');

    uploadBtn.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      // 检查文件大小（限制 5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片过大，请选择小于 5MB 的文件');
        fileInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target.result;
        CONFIG.backgroundImage = dataUrl;
        document.body.style.setProperty('--bg-image', `url("${dataUrl}")`);
        ConfigStore.saveBgUrl(dataUrl);
        bgInput.value = '';
      };
      reader.readAsDataURL(file);
    });

    // 主题切换
    section.querySelectorAll('input[name="theme"]').forEach(radio => {
      radio.addEventListener('change', (e) => {
        Theme.set(e.target.value);
      });
    });
  },

  /* ---------- 布局设置 ---------- */
  createSectionLayout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
        </svg>
        布局间距
      </div>
      <div class="settings-slider-group" id="layout-sliders"></div>
    `;
    container.appendChild(section);

    const sliderGroup = section.querySelector('#layout-sliders');
    const layoutMap = [
      { key: 'pageTop', label: '页面顶部留白', min: 50, max: 300, step: 10, unit: 'px' },
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
      wrap.innerHTML = `
        <div class="settings-slider-header">
          <span class="settings-slider-label">${item.label}</span>
          <span class="settings-slider-value">${currentVal}${item.unit}</span>
        </div>
        <input type="range" class="settings-slider" data-key="${item.key}" 
               min="${item.min}" max="${item.max}" step="${item.step}" value="${currentVal}">
      `;
      sliderGroup.appendChild(wrap);

      const slider = wrap.querySelector('.settings-slider');
      const valueLabel = wrap.querySelector('.settings-slider-value');

      slider.addEventListener('input', (e) => {
        const val = e.target.value;
        valueLabel.textContent = `${val}${item.unit}`;
        App.updateLayout(item.key, `${val}${item.unit}`);
      });
    });
  },

  /* ---------- 效果设置 ---------- */
  createSectionEffects(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
        </svg>
        视觉效果
      </div>
      <div class="settings-slider-group" id="effect-sliders"></div>
    `;
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
      wrap.innerHTML = `
        <div class="settings-slider-header">
          <span class="settings-slider-label">${item.label}</span>
          <span class="settings-slider-value">${Math.round(currentVal * 100)}%</span>
        </div>
        <input type="range" class="settings-slider" data-key="${item.key}" 
               min="0" max="1" step="0.01" value="${currentVal}">
      `;
      sliderGroup.appendChild(wrap);

      const slider = wrap.querySelector('.settings-slider');
      const valueLabel = wrap.querySelector('.settings-slider-value');

      slider.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        valueLabel.textContent = `${Math.round(val * 100)}%`;
        CONFIG.effects[item.key] = val;
        document.documentElement.style.setProperty(item.cssVar, String(val));
        ConfigStore.save();
      });
    });
  },

  /* ---------- 搜索引擎管理 ---------- */
  createSectionEngines(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
        </svg>
        搜索引擎
      </div>
      <div class="settings-engine-list" id="engine-list"></div>
      <div class="settings-add-form" id="engine-add-form" style="display:none;">
        <input type="text" class="settings-input" id="engine-name" placeholder="名称，如 Bing">
        <input type="text" class="settings-input" id="engine-base" placeholder="搜索地址前缀，如 https://cn.bing.com/search?q=">
        <div class="settings-input-wrap">
          <button type="button" class="settings-btn" id="engine-save-btn">保存</button>
          <button type="button" class="settings-btn settings-btn-secondary" id="engine-cancel-btn">取消</button>
        </div>
      </div>
      <button type="button" class="settings-btn settings-btn-full" id="engine-add-btn">+ 添加搜索引擎</button>
    `;
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

      // 自动补全协议头
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
    list.innerHTML = CONFIG.engines.map((engine, idx) => `
      <div class="settings-engine-item">
        <span class="settings-engine-name">${engine.name}</span>
        <span class="settings-engine-url">${engine.base}</span>
        ${CONFIG.engines.length > 1 ? `<button type="button" class="settings-engine-delete" data-idx="${idx}" title="删除">×</button>` : ''}
      </div>
    `).join('');

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

  /* ---------- 数据管理 ---------- */
  createSectionData(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4"/>
        </svg>
        数据管理
      </div>
      <div class="settings-data-actions">
        <button type="button" class="settings-btn settings-btn-full" id="export-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
          </svg>
          导出配置
        </button>
        <button type="button" class="settings-btn settings-btn-full" id="import-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
          </svg>
          导入配置
        </button>
        <input type="file" id="import-file" accept=".json" style="display:none;">
        <button type="button" class="settings-btn settings-btn-danger settings-btn-full" id="reset-btn">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
          </svg>
          恢复默认
        </button>
      </div>
    `;
    container.appendChild(section);

    document.getElementById('export-btn').addEventListener('click', () => {
      const blob = new Blob([App.exportConfig()], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `lemon-newtab-config-${new Date().toISOString().slice(0, 10)}.json`;
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

  /* ---------- 关于 ---------- */
  createSectionAbout(container) {
    const section = document.createElement('div');
    section.className = 'settings-section';
    section.innerHTML = `
      <div class="settings-section-title">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>
        </svg>
        关于
      </div>
      <div class="settings-about">
        <div class="settings-about-name">lemon's NewTab</div>
        <div class="settings-about-version">v0.3</div>
        <div class="settings-about-desc">一个简洁、可自定义的新标签页插件</div>
      </div>
    `;
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
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  register(option) {
    this.registry.push(option);
    this.renderItem(option);
  },

  renderItem(option) {
    const container = document.getElementById('settings-items');
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'settings-item' + (option.active ? ' active' : '');
    btn.dataset.label = option.label;
    btn.innerHTML = option.iconSvg;
    btn.addEventListener('click', () => {
      if (option.onClick) option.onClick(btn);
    });
    container.appendChild(btn);
  },

  unregister(id) {
    const idx = this.registry.findIndex(o => o.id === id);
    if (idx === -1) return;
    this.registry.splice(idx, 1);
    const container = document.getElementById('settings-items');
    const btn = container.querySelector(`[data-label="${id}"]`);
    if (btn) btn.remove();
  },

  clear() {
    this.registry = [];
    document.getElementById('settings-items').innerHTML = '';
  }
};

/* ============================================================
 *  应用主控 & 扩展接口
 * ============================================================ */

const App = {
  addEngine(engine) {
    if (CONFIG.engines.find(e => e.name === engine.name)) {
      console.warn('搜索引擎已存在:', engine.name);
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
      document.body.style.setProperty('--bg-image', `url("${CONFIG.backgroundImage}")`);
      ConfigStore.save();
    } catch (e) {
      console.error('配置解析失败:', e);
      throw e;
    }
  },

  init() {
    ConfigStore.load();
    this.syncLayout();
    this.syncEffects();
    document.body.style.setProperty('--bg-image', `url("${CONFIG.backgroundImage}")`);
    Theme.init();
    Clock.init();
    Search.init();
    Renderer.init();
    Settings.init();
    ConfigStore.save();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());
