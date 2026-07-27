# lemon's NewTab - 自定义与开发指南 v0.4.0-fix2 | 2026-07-27 01:08 +08:00

## 文件结构

```
.
├── index.html    # 页面骨架，含内联脚本负责首屏背景秒开
├── index.css     # 视觉样式与 CSS 变量
├── index.js      # 配置数据与交互逻辑
├── manifest.json # Chrome 插件配置（需声明 storage 权限）
├── pumpkin-8384698_960_720.jpg  # 本地默认背景图（首屏秒开用）
└── README.md     # 本说明文档
```

---

## 快速自定义（无需改 HTML）

所有内容数据集中在 `index.js` 顶部的 `DEFAULT_CONFIG` 对象中，修改后刷新页面即可生效。

### 1. 更换背景图片

**方式一：通过设置面板（推荐）**

点击右下角齿轮图标打开设置面板，在"背景图片"输入框中粘贴图片 URL，点击"应用"或按回车即可实时生效。也支持上传本地图片（自动转 base64 存入配置）。

**方式二：修改代码**

```javascript
backgroundImage: 'https://你的图片地址.jpg',
```

### 2. 调整页面间距

```javascript
layout: {
  pageTop: '150px',        // 页面顶部间距
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

在 `DEFAULT_CONFIG.engines` 数组中追加：

```javascript
{ name: 'DuckDuckGo', base: 'https://duckduckgo.com/?q=' }
```

- `name`: 下拉菜单中显示的名称
- `base`: 搜索地址前缀，查询词会自动 URL 编码后拼接到末尾

默认内置：Bing、Google。

### 4. 添加导航分区与卡片

首次安装或恢复默认后，页面不显示任何导航分区，需通过设置面板的"导航管理"手动创建。

在代码中预配置，在 `DEFAULT_CONFIG.sections` 数组中追加：

```javascript
{
  title: '设计资源',
  items: [
    {
      title: 'Figma',
      url: 'https://www.figma.com',
      domain: 'figma.com',
      logo: 'https://example.com/figma-logo.png',
      scale: 1,
      style: 'image'   // 'image' 带图 | 'text' 纯文字
    }
  ]
}
```

字段说明：

| 字段 | 类型 | 说明 |
|------|------|------|
| `title` | string | 卡片显示标题 |
| `url` | string | 点击跳转链接 |
| `domain` | string | 卡片右下角显示的小文字 |
| `logo` | string | 图标 URL，支持 base64 Data URI |
| `scale` | number | 图标缩放比例，默认 `1` |
| `style` | string | `'image'` 带图（默认）/ `'text'` 纯文字，创建后不可更改 |

---

## 背景加载策略（v0.4.0 新增）

为避免打开新标签页时出现空白/纯色闪烁，背景采用**双阶段加载**：

| 阶段 | 时间点 | 行为 | 用户看到 |
|------|--------|------|---------|
| **阶段 1** | 0ms | `<head>` 中的 `preload` + 内联 `<style>` 让本地图片立即显示 | 本地南瓜背景瞬间出现，无空白 |
| **阶段 2** | ~50ms+ | `App.init()` 后台加载用户设置的 URL 图片，加载完无缝切换 | 背景变成用户设置的图 |

- 默认配置（未修改过背景）：直接使用本地路径，**不走任何网络请求**
- 用户自定义背景：本地图先顶着，URL 图加载完无缝切过去；加载失败则保持本地图
- 所有切换通过 CSS 变量 `--bg-image` 完成，无 DOM 操作，无重排

---

## 配置持久化（v0.4.0 变更）

配置存储在 **`chrome.storage.local`** 中（之前为 `localStorage`）。

| 用户操作 | 配置是否丢失 |
|---------|-------------|
| 清理"缓存的图片和文件" | 还在 |
| 清理"Cookie 和网站数据" | 还在 |
| 使用"清除浏览数据"但未勾选"扩展程序数据" | 还在 |
| 卸载插件 | 丢失 |
| 手动清除扩展程序数据 | 丢失 |

> `chrome.storage.local` 是插件专属存储空间，与普通网页的 `localStorage` 完全隔离，普通清理缓存不会碰它。

`manifest.json` 已声明 `"permissions": ["storage"]`，安装时浏览器会提示请求存储权限。

---

## 运行时接口

在浏览器控制台或后续脚本中可直接调用：

### 间距控制

```javascript
// 动态调整任意间距（key 对应 CONFIG.layout 的键名）
App.updateLayout('pageTop', '200px');      // 顶部间距加大
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
  items: [ { title: 'GitHub', url: '...', domain: 'github.com', logo: '...', scale: 1, style: 'image' } ]
});

