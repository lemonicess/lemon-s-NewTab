const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const localeFiles = ['en.js', 'ja.js', 'ko.js', 'zh-CN.js', 'zh-TW.js'];
const context = vm.createContext({
  console,
  navigator: { language: 'en-US', languages: ['en-US'] },
  document: { documentElement: {} },
});
vm.runInContext(fs.readFileSync(path.join(root, 'i18n', 'i18n.js'), 'utf8'), context);

const packs = {};
vm.runInContext(`globalThis.__capture = I18n.registerLocale;
I18n.registerLocale = (code, messages, meta) => {
  globalThis.__packs[code] = messages;
  return globalThis.__capture(code, messages, meta);
};`, context);
context.__packs = packs;
for (const file of localeFiles) {
  vm.runInContext(fs.readFileSync(path.join(root, 'i18n', file), 'utf8'), context, { filename: file });
}

const englishKeys = Object.keys(packs.en).sort();
assert.ok(englishKeys.length > 100, 'English source catalog should be complete');
for (const [locale, messages] of Object.entries(packs)) {
  const keys = Object.keys(messages).sort();
  assert.deepEqual(keys, englishKeys, `${locale} keys must exactly match en`);
  for (const key of englishKeys) {
    assert.equal(typeof messages[key], 'string', `${locale}:${key} must be a string`);
    assert.ok(messages[key].trim(), `${locale}:${key} must not be empty`);
    const expected = [...packs.en[key].matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m => m[1]).sort();
    const actual = [...messages[key].matchAll(/\{([A-Za-z0-9_]+)\}/g)].map(m => m[1]).sort();
    assert.deepEqual(actual, expected, `${locale}:${key} placeholders must match en`);
  }
}

const indexSource = fs.readFileSync(path.join(root, 'index.js'), 'utf8');
const htmlSource = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const used = new Set();
for (const source of [indexSource, htmlSource]) {
  for (const match of source.matchAll(/'([A-Za-z0-9_.-]+)'/g)) {
    if (englishKeys.includes(match[1])) used.add(match[1]);
  }
  for (const match of source.matchAll(/\{\{([A-Za-z0-9_.-]+)\}\}/g)) used.add(match[1]);
  for (const match of source.matchAll(/data-i18n(?:-placeholder|-aria-label|-title)?="([A-Za-z0-9_.-]+)"/g)) used.add(match[1]);
  for (const match of source.matchAll(/labelKey:\s*'([A-Za-z0-9_.-]+)'/g)) used.add(match[1]);
}
const missing = [...used].filter(key => !englishKeys.includes(key)).sort();
assert.deepEqual(missing, [], `Missing translation keys: ${missing.join(', ')}`);
const unused = englishKeys.filter(key => !used.has(key));
assert.deepEqual(unused, [], `Unused translation keys: ${unused.join(', ')}`);

assert.equal(context.I18n.availableLocales().length, 5);
assert.equal(context.I18n.resolveLocale('auto', ['zh-MO']), 'zh-TW');
assert.equal(context.I18n.resolveLocale('auto', ['zh-Hans-CN']), 'zh-CN');
assert.equal(context.I18n.resolveLocale('auto', ['de-DE', 'ko-KR']), 'ko');
assert.equal(context.I18n.resolveLocale('auto', ['de-DE']), 'en');

context.I18n.registerLocale('fr', { 'app.title': 'Nouvel onglet' }, { name: 'Français' });
assert.equal(context.I18n.resolveLocale('auto', ['fr-FR']), 'fr');
context.I18n.setLanguage('fr');
assert.equal(context.I18n.t('app.title'), 'Nouvel onglet');
assert.equal(context.I18n.t('settings.title'), 'Settings', 'Missing keys should fall back to English');

console.log(`✓ ${localeFiles.length} 个语言包，${englishKeys.length} 个翻译键，${used.size} 个已使用键全部一致。`);
console.log('✓ 系统语言解析、简繁匹配、英语回退和自定义语言注册接口通过。');
