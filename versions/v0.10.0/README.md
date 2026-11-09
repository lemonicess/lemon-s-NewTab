# lemon's NewTab — 使用与开发指南

当前版本：v0.10.0（2026-10-30）

一个基于 Manifest V3 的 Chrome 新标签页扩展，包含时钟、搜索、导航卡片、主题、静态图片与 MP4 动态背景、Bing 每日壁纸、书签导入、自定义 CSS，以及可扩展的五语言界面。

## 安装为扩展

1. 打开 Chrome 的扩展程序管理页面，开启“开发者模式”。
2. 选择“加载已解压的扩展程序”。
3. 选择本目录，确保目录根部可直接看到 `manifest.json`。
4. 新建标签页即可使用。

普通网页预览可用于检查界面，但与扩展环境有两点不同：

- 普通预览使用 `localStorage` 保存设置，数据只存在当前浏览器；扩展使用 `chrome.storage.local`，不会跨设备同步。
- Bing 接口权限和跨域行为以扩展环境为准，普通预览中可能无法开启 Bing 每日壁纸。

## 文件结构

```text
.
├── manifest.json   # 扩展配置、版本与权限
├── index.html      # 页面结构
├── bootstrap.js    # 首屏主题引导，外部脚本以兼容 MV3 CSP
├── index.css       # 视觉样式、主题与响应式规则
├── index.js        # 配置、存储和全部交互逻辑
├── i18n/
│   ├── i18n.js     # 语言注册、解析、回退、DOM 与日期本地化
│   ├── en.js       # English
│   ├── ja.js       # 日本語
│   ├── ko.js       # 한국어
│   ├── zh-CN.js    # 简体中文
│   └── zh-TW.js    # 繁體中文
├── tests/
│   ├── logic.test.cjs
│   └── i18n_audit.cjs
├── pumpkin-8384698_960_720.jpg
└── README.md
```

## 已实现功能

- 时钟与本地化日期，按分钟更新，页面隐藏时停止计时。
- 英语、日语、韩语、简体中文和繁体中文；默认跟随系统语言，也可在高级设置中固定语言。
- Bing、Google 及用户自定义搜索引擎，支持排序、删除和键盘选择。
- 导航分组与卡片的新增、编辑、删除、拖拽排序和跨组移动。
- 从浏览器导出的 HTML 书签文件导入导航。
- 亮色、暗色和跟随系统主题。
- 本地背景、远程图片背景和 Bing 每日壁纸。
- 本地或远程 MP4 动态壁纸，静音循环播放，加载失败时回退到静态背景。
- 卡片全局宽度、高度，以及单张卡片的独立宽高覆盖。
- 布局间距、背景与下拉菜单透明度、独立卡片背景／文字不透明度、组件颜色和自定义 CSS。
- 设置面板板块排序。
- 配置导入、导出与恢复默认。
- 设置面板关闭按钮、焦点管理、键盘导航和减少动态效果适配。

## 多语言与语言扩展

在“设置 → 高级 → 高级设置 → 语言”中选择界面语言。`language: 'auto'` 是默认值，会按浏览器的 `navigator.languages` 解析；也可以固定为 `en`、`ja`、`ko`、`zh-CN` 或 `zh-TW`。选择后立即更新整个界面并保存，日期通过 `Intl.DateTimeFormat` 本地化。

系统语言匹配规则：

- `zh-TW`、`zh-HK`、`zh-MO` 和包含 `Hant` 的中文地区使用繁体中文，其他中文地区使用简体中文。
- 英语、日语和韩语按语言及地区匹配。
- 不支持的系统语言回退到英语；当前语言缺少某个键时也回退到英语。
- 自动模式下，浏览器触发 `languagechange` 时会重新解析系统语言。

语言包全部本地加载，不发起网络请求。每个语言包具有相同的扁平翻译键和插值占位符，用户自定义的分组名、卡片名与搜索引擎名不会被翻译。

### 注册更多语言

新增语言时，在 `i18n/` 中添加语言包，并在 `index.html` 中于 `index.js` 之前加载。公开接口：

```javascript
I18n.registerLocale('fr', {
  'app.title': 'Nouvel onglet',
  'settings.title': 'Paramètres',
  // 其余键与 en.js 对齐；缺失键回退到英语
}, { name: 'Français' });
```

主要接口包括：

- `I18n.registerLocale(code, messages, meta)`：注册或增量补充语言，支持嵌套对象并自动展开为点分隔键。
- `I18n.t(key, params)`：翻译并使用 `{name}` 形式的参数插值。
- `I18n.setLanguage(preference)`：设置 `auto` 或固定语言。
- `I18n.resolveLocale(preference, languages?)`：解析系统／指定语言。
- `I18n.availableLocales()`：列出已注册语言，供设置界面生成选项。
- `I18n.apply(root)`：更新带 `data-i18n`、`data-i18n-placeholder`、`data-i18n-aria-label`、`data-i18n-title` 的 DOM。
- `I18n.formatDate(date, options?)`、`I18n.onChange(listener)`：日期本地化与语言变化订阅。

运行 `node tests/i18n_audit.cjs` 可检查语言包键集合、占位符、代码中引用的键、系统语言回退和自定义注册接口。

## 背景与存储策略

### 默认背景

默认背景完全来自本地文件，不进行远程预连接。页面样式先显示本地图，再按用户配置切换，避免首屏空白。

### 用户背景与 Bing 壁纸

配置中两个字段职责不同：

- `backgroundImage`：用户自己的背景。
- `bingImage`：Bing 当前壁纸。

`bingDaily` 只决定当前使用哪一张图，不会把 Bing 地址写进用户背景字段。关闭每日壁纸后会恢复用户背景。

### MP4 动态壁纸

在“设置 → 外观 → 背景类型”中选择“MP4 动态”，然后粘贴远程视频地址或上传本地 MP4。视频会静音、循环、铺满页面播放，并在页面隐藏时暂停；系统开启“减少动态效果”时也会暂停。实际显示 MP4 背景时，“背景毛玻璃”和“Bing 每日壁纸”选项会隐藏；若 Bing 正在生效，相关选项会保留到关闭 Bing 后再隐藏。

本地视频以 Blob 形式保存在 IndexedDB 中，不转换为 Base64，也不占用 `chrome.storage.local` 的配置空间。扩展声明了 `unlimitedStorage` 权限，用于减少大型视频被配额或存储压力清理的风险。视频和配置都只保存在当前浏览器，不会跨设备同步。

`backgroundMode` 记录偏好背景类型，`backgroundVideo` 保存远程地址或本地视频标记，`videoName` 保存本地文件名。Bing 每日壁纸开启时优先显示 Bing，关闭后恢复之前选择的图片或视频。

### 图片缓存

远程图片会尝试压缩并生成独立缓存；缓存只用于加速启动，不属于用户配置。上传图片也会在保存前压缩、限制尺寸，减少 Base64 对存储空间的占用。

配置保存失败时会显示错误提示，不再把失败操作提示为成功。

### 配置导出

导出的 JSON 包含用户设置、稳定 ID 和 `schemaVersion`，不包含 `_bgBase64`、`_bgCachedUrl` 等派生缓存，也不包含本地 MP4 文件；使用本地视频时，导出的配置会回退为静态背景。导入时会先校验整个候选配置，验证通过后才替换当前设置。

卸载扩展或手动清除扩展程序数据会删除配置；普通清理网页缓存不会清除 `chrome.storage.local` 中的设置。

## 快速自定义

默认配置集中在 `index.js` 顶部的 `DEFAULT_CONFIG`。

### 更换背景

推荐在“设置 → 外观”中粘贴图片 URL 或上传本地图片。代码中也可修改：

```javascript
backgroundImage: 'https://example.com/background.jpg'
```

恢复本地默认图可使用：

```javascript
backgroundImage: 'pumpkin-8384698_960_720.jpg'
```

### 调整布局

```javascript
layout: {
  pageTop: '150px',
  clockToDate: '2px',
  dateToSearch: '100px',
  searchToNav: '100px',
  sectionTitleTop: '8px',
  titleToCards: '10px',
  cardGap: '12px',
}
```

运行时也可调用：

```javascript
App.updateLayout('pageTop', '200px');
App.updateLayout('searchToNav', '60px');
```

布局变化会立即显示，存储写入自动防抖。

### 添加搜索引擎

```javascript
App.addEngine({
  name: 'DuckDuckGo',
  base: 'https://duckduckgo.com/?q='
});
```

引擎 ID 会自动生成。`base` 是搜索地址前缀，查询词会经过 URL 编码后拼接。

### 添加分组和卡片

```javascript
const sectionId = 'section_work';

await App.addSection({
  id: sectionId,
  title: '工作',
  items: []
});

await App.addCard(sectionId, {
  title: 'Figma',
  url: 'https://www.figma.com',
  domain: 'figma.com',
  logo: '',
  scale: 1,
  style: 'text'
});
```

分组和卡片都使用稳定 ID。旧 API 仍可按标题查找第一个匹配分组，但新代码应使用 ID；删除同名分组不会再误删其他分组。

卡片字段：

