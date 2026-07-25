# 新标签页 - 自定义与开发指南

## 文件结构

```
.
├── index.html    # 页面骨架，通常无需修改
├── index.css     # 视觉样式与 CSS 变量
├── index.js      # 配置数据与交互逻辑
├── manifest.json # Chrome 插件配置
└── README.md     # 本说明文档
```

---

## 快速自定义（无需改 HTML）

所有内容数据集中在 `index.js` 顶部的 `CONFIG` 对象中，修改后刷新页面即可生效。

### 1. 更换背景图片

```javascript
backgroundImage: 'https://你的图片地址.jpg',
```

### 2. 调整页面间距

```javascript
layout: {
  pageTop: '150px',        // 页面顶部留白
  clockToDate: '2px',      // 时钟与日期间距
  dateToSearch: '100px',   // 日期与搜索框间距
  searchToNav: '100px',    // 搜索框与导航卡片间距
  sectionTitleTop: '8px',  // 分区标题顶部间距
  titleToCards: '10px',    // 分区标题与卡片列表间距
  cardGap: '12px',         // 卡片之间间距
},
```

> **注意**：改 `layout` 里的值即可，**不要**去改 CSS 中的 `--spacing-*` 变量。JS 会在页面加载时自动同步到 CSS。

### 3. 添加搜索引擎

在 `CONFIG.engines` 数组中追加：

```javascript
{ name: '百度', base: 'https://www.baidu.com/s?wd=' }
```

- `name`: 下拉菜单中显示的名称
- `base`: 搜索地址前缀，查询词会自动 URL 编码后拼接到末尾

### 4. 添加导航分区

在 `CONFIG.sections` 数组中追加：

```javascript
{
  title: '设计资源',
  items: [
    {
      title: 'Figma',
      url: 'https://www.figma.com',
      domain: 'figma.com',
      logo: 'https://example.com/figma-logo.png',
      scale: 1
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 卡片显示标题 |
| `url` | string | 点击跳转链接 |
| `domain` | string | 卡片右下角显示的域名（自动带 `@` 前缀） |
| `logo` | string | 图标 URL，支持 base64 Data URI |
| `scale` | number | 图标缩放比例，默认 `1` |

---

## 运行时接口

在浏览器控制台或后续脚本中可直接调用：

### 间距控制

```javascript
// 动态调整任意间距（key 对应 CONFIG.layout 的键名）
App.updateLayout('pageTop', '200px');      // 顶部留白加大
App.updateLayout('searchToNav', '60px');   // 搜索框与卡片间距缩小
App.updateLayout('dateToSearch', '150px');  // 日期与搜索框间距加大

// 一次性同步全部 layout 到 CSS（通常不需要手动调用）
App.syncLayout();
```

### 导航与搜索

```javascript
// 动态添加搜索引擎
App.addEngine({ name: 'DuckDuckGo', base: 'https://duckduckgo.com/?q=' });

// 动态添加分区
App.addSection({
  title: '工具站点',
  items: [ { title: 'GitHub', url: '...', domain: 'github.com', logo: '...', scale: 1 } ]
});

// 向已有分区追加卡片
App.addCard('常用站点', {
  title: 'Twitter',
  url: 'https://twitter.com',
  domain: 'twitter.com',
  logo: '...',
  scale: 1
});

// 删除分区
App.removeSection('人工智能');
```

### 配置导入导出

```javascript
// 导出当前配置为 JSON
const json = App.exportConfig();

// 导入 JSON 配置
App.importConfig(json);
```

### 主题系统（预留）

```javascript
// 设置 data-theme 属性（需配合 CSS 主题变量使用）
App.setTheme('dark');
```

### 设置面板

页面右下角有一个齿轮图标按钮，鼠标移入右下角区域时淡入显示，点击后右侧滑出设置面板。支持以下操作：

```javascript
// 打开 / 关闭 / 切换面板
Settings.open();
Settings.close();
Settings.toggle();

// 注册一个设置项（在面板中添加一个图标按钮）
Settings.register({
  id: 'bg',                           // 唯一标识
  label: '更换背景',                   // 鼠标悬停时显示的 tooltip
  iconSvg: '<svg width="20" height="20">...</svg>',  // 图标 SVG 字符串
  active: false,                      // 是否高亮显示（可选，默认 false）
  onClick: (btn) => {                // 点击回调，btn 为按钮 DOM 元素
    console.log('更换背景被点击');
  }
});

// 按 id 移除设置项
Settings.unregister('bg');

