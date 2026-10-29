/* 首屏主题引导：必须是外部脚本，兼容 Manifest V3 CSP。 */
(function () {
  var theme = 'auto';
  try {
    theme = localStorage.getItem('lemon_newtab_theme') || 'auto';
    if (theme === 'auto') {
      var legacy = localStorage.getItem('lemon_newtab_config');
      if (legacy) {
        var parsed = JSON.parse(legacy);
        if (parsed && parsed.theme) theme = parsed.theme;
      }
    }
  } catch (e) {}

  if (theme !== 'light' && theme !== 'dark' && theme !== 'auto') theme = 'auto';
  var isDark = theme === 'dark' || (theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
})();
