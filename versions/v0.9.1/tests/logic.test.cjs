const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const localData = new Map();
const localStorage = {
  getItem(key) { return localData.has(key) ? localData.get(key) : null; },
  setItem(key, value) { localData.set(key, String(value)); },
  removeItem(key) { localData.delete(key); },
};

const style = { setProperty() {}, removeProperty() {} };
const document = {
  addEventListener() {},
  documentElement: { dataset: {}, style },
  body: { style, classList: { add() {}, remove() {}, toggle() {} }, appendChild() {} },
  getElementById() { return null; },
  querySelector() { return null; },
  createElement() { return { style: {}, setAttribute() {}, appendChild() {} }; },
  head: { appendChild() {} },
};

const context = vm.createContext({
  console,
  URL,
  localStorage,
  document,
  window: {
    matchMedia() {
      return { matches: true, addEventListener() {}, addListener() {} };
    },
  },
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  Image: function Image() {},
});

const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
vm.runInContext(source + `\n;globalThis.__test = {
  DEFAULT_CONFIG,
  ConfigStore,
  normalizeConfig,
  getPublicConfig,
  App,
  Theme,
  Background,
  Search,
  Renderer,
  Settings,
  Advanced,
  CustomCSS,
  Colors,
  get CONFIG() { return CONFIG; },
  set CONFIG(value) { CONFIG = value; }
};`, context);
const T = context.__test;
const tests = [];
function test(name, fn) { tests.push({ name, fn }); }

test('默认配置包含当前 schema 和稳定引擎 ID', () => {
  const cfg = T.normalizeConfig({}, true);
  assert.equal(cfg.schemaVersion, 3);
  assert.equal(cfg.search.defaultEngineId, 'engine_bing');
  assert.ok(cfg.engines.every(engine => engine.id));
});

test('卡片全局尺寸和单卡覆盖会被规范化', () => {
  const cfg = T.normalizeConfig({
    cardLayout: { width: 220, height: 80 },
    sections: [{ title: '工作', items: [{ title: 'A', url: 'https://a.com', width: 300, height: 96 }] }],
  }, true);
  assert.equal(cfg.cardLayout.width, '220px');
  assert.equal(cfg.cardLayout.height, '80px');
  assert.equal(cfg.sections[0].items[0].width, '300px');
  assert.equal(cfg.sections[0].items[0].height, '96px');
  assert.throws(() => T.normalizeConfig({ cardLayout: { width: 'wide' } }, true));
});

test('卡片不透明度会被校验并限制在有效范围内', () => {
  const cfg = T.normalizeConfig({ effects: { cardOpacity: 0.42 } }, true);
  assert.equal(cfg.effects.cardOpacity, 0.42);
  assert.equal(T.normalizeConfig({ effects: { cardOpacity: 2 } }, true).effects.cardOpacity, 1);
  assert.throws(() => T.normalizeConfig({ effects: { cardOpacity: 'transparent' } }, true));
});

test('本地视频标记用于存储但不会出现在导出配置中', () => {
  T.CONFIG = T.normalizeConfig({
    backgroundMode: 'video',
    backgroundVideo: 'indexeddb://active-wallpaper',
    videoName: 'demo.mp4',
  }, true);
  assert.equal(JSON.parse(JSON.stringify(T.getPublicConfig(T.CONFIG))).backgroundVideo, 'indexeddb://active-wallpaper');
  const exported = JSON.parse(T.App.exportConfig());
  assert.equal(exported.backgroundMode, 'image');
  assert.equal(exported.backgroundVideo, '');
  assert.equal(exported.videoName, '');
});

test('同名分组和卡片获得不同 ID', () => {
  const cfg = T.normalizeConfig({
    sections: [
      { title: '重复', items: [{ title: 'A', url: 'https://a.com' }] },
      { title: '重复', items: [{ title: 'B', url: 'https://b.com' }] },
    ],
  }, true);
  assert.equal(cfg.sections.length, 2);
  assert.notEqual(cfg.sections[0].id, cfg.sections[1].id);
  assert.ok(cfg.sections[0].items[0].id);
});

test('非法协议和空引擎列表会被严格导入拒绝', () => {
  assert.throws(() => T.normalizeConfig({ sections: [{ title: 'X', items: [{ title: 'bad', url: 'javascript:alert(1)' }] }] }, true));
  assert.throws(() => T.normalizeConfig({ engines: [] }, true));
});

