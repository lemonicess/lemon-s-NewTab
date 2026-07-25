/* ============================================================
 *  新标签页 - 配置区
 *  修改以下内容即可自定义页面，无需改动 HTML 结构
 * ============================================================ */

/* 背景图片：修改此处即可，会覆盖 CSS 中的默认值 */
const CONFIG = {
  backgroundImage: 'https://pic.feria.eu.org/yF0pv2b1/Gfhey1-Tb-MAMsfs-J.jpg',

  /* ===== 布局间距 =====
   * 修改以下数值即可调整各区域间距，无需改动 CSS
   * 支持 px / rem / vh 等单位
   * ===================== */
  layout: {
    pageTop: '150px',        // 页面顶部留白
    clockToDate: '2px',     // 时钟与日期间距
    dateToSearch: '100px',   // 日期与搜索框间距
    searchToNav: '100px',    // 搜索框与导航卡片间距
    sectionTitleTop: '8px',  // 分区标题顶部间距
    titleToCards: '10px',    // 分区标题与卡片列表间距
    cardGap: '12px',         // 卡片之间间距
  },

  clock: {
    updateInterval: 1000,
    textShadow: '0 4px 14px rgba(0, 0, 0, 0.28)'
  },

  search: {
    defaultEngine: 'Bing',
    placeholder: '使用{engine}搜索',
    frostOpacity: 0.14,
    frostBlur: '8px',
    borderColor: 'rgba(255,255,255,0.28)',
    dropdownOpacity: 0.25
  },

  engines: [
    { name: 'Bing', base: 'https://cn.bing.com/search?q=' },
    { name: 'Google', base: 'https://www.google.com/search?q=' },
    { name: 'Bilibili', base: 'https://search.bilibili.com/all?keyword=' },
    { name: '小黑盒', base: 'https://www.xiaoheihe.cn/app/search/list?q=' },
    { name: 'Minecraft Wiki', base: 'https://zh.minecraft.wiki/w/' }
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
          title: 'Bilibili',
          url: 'https://www.bilibili.com',
          domain: 'bilibili.com',
          logo: 'https://s41.ax1x.com/2026/07/23/pmgfKl4.webp',
          scale: 0.7
        },
        {
          title: '小黑盒',
          url: 'https://www.xiaoheihe.cn/app/bbs/home',
          domain: 'xiaoheihe.cn',
          logo: 'https://s41.ax1x.com/2026/07/23/pmg4PZn.png',
          scale: 0.7
        }
      ]
    },
    {
      title: '人工智能',
      items: [
        {
          title: 'DeepSeek',
          url: 'https://chat.deepseek.com/',
          domain: 'deepseek.com',
          logo: 'https://s41.ax1x.com/2026/07/23/pmgftfO.png',
          scale: 0.7
        },
        {
          title: '豆包',
          url: 'https://www.doubao.com',
          domain: 'doubao.com',
          logo: 'https://s41.ax1x.com/2026/07/24/pm2p0JS.webp',
          scale: 1
        },
        {
          title: '千问',
          url: 'https://www.qianwen.com/',
          domain: 'qianwen.com',
          logo: 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGcgY2xpcC1wYXRoPSJ1cmwoI2NsaXAwXzY5MzJfNjEpIj4KPHBhdGggZD0iTTMyLjU4MjggMTQuMDU3OUgyNi4xODQxQzI2LjE4NDEgMTMuNzg1OCAyNi4xMTQgMTMuNTEzNyAyNS45NzI1IDEzLjI3MDZMMjUuMTE2MiAxMS43ODY3QzI0LjgzNDUgMTEuMjk5MyAyNC4zMTQ0IDEwLjk5OTQgMjMuNzUyMSAxMC45OTk0SDIyLjAzOTZDMjEuNDc3MyAxMC45OTk0IDIwLjk1NjEgMTEuMjk5MyAyMC42NzU1IDExLjc4NjdMMTguMDUzNiAxNi4zMjlDMTcuNzcxOCAxNi44MTY0IDE3Ljc3MTggMTcuNDE3NSAxOC4wNTM2IDE3LjkwNDhMMTguOTA5OCAxOS4zODg3QzE5LjE5MTYgMTkuODc2MSAxOS43MTE2IDIwLjE3NiAyMC4yNzQgMjAuMTc2SDMyLjU4MjhDMzMuMTQ1MiAyMC4xNzYgMzMuNjY2NCAxOS44NzYxIDMzLjk0NyAxOS4zODg3TDM0LjgwMzIgMTcuOTA0OEMzNS4wODUgMTcuNDE3NSAzNS4wODUgMTYuODE2NCAzNC44MDMyIDE2LjMyOUwzMy45NDcgMTQuODQ1MkMzMy42NjUyIDE0LjM1NzggMzMuMTQ1MiAxNC4wNTc5IDMyLjU4MjggMTQuMDU3OVoiIGZpbGw9IiMwODJERkYiLz4KPHBhdGggZD0iTTExLjQzMTEgMjEuNzI4OEwxNC42Mjk5IDI3LjI3MDFDMTQuMzk0MSAyNy40MDU2IDE0LjE5NDUgMjcuNjAyNyAxNC4wNTMgMjcuODQ3TDEzLjE5NjggMjkuMzMwOUMxMi45MTUgMjkuODE4MiAxMi45MTUgMzAuNDE5MyAxMy4xOTY4IDMwLjkwNjZMMTQuMDUzIDMyLjM5MDVDMTQuMzM0OCAzMi44Nzc5IDE0Ljg1NDggMzMuMTc3OCAxNS40MTcyIDMzLjE3NzhIMjAuNjYyMkMyMS4yMjQ1IDMzLjE3NzggMjEuNzQ1NyAzMi44Nzc5IDIyLjAyNjMgMzIuMzkwNUwyMi44ODI1IDMwLjkwNjZDMjMuMTY0MyAzMC40MTkzIDIzLjE2NDMgMjkuODE4MiAyMi44ODI1IDI5LjMzMDlMMTYuNzI4MSAxOC42NjkyQzE2LjQ0NjMgMTguMTgxOCAxNS45MjYzIDE3Ljg4MTkgMTUuMzY0IDE3Ljg4MTlIMTMuNjUxNUMxMy4wODkyIDE3Ljg4MTkgMTIuNTY3OSAxOC4xODE4IDEyLjI4NzMgMTguNjY5MkwxMS40MzExIDIwLjE1M0MxMS4xNDkzIDIwLjY0MDQgMTEuMTQ5MyAyMS4yNDE1IDExLjQzMTEgMjEuNzI4OFoiIGZpbGw9IiMwODJERkYiLz4KPHBhdGggZD0iTTI4LjY1IDM2LjIxMjFMMzEuODQ4NyAzMC42NzA4QzMyLjA4NDYgMzAuODA2MyAzMi4zNTU1IDMwLjg4MjUgMzIuNjM2IDMwLjg4MjVIMzQuMzQ4NUMzNC45MTA4IDMwLjg4MjUgMzUuNDMyMSAzMC41ODI1IDM1LjcxMjYgMzAuMDk1MkwzNi41Njg5IDI4LjYxMTNDMzYuODUwNiAyOC4xMjM5IDM2Ljg1MDYgMjcuNTIyOSAzNi41Njg5IDI3LjAzNTVMMzMuOTQ3IDIyLjQ5MzFDMzMuNjY1MiAyMi4wMDU4IDMzLjE0NTIgMjEuNzA1OCAzMi41ODI4IDIxLjcwNThIMzAuODcwNEMzMC4zMDggMjEuNzA1OCAyOS43ODY4IDIyLjAwNTggMjkuNTA2MiAyMi40OTMxTDIzLjM1MTggMzMuMTUzNkMyMy4wNyAzMy42NDEgMjMuMDcgMzQuMjQyMSAyMy4zNTE4IDM0LjcyOTRMMjQuMjA4IDM2LjIxMzNDMjQuNDg5OCAzNi43MDA3IDI1LjAwOTggMzcuMDAwNiAyNS41NzIyIDM3LjAwMDZIMjcuMjg0NkMyNy44NDcgMzcuMDAwNiAyOC4zNjgyIDM2LjcwMDcgMjguNjQ4OCAzNi4yMTMzTDI4LjY1IDM2LjIxMjFaIiBmaWxsPSIjMDgyREZGIi8+CjwvZz4KPGRlZnM+CjxjbGlwUGF0aCBpZD0iY2xpcDBfNjkzMl82MSI+CjxyZWN0IHdpZHRoPSIyNiIgaGVpZ2h0PSIyNiIgZmlsbD0id2hpdGUiIHRyYW5zZm9ybT0idHJhbnNsYXRlKDExIDExKSIvPgo8L2NsaXBQYXRoPgo8L2RlZnM+Cjwvc3ZnPgo=',
          scale: 1
        },
        {
          title: '元宝',
          url: 'https://yuanbao.tencent.com/',
          domain: 'tencent.com',
          logo: 'https://s41.ax1x.com/2026/07/24/pm2CJEt.jpg',
          scale: 1.1
        },
        {
          title: 'Claude',
          url: 'https://claude.ai/',
          domain: 'claude.com',
          logo: 'https://s41.ax1x.com/2026/07/24/pm2C5r9.webp',
          scale: 1.1
        }
      ]
    }
  ]
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
        this.updatePlaceholder();
        this.closeDropdown();
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
            <img src="${item.logo}" alt="${item.title} logo" style="transform: scale(${item.scale || 1});">
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
  },

  createOverlay() {
    const overlay = document.createElement('div');
    overlay.className = 'settings-overlay';
    overlay.id = 'settings-overlay';
    document.body.appendChild(overlay);
    overlay.addEventListener('click', () => this.close());
  },

  bindEvents() {
    const trigger = document.getElementById('settings-trigger');

    trigger.addEventListener('click', () => this.open());

    // ESC 关闭
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) this.close();
    });
  },

  open() {
    this.isOpen = true;
    document.documentElement.classList.add('settings-locked');
    document.body.classList.add('settings-locked');
    document.getElementById('settings-panel').classList.add('open');
    document.getElementById('settings-overlay').classList.add('open');
  },

  close() {
    this.isOpen = false;
    document.documentElement.classList.remove('settings-locked');
    document.body.classList.remove('settings-locked');
    document.getElementById('settings-panel').classList.remove('open');
    document.getElementById('settings-overlay').classList.remove('open');
  },

  toggle() {
    this.isOpen ? this.close() : this.open();
  },

  /**
   * 注册一个设置项
   * @param {Object} option
   * @param {string} option.id - 唯一标识
   * @param {string} option.label - tooltip 文字
   * @param {string} option.iconSvg - SVG 字符串
   * @param {Function} option.onClick - 点击回调
   * @param {boolean} [option.active=false] - 是否高亮
   */
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

  /**
   * 按 id 移除设置项
   */
  unregister(id) {
    const idx = this.registry.findIndex(o => o.id === id);
    if (idx === -1) return;
    this.registry.splice(idx, 1);
    const container = document.getElementById('settings-items');
    const btn = container.querySelector(`[data-label="${id}"]`);
    if (btn) btn.remove();
  },

  /**
   * 清空所有设置项
   */
  clear() {
    this.registry = [];
    document.getElementById('settings-items').innerHTML = '';
  }
};