// 清空所有设置项
Settings.clear();
```

**关闭面板的方式**：点击遮罩层、按 `Esc` 键。

---

## CSS 变量参考

以下变量由 JS 的 `CONFIG` 自动同步，**通常不需要手动修改**。如需深度定制，可调整：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `--bg-image` | 背景图片（JS 会覆盖此值） | 原图 URL |
| `--bg-frost-opacity` | 背景毛玻璃不透明度 `0-1` | `0.05` |
| `--bg-frost-blur` | 背景模糊半径 | `8px` |
| `--search-frost-opacity` | 搜索框不透明度 | `0.14` |
| `--search-frost-blur` | 搜索框模糊半径 | `8px` |
| `--dropdown-opacity` | 下拉菜单不透明度 | `0.25` |
| `--page-max-width` | 页面最大宽度 | `800px` |
| `--page-padding-x` | 页面左右留白 | `8px` |
| `--card-width` | 卡片宽度 | `180px` |
| `--card-radius` | 卡片圆角 | `18px` |
| `--shadow-card` | 卡片阴影 | `0 10px 24px rgba(15,23,42,0.08)` |

> **间距类变量**（`--spacing-page-top`、`--spacing-date-search` 等）由 `CONFIG.layout` 控制，修改 CSS 中的值会被 JS 覆盖。

## 设置面板 CSS 类参考

| 类名 | 说明 |
|------|------|
| `.settings-trigger-wrap` | 右下角热区包裹层（100x100），hover 时显示按钮 |
| `.settings-trigger` | 齿轮图标按钮（52x52），默认隐藏，hover 时淡入 |
| `.settings-panel` | 右侧滑出面板，宽 340px，默认 `translateX(100%)` |
| `.settings-panel.open` | 面板打开状态，滑入显示 |
| `.settings-items` | 设置项按钮容器，纵向排列 |
| `.settings-item` | 单个设置项按钮（40x40） |
| `.settings-item.active` | 设置项高亮状态（紫色背景） |
| `.settings-item::after` | 设置项 tooltip，hover 时左侧弹出 |
| `.settings-overlay` | 遮罩层，点击可关闭面板 |

---

## 未来扩展建议

| 功能 | 实现思路 | 状态 |
|------|----------|------|
| **设置面板** | 右侧滑出面板，`Settings.register()` 动态注册设置项，已预留接口 | ✅ 已完成 |
| **主题系统** | 基于 `data-theme` 属性切换多套 `:root` 变量，已实现 `App.setTheme()` 接口 | 🚧 预留 |
| **配置持久化** | 在 `App.saveConfig()` / `App.loadConfig()` 中接入 `localStorage` | 📋 待做 |
| **每日壁纸** | 替换 `CONFIG.backgroundImage` 为 Bing / Unsplash 每日一图 API | 📋 待做 |
| **搜索建议** | 为 `search-input` 接入搜索引擎 Suggest API，动态展示候选词 | 📋 待做 |
| **拖拽排序** | 引入 SortableJS，为 `.nav-list` 添加拖拽能力，排序后同步回 `CONFIG` | 📋 待做 |
| **导入/导出** | 已实现 `exportConfig()` / `importConfig()`，可扩展为文件下载上传 | 🚧 部分完成 |
| **PWA 支持** | 添加 `manifest.json` 与 Service Worker，实现离线访问 | 📋 待做 |
| **键盘快捷键** | 监听 `/` 聚焦搜索框，`Esc` 关闭下拉菜单等 | 📋 待做 |

---

## 原代码注释汇总（已迁移至此）

以下内容来自原 `index.html`、`index.css`、`index.js` 中的注释，现统一归档：

### 添加/修改导航按钮

原 HTML 中通过复制 `<a class="nav-card">...</a>` 代码块实现，现改为在 `CONFIG.sections` 的 `items` 数组中添加对象即可。

### 添加新分区

原 HTML 中通过复制 `<div class="section-block">...</div>` 实现，现改为在 `CONFIG.sections` 数组中追加分区对象。

### 调整页面留白

原代码通过修改多个选择器的 `margin` / `padding` 实现，现统一为 `CONFIG.layout`：
- 顶部留白：`pageTop`
- 时钟与日期间距：`clockToDate`
- 日期与搜索栏间距：`dateToSearch`
- 搜索栏与卡片间距：`searchToNav`

### 毛玻璃参数调整

原代码注释说明修改 `--frost-opacity` 和 `--frost-blur`，现对应变量为：
- 全局背景：`--bg-frost-opacity`、`--bg-frost-blur`
- 搜索框：`--search-frost-opacity`、`--search-frost-blur`

### 搜索图标位置

搜索图标固定偏移：左 `13px`、上移 `3px`，如需调整修改 `.search-icon` 的 `left` 和 `transform` 值。

### 自定义搜索引擎

原代码通过复制 HTML 中的 `.search-option` 按钮并修改 `data-name` 和 `data-base` 实现，现统一在 `CONFIG.engines` 数组中配置。
