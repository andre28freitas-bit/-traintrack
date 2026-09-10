(() => {
  'use strict';

  const SUPABASE_SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.116.0',
    'https://unpkg.com/@supabase/supabase-js@2.116.0'
  ];

  const loadScript = (src) => new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = false;
    script.onload = () => resolve(src);
    script.onerror = () => {
      script.remove();
      reject(new Error(`Falha ao carregar ${src}`));
    };
    document.head.appendChild(script);
  });

  const showError = (title, detail = '') => {
    const root = document.getElementById('root');
    if (!root) return;
    root.innerHTML = `<div class="empty"><strong>${title}</strong>${detail ? `<br><small>${detail}</small>` : ''}<br><button class="primary" style="margin-top:14px" onclick="location.reload()">Tentar novamente</button></div>`;
  };

  const start = async () => {
    let loaded = false;
    for (const src of SUPABASE_SOURCES) {
      try {
        await loadScript(src);
        if (window.supabase?.createClient) {
          loaded = true;
          break;
        }
      } catch (error) {
        console.warn(error.message);
      }
    }
    if (!loaded) {
      showError('Não foi possível carregar a ligação ao Supabase.', 'Falha ao carregar a biblioteca Supabase.');
      return;
    }
    try {
      for (const src of [
        './config.js',
        './auth-redirect.js',
        './app.js',
        './extensions-core.js',
        './score-model.js',
        './extensions-calendar.js',
        './assessment-edit.js',
        './templates-progress-v2.js',
        './score-ui-patch.js',
        './progress-comparison.js',
        './summary-delta-ui.js',
        './print-report.js',
        './calendar-nav-v2.js',
        './calendar-event-edit.js'
      ]) {
        await loadScript(src);
      }
    } catch (error) {
      console.error(error);
      showError('Não foi possível iniciar a aplicação.', error?.message || 'Erro inesperado no carregamento.');
    }
  };

  start();
})();