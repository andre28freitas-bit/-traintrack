(() => {
  'use strict';

  const SUPABASE_SOURCES = [
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://unpkg.com/@supabase/supabase-js@2'
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

  const loadLocalScripts = async () => {
    for (const src of ['./config.js', './auth-redirect.js', './app.js']) {
      await loadScript(src);
    }
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
      document.getElementById('root').innerHTML = '<div class="empty">Não foi possível carregar a ligação ao Supabase. Atualiza a página e tenta novamente.</div>';
      return;
    }

    try {
      await loadLocalScripts();
    } catch (error) {
      console.error(error);
      document.getElementById('root').innerHTML = '<div class="empty">Não foi possível iniciar a aplicação. Atualiza a página e tenta novamente.</div>';
    }
  };

  start();
})();