| 字段 | 说明 |
|------|------|
| `id` | 可选，留空时自动生成 |
| `title` | 卡片标题 |
| `url` | 仅允许有效的 HTTP/HTTPS 地址 |
| `domain` | 卡片小字，留空时尝试从 URL 提取 |
| `logo` | HTTP/HTTPS 或图片 Data URI；留空使用文字回退图标 |
| `scale` | 图标缩放，限制在 0.25–4 |
| `style` | `image` 或 `text` |
| `width` | 可选的单卡宽度，120–420px；留空跟随全局 |
| `height` | 可选的单卡高度，48–240px；留空跟随全局 |

全局卡片尺寸集中在 `cardLayout.width` 和 `cardLayout.height`。也可以在“设置 → 布局间距”中调整；在“设置 → 导航管理”中点击某张卡片的编辑按钮，可单独覆盖宽高。“设置 → 视觉效果”中的“卡片背景不透明度”只调整卡片背景，字段为 `effects.cardOpacity`；“卡片文字不透明度”只调整标题和域名文字，字段为 `effects.cardTextOpacity`。两者互不影响。

## 配置接口

```javascript
const json = App.exportConfig();
await App.importConfig(json);
await App.setTheme('dark');
CONFIG.language = 'auto'; // 或 en、ja、ko、zh-CN、zh-TW
App.applyLanguage();
await ConfigStore.save();
```

导入配置需要是有效 JSON，并通过字段、URL、颜色和布局校验。无效配置不会部分覆盖当前设置。

## 设置面板与快捷键

- 点击右下角齿轮或按 `Ctrl + K`（Mac 为 `Cmd + K`）打开设置。
- 点击关闭按钮、遮罩或按 `Esc` 关闭面板。
- “高级设置”中可选择语言、调整板块顺序和编辑自定义 CSS。
- 未保存的 CSS 在关闭面板后会保留为本次页面会话中的草稿。
- `/` 聚焦搜索框。
- 搜索框中按方向下键进入引擎菜单，方向键移动，回车选择。
- `Tab` 在打开的设置面板内循环移动焦点。

## 自定义 CSS

在“设置 → 高级设置 → 自定义 CSS”中输入并保存。样式会注入页面 `<head>` 末尾，同优先级下覆盖默认样式。

自定义 CSS 可以加载远程资源或改变页面布局，只导入自己信任的配置。出现显示异常时，清空自定义 CSS 即可恢复。

## v0.10.0 新增

- 加入英语、日语、韩语、简体中文和繁体中文五套本地语言包。
- 默认按系统语言选择，支持简繁中文地区匹配和英语回退。
- 高级设置新增语言选择器，切换立即生效并持久化。
- 设置、通知、错误、无障碍标签、搜索提示和日期全面本地化。
- 提供 `I18n.registerLocale()` 等公开接口，便于后续注册更多语言。
- 新增语言包一致性审计和五语言浏览器回归验证。

## v0.9.2 调整

- 卡片背景不透明度不再影响文字、图标或边框。
- 新增独立的卡片文字不透明度控制，可与背景透明度分别调整。

## v0.9.1 调整

- MP4 背景实际生效时，隐藏“背景毛玻璃”和“Bing 每日壁纸”选项。
- 新增全局卡片不透明度控制，设置会即时生效并自动保存。

## v0.9.0 新增

- 支持本地与远程 MP4 动态壁纸，使用 IndexedDB 持久化本地视频。
- 视频播放支持页面隐藏暂停、减少动态效果适配和静态背景回退。
- 支持卡片全局宽度、高度设置。
- 支持在导航管理中为选中的单张卡片设置独立宽高。
- 配置结构升级到 schema v3，保持旧配置兼容。

## v0.8.2 主要修复

- 首屏脚本移到外部文件，移除内联图片错误处理，兼容 MV3 CSP。
- 修复跟随系统主题首次打开误判。
- 修复 Bing 地址覆盖用户背景，以及导入背景后可能回滚的问题。
- 配置与图片缓存分离，导出不再重复携带缓存。
- 旧版存储迁移只有在确认写入成功后才删除旧数据。
- 分组、卡片和搜索引擎加入稳定 ID。
- 配置导入增加结构校验和失败回滚。
- 修复默认强调色自引用，补全模糊半径配置同步。
- 滑块保存防抖，普通启动不再无条件全量写入。
- 图标加载失败改为事件监听，并提供本地文字回退图标。
- 设置面板补充关闭入口、焦点管理和基础键盘可访问性。

## 后续方向

优先增加主页卡片直接拖拽、分组重命名与排序，以及书签导入预览。搜索建议应提供明确的联网开关和隐私说明。PWA 不是当前扩展的优先方向。
