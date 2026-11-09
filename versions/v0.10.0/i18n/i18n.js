/* lemon's NewTab — local, extensible i18n runtime (no network requests). */
const I18n = (() => {
  const locales = new Map();
  const metadata = new Map();
  const listeners = new Set();
  let preference = 'auto';
  let current = 'en';

  function canonical(code) {
    return String(code || '').trim().replace(/_/g, '-');
  }

  function flatten(messages, prefix = '', output = {}) {
    if (!messages || typeof messages !== 'object' || Array.isArray(messages)) return output;
    Object.keys(messages).forEach((key) => {
      const value = messages[key];
      const path = prefix ? prefix + '.' + key : key;
      if (typeof value === 'string') output[path] = value;
      else if (value && typeof value === 'object' && !Array.isArray(value)) flatten(value, path, output);
    });
    return output;
  }

  function registerLocale(code, messages, meta = {}) {
    const normalized = canonical(code);
    const flat = flatten(messages);
    if (!/^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/.test(normalized)) {
      throw new Error('Invalid locale code');
    }
    if (!Object.keys(flat).length) throw new Error('Locale messages must not be empty');
    const merged = Object.assign({}, locales.get(normalized) || {}, flat);
    locales.set(normalized, merged);
    metadata.set(normalized, Object.assign({}, metadata.get(normalized) || {}, meta, {
      code: normalized,
      name: meta.name || metadata.get(normalized)?.name || normalized
    }));
    if (preference !== 'auto' && canonical(preference).toLowerCase() === normalized.toLowerCase()) {
      current = normalized;
    } else if (preference === 'auto') {
      current = resolveLocale('auto');
    }
    return I18n;
  }

  function hasLocale(code) {
    return locales.has(canonical(code));
  }

  function availableLocales() {
    return Array.from(locales.keys()).map((code) => Object.assign({ code, name: code }, metadata.get(code)));
  }

  function systemLanguages() {
    if (typeof navigator === 'undefined') return [];
    if (Array.isArray(navigator.languages) && navigator.languages.length) return navigator.languages.slice();
    return navigator.language ? [navigator.language] : [];
  }

  function matchOne(language) {
    const raw = canonical(language);
    if (!raw) return '';
    const lower = raw.toLowerCase();
    const codes = Array.from(locales.keys());
    const exact = codes.find((code) => code.toLowerCase() === lower);
    if (exact) return exact;

    if (/^zh(?:-|$)/.test(lower)) {
      const traditional = /(?:^zh-(?:tw|hk|mo)\b)|(?:-hant\b)/.test(lower);
      const target = traditional ? 'zh-TW' : 'zh-CN';
      const chinese = codes.find((code) => code.toLowerCase() === target.toLowerCase());
      if (chinese) return chinese;
    }

    const base = lower.split('-')[0];
    const regional = codes.find((code) => code.toLowerCase().split('-')[0] === base && code.includes('-'));
    if (regional) return regional;
    return codes.find((code) => code.toLowerCase() === base) || '';
  }

  function resolveLocale(requested = 'auto', languages) {
    const normalized = canonical(requested || 'auto');
    if (normalized.toLowerCase() !== 'auto') {
      const direct = matchOne(normalized);
      if (direct) return direct;
    }
    const candidates = Array.isArray(languages) ? languages : systemLanguages();
    for (const language of candidates) {
      const matched = matchOne(language);
      if (matched) return matched;
    }
    return locales.has('en') ? 'en' : (Array.from(locales.keys())[0] || 'en');
  }

  function setLanguage(next = 'auto', languages) {
    preference = canonical(next || 'auto') || 'auto';
    if (preference.toLowerCase() === 'auto') preference = 'auto';
    current = resolveLocale(preference, languages);
    if (typeof document !== 'undefined' && document.documentElement) {
      document.documentElement.lang = current;
    }
    listeners.forEach((listener) => listener(current, preference));
    return current;
  }

  function interpolate(message, params) {
    if (!params) return message;
    return message.replace(/\{([A-Za-z0-9_]+)\}/g, (match, key) => (
      Object.prototype.hasOwnProperty.call(params, key) ? String(params[key]) : match
    ));
  }

  function t(key, params) {
    const messages = locales.get(current) || {};
    const fallback = locales.get('en') || {};
    const message = Object.prototype.hasOwnProperty.call(messages, key) ? messages[key] :
      (Object.prototype.hasOwnProperty.call(fallback, key) ? fallback[key] : key);
    return interpolate(message, params);
  }

  function apply(root) {
    if (typeof document === 'undefined') return;
    const scope = root && root.querySelectorAll ? root : document;
    const nodes = [];
    if (scope.nodeType === 1) nodes.push(scope);
    nodes.push(...scope.querySelectorAll('[data-i18n], [data-i18n-placeholder], [data-i18n-aria-label], [data-i18n-title]'));
    nodes.forEach((element) => {
      if (element.dataset.i18n) element.textContent = t(element.dataset.i18n);
      if (element.dataset.i18nPlaceholder) element.setAttribute('placeholder', t(element.dataset.i18nPlaceholder));
      if (element.dataset.i18nAriaLabel) element.setAttribute('aria-label', t(element.dataset.i18nAriaLabel));
      if (element.dataset.i18nTitle) element.setAttribute('title', t(element.dataset.i18nTitle));
    });
    document.documentElement.lang = current;
  }

  function formatDate(date, options) {
    const locale = current || 'en';
    const settings = options || { month: 'long', day: 'numeric', weekday: 'long' };
    try {
      return new Intl.DateTimeFormat(locale, settings).format(date);
    } catch (error) {
      return new Intl.DateTimeFormat('en', settings).format(date);
    }
  }

  function onChange(listener) {
    if (typeof listener !== 'function') return () => {};
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  const api = {
    registerLocale,
    hasLocale,
    availableLocales,
    resolveLocale,
    setLanguage,
    t,
    apply,
    formatDate,
    onChange,
    getLocale: () => current,
    getPreference: () => preference
  };
  return api;
})();

if (typeof globalThis !== 'undefined') globalThis.I18n = I18n;
