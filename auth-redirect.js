(() => {
  'use strict';

  const redirectUrl = 'https://traintrack-c18.pages.dev';
  const originalCreateClient = window.supabase?.createClient;
  if (!originalCreateClient) return;

  window.supabase.createClient = (...args) => {
    const client = originalCreateClient(...args);
    const originalSignUp = client.auth.signUp.bind(client.auth);

    client.auth.signUp = (credentials = {}) => {
      const options = credentials.options || {};
      return originalSignUp({
        ...credentials,
        options: {
          ...options,
          emailRedirectTo: redirectUrl
        }
      });
    };

    return client;
  };
})();
