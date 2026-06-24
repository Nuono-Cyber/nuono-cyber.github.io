# Deploy do Backend (SQLite API)

Este projeto agora precisa de backend para login/cadastro:

- Frontend: GitHub Pages
- Backend: Node + SQLite (`server/index.cjs`)

## 1. Publicar API no Render

1. Conecte o repositório no Render.
2. Use o arquivo `render.yaml` da raiz.
3. Garanta que o build use `npm ci --include=dev && npm run build`, porque o frontend é compilado com `vite` em `devDependencies`.
4. Configure as variáveis:
   - `JWT_SECRET` (obrigatória)
   - `DEFAULT_ADMIN_PASSWORD` (ex.: `nad123*`)
   - `SUPER_ADMIN_EMAILS` (csv de emails)
   - `ALLOWED_ORIGINS` (ex.: `https://nuono-cyber.github.io,http://localhost:5173,http://127.0.0.1:5173`)
   - `FORCE_SUPER_ADMIN_PASSWORD` (use `true` apenas em um deploy pontual para gravar `DEFAULT_ADMIN_PASSWORD` nos super admins)
   - `EXPOSE_RESET_LINK` (`false` em produção; o fluxo público de recuperação está desativado)

Depois do deploy, copie a URL pública da API (ex.: `https://nuono-api.onrender.com`).

## 2. Apontar frontend para a API

No build do frontend, defina:

`VITE_API_BASE_URL=https://<sua-api-publica>`

Com isso, o frontend em `https://nuono-cyber.github.io` deixa de chamar `/api` local e passa a chamar sua API publicada.

Observação: o frontend também usa fallback automático para `https://nuono-api.onrender.com` quando estiver rodando no domínio `nuono-cyber.github.io` e `VITE_API_BASE_URL` não estiver definido.

## 3. Corrigir login de super usuário

Se o login do super usuário falhar:

1. No Render, defina `DEFAULT_ADMIN_PASSWORD` com a senha desejada.
2. Defina temporariamente `FORCE_SUPER_ADMIN_PASSWORD=true`.
3. Faça um novo deploy e teste o login.
4. Depois que funcionar, volte `FORCE_SUPER_ADMIN_PASSWORD` para `false` e redeploy.

Também é possível atualizar direto no Supabase:

```bash
SUPABASE_URL=... \
SUPABASE_SERVICE_ROLE_KEY=... \
TARGET_ADMIN_EMAIL=gabrielnbn@nadenterprise.com \
NEW_ADMIN_PASSWORD='senha-desejada' \
node scripts/set-admin-password.cjs
```

## 4. Verificação rápida

- `GET https://<sua-api-publica>/api/health` deve retornar `{ "ok": true }`
- Login de superadmin deve funcionar com:
  - `gabrielnbn@nadenterprise.com`
  - senha definida em `DEFAULT_ADMIN_PASSWORD`