/* ============================================================
 *  应用主控 & 扩展接口
 *  以下方法可在浏览器控制台调用，或供后续功能开发使用
 * ============================================================ */

const App = {
  addEngine(engine) {
    CONFIG.engines.push(engine);
    Search.renderDropdown();
  },

  addSection(section) {
    CONFIG.sections.push(section);
    Renderer.renderSections();
  },

  addCard(sectionTitle, card) {
    const section = CONFIG.sections.find(s => s.title === sectionTitle);
    if (section) {
      section.items.push(card);
      Renderer.renderSections();
    }
  },

  removeSection(title) {
    CONFIG.sections = CONFIG.sections.filter(s => s.title !== title);
    Renderer.renderSections();
  },

  setTheme(themeName) {
    document.documentElement.dataset.theme = themeName;
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

  updateLayout(key, value) {
    if (CONFIG.layout[key] !== undefined) {
      CONFIG.layout[key] = value;
      this.syncLayout();
    }
  },
  exportConfig() {
    return JSON.stringify(CONFIG, null, 2);
  },

  importConfig(json) {
    try {
      const data = JSON.parse(json);
      Object.assign(CONFIG, data);
      Renderer.renderSections();
      Search.renderDropdown();
    } catch (e) {
      console.error('配置解析失败:', e);
    }
  },

  init() {
    this.syncLayout();
    document.body.style.setProperty('--bg-image', `url("${CONFIG.backgroundImage}")`);
    Clock.init();
    Search.init();
    Renderer.init();
    Settings.init();
  }
};

document.addEventListener('DOMContentLoaded', () => App.init());