// 向已有分区追加卡片
App.addCard('常用站点', {
  title: 'Twitter',
  url: 'https://twitter.com',
  domain: 'twitter.com',
  logo: '...',
  scale: 1,
  style: 'image'
});

// 删除分区
App.removeSection('人工智能');
```

### 配置导入导出

```javascript
// 导出当前配置为 JSON（含 base64 背景图）
const json = App.exportConfig();

// 导入 JSON 配置
App.importConfig(json);
```

也可通过设置面板的"数据管理"区域点击按钮导出/导入配置文件。

### 主题系统

```javascript
// 设置主题：'light' | 'dark' | 'auto'
App.setTheme('dark');
```

---

## 设置面板

页面右下角有一个齿轮图标按钮，鼠标移入右下角区域时淡入显示，点击后右侧滑出设置面板。

**内置功能：**

- **背景图片**：输入框 + 应用按钮，支持回车快捷提交，修改后背景实时刷新；支持上传本地图片
- **背景毛玻璃**：开关控制，关闭后背景遮罩不透明度滑块自动锁定（不可操作）
- **主题**：亮色 / 暗色 / 跟随系统
- **布局间距**：7 项滑块实时调整
- **视觉效果**：3 项不透明度滑块（背景遮罩、搜索框、下拉菜单）
- **搜索引擎**：增删搜索引擎
- **导航管理**：增删分组和卡片，创建卡片时可选择"带图/纯文字"样式（纯文字时隐藏图片 URL 输入框）
- **数据管理**：导出配置、导入配置、恢复默认

**关闭面板的方式**：点击遮罩层、按 `Esc` 键。

---

## CSS 变量参考

以下变量由 JS 的 `CONFIG` 自动同步，**通常不需要手动修改**。如需深度定制，可调整：

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `--bg-image` | 背景图片（JS 会覆盖此值） | 本地南瓜图 |
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
| `.settings-panel-inner` | 面板内容容器，支持纵向滚动 |
| `.settings-section` | 设置表单区块 |
| `.settings-label` | 表单标签文字 |
| `.settings-input-wrap` | 输入框 + 按钮的横向布局容器 |
| `.settings-input` | 文本输入框，聚焦时紫色边框高亮 |
| `.settings-btn` | 紫色应用按钮 |
| `.settings-slider-wrap` | 滑块容器 |
| `.settings-radio-group` | 单选按钮组 |
| `.settings-toggle-wrap` | 开关控件容器 |
| `.settings-nav-manager` | 导航管理区域 |
| `.settings-nav-sections` | 导航分组列表，动态撑开无高度限制 |
| `.settings-card-add-form` | 添加卡片表单 |

---

## 未来扩展建议

| 功能 | 实现思路 | 状态 |
|------|----------|------|
| **设置面板** | 右侧滑出面板，多区块表单，已完整实现 | 已完成 |
| **主题系统** | 基于 `data-theme` 属性切换多套 `:root` 变量 | 已完成 |
| **配置持久化** | `chrome.storage.local` 自动保存/读取，普通清缓存不丢 | 已完成 |
| **首屏背景秒开** | `preload` + 本地图占位 + URL 图后台切换 | 已完成 |
| **每日壁纸** | 设置面板已支持手动输入 URL，可扩展为 Bing / Unsplash API 自动获取 | 部分完成 |
| **搜索建议** | 为 `search-input` 接入搜索引擎 Suggest API，动态展示候选词 | 待做 |
| **拖拽排序** | 引入 SortableJS，为 `.nav-list` 添加拖拽能力，排序后同步回 `CONFIG` | 待做 |
| **导入/导出** | 已实现文件下载/上传，支持含 base64 图片的完整配置 | 已完成 |
| **PWA 支持** | 添加 `manifest.json` 与 Service Worker，实现离线访问 | 待做 |
| **键盘快捷键** | 监听 `/` 聚焦搜索框，`Esc` 关闭下拉菜单等 | 待做 |

---

## 原代码注释汇总（已迁移至此）

### 添加/修改导航按钮

原 HTML 中通过复制 `<a class="nav-card">...</a>` 代码块实现，现改为在 `CONFIG.sections` 的 `items` 数组中添加对象即可。

### 添加新分区

原 HTML 中通过复制 `<div class="section-block">...</div>` 实现，现改为在 `CONFIG.sections` 数组中追加分区对象。

### 调整页面间距

原代码通过修改多个选择器的 `margin` / `padding` 实现，现统一为 `CONFIG.layout`：
- 顶部间距：`pageTop`
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
