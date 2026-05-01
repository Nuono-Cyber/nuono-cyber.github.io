# Deploy do Backend (SQLite API)

Este projeto agora precisa de backend para login/cadastro:

- Frontend: GitHub Pages
- Backend: Node + SQLite (`server/index.cjs`)

## 1. Publicar API no Render

1. Conecte o repositório no Render.
2. Use o arquivo `render.yaml` da raiz.
3. Configure as variáveis:
   - `JWT_SECRET` (obrigatória)
   - `DEFAULT_ADMIN_PASSWORD` (ex.: `nad123*`)
   - `SUPER_ADMIN_EMAILS` (csv de emails)

Depois do deploy, copie a URL pública da API (ex.: `https://nuono-api.onrender.com`).

## 2. Apontar frontend para a API

No build do frontend, defina:

`VITE_API_BASE_URL=https://<sua-api-publica>`

Com isso, o frontend em `https://nuono-cyber.github.io` deixa de chamar `/api` local e passa a chamar sua API publicada.

## 3. Verificação rápida

- `GET https://<sua-api-publica>/api/health` deve retornar `{ "ok": true }`
- Login de superadmin deve funcionar com:
  - `gabrielnbn@nadenterprise.com`
  - senha definida em `DEFAULT_ADMIN_PASSWORD`
