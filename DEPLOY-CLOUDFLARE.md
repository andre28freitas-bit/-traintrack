# Publicar TrainTrack no Cloudflare Pages

Configuração recomendada para este repositório:

- Production branch: `main`
- Framework preset: `None`
- Build command: deixar vazio
- Build output directory: `/`
- Root directory: `/`

A aplicação é uma PWA estática e não precisa de build.

## Após o primeiro deployment

Copiar o URL `*.pages.dev` gerado pelo Cloudflare e adicioná-lo no Supabase Authentication > URL Configuration como Site URL e Redirect URL permitido para os fluxos de login da TrainTrack.

## Segurança

O ficheiro `_headers` aplica headers de segurança e cache no Cloudflare Pages. O frontend usa apenas a publishable key do Supabase; nunca deve ser usada uma service-role key no browser.