test('公开配置不会导出派生图片缓存', () => {
  const cfg = T.normalizeConfig({}, true);
  cfg._bgBase64 = 'data:image/webp;base64,secret-cache';
  cfg._bgCachedUrl = 'https://example.com/bg.jpg';
  const json = JSON.stringify(T.getPublicConfig(cfg));
  assert.ok(!json.includes('secret-cache'));
  assert.ok(!json.includes('_bgCachedUrl'));
});

test('按 ID 删除同名分组只影响目标分组', async () => {
  T.CONFIG = T.normalizeConfig({ sections: [{ title: '重复', items: [] }, { title: '重复', items: [] }] }, true);
  const first = T.CONFIG.sections[0].id;
  const second = T.CONFIG.sections[1].id;
  T.Renderer.renderSections = () => {};
  const realSave = T.ConfigStore.save;
  T.ConfigStore.save = async () => true;
  await T.App.removeSection(first);
  T.ConfigStore.save = realSave;
  assert.equal(T.CONFIG.sections.length, 1);
  assert.equal(T.CONFIG.sections[0].id, second);
});

test('按分组 ID 添加卡片不会写入第一个同名分组', async () => {
  T.CONFIG = T.normalizeConfig({ sections: [{ title: '重复', items: [] }, { title: '重复', items: [] }] }, true);
  const second = T.CONFIG.sections[1].id;
  const realSave = T.ConfigStore.save;
  T.ConfigStore.save = async () => true;
  await T.App.addCard(second, { title: '目标', url: 'https://example.com', style: 'text' });
  T.ConfigStore.save = realSave;
  assert.equal(T.CONFIG.sections[0].items.length, 0);
  assert.equal(T.CONFIG.sections[1].items.length, 1);
});

test('旧背景镜像不会覆盖配置中的用户原图', async () => {
  const userUrl = 'https://example.com/user.jpg';
  const bingUrl = 'https://www.bing.com/th?id=example_1920x1080.jpg';
  const saved = T.normalizeConfig({ backgroundImage: userUrl, bingDaily: true, bingImage: bingUrl }, true);
  context.chrome = {
    runtime: { lastError: null },
    storage: { local: {
      get(keys, callback) {
        callback({
          lemon_newtab_config: JSON.stringify(saved),
          lemon_newtab_bg_url: bingUrl,
        });
      },
      set(values, callback) { callback(); },
    } },
  };
  await T.ConfigStore.load();
  assert.equal(T.CONFIG.backgroundImage, userUrl);
  assert.equal(T.CONFIG.bingImage, bingUrl);
  assert.equal(T.Background.activeUrl(), bingUrl);
  T.CONFIG.bingDaily = false;
  assert.equal(T.Background.activeUrl(), userUrl);
});

test('保存到 chrome.storage 的 JSON 同样不包含缓存', async () => {
  let payload = null;
  context.chrome.storage.local.set = (values, callback) => { payload = values; callback(); };
  T.CONFIG = T.normalizeConfig({ backgroundImage: 'https://example.com/user.jpg' }, true);
  T.CONFIG._bgBase64 = 'data:image/webp;base64,cache';
  const ok = await T.ConfigStore.save();
  assert.equal(ok, true);
  assert.ok(payload.lemon_newtab_config);
  assert.ok(!payload.lemon_newtab_config.includes('cache'));
  assert.ok(!payload.lemon_newtab_bg_url);
});

test('跟随系统在深色环境中首次初始化即为暗色', () => {
  T.Theme._mq = null;
  T.CONFIG = T.normalizeConfig({ theme: 'auto' }, true);
  T.Theme.init();
  assert.equal(document.documentElement.dataset.theme, 'dark');
});

test('公开配置可再次通过严格校验', () => {
  const original = T.normalizeConfig({
    backgroundImage: 'https://example.com/a.jpg',
    sections: [{ title: '分组', items: [{ title: '站点', url: 'https://example.com' }] }],
  }, true);
  original._bgBase64 = 'data:image/webp;base64,cache';
  const restored = T.normalizeConfig(T.getPublicConfig(original), true);
  assert.equal(restored.sections[0].id, original.sections[0].id);
  assert.equal(restored.sections[0].items[0].id, original.sections[0].items[0].id);
});

(async () => {
  let failed = 0;
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log('✓ ' + name);
    } catch (error) {
      failed += 1;
      console.error('✗ ' + name);
      console.error(error);
    }
  }
  if (failed) process.exitCode = 1;
  else console.log(`\n${tests.length} 项逻辑测试全部通过。`);
})();
