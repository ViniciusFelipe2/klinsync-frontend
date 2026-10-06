# KlinSync Frontend

SPA (React 19 + TanStack Router + Tailwind 4) publicada como arquivos estáticos em um bucket **S3** (via CloudFront).
Não há renderização no servidor: toda a lógica de negócio, autenticação e acesso a dados fica na **API do `klinsync-backend` (EC2)**.

Derivado do projeto `trizion` (TanStack Start + Supabase), que continua intacto como referência.

## Desenvolvimento

```sh
cp .env.example .env     # defina VITE_API_URL
npm install
npm run dev              # http://localhost:5173
```

| Script              | O que faz                                |
| ------------------- | ---------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento (Vite)       |
| `npm run build`     | Typecheck + build de produção em `dist/` |
| `npm run typecheck` | `tsc --noEmit`                           |
| `npm run lint`      | ESLint + Prettier                        |

## Variáveis de ambiente (build)

| Variável                  | Descrição                                             |
| ------------------------- | ----------------------------------------------------- |
| `VITE_API_URL`            | URL base da API, ex.: `https://api.meudominio.com.br` |
| `VITE_RECAPTCHA_SITE_KEY` | Opcional. Chave pública do reCAPTCHA v3 (login)       |

São embutidas no bundle em tempo de build — **nunca** coloque segredos aqui.

## Como o front fala com o backend

- `src/lib/api/http.ts`: cliente `fetch`, sessão (JWT em `localStorage`), renovação automática via `/auth/refresh` e tratamento de 401.
- `src/lib/api/*.ts`: um módulo por área (`medsync`, `hospital`, `convites`, `seguranca`, `auditoria`, `modulos`, `checkin`, `giro`, `auth`).
  Mantêm os mesmos nomes e a mesma chamada `fn({ data })` das antigas server functions.
- `src/lib/api/db-types.ts`: tipos das tabelas (referência do schema para o `klinsync-db`).
- O contrato completo dos endpoints está em [docs/API-CONTRACT.md](docs/API-CONTRACT.md).

Mudanças em relação ao projeto mãe:

- Supabase Auth/MFA/RPC/Realtime removidos do navegador; tudo passa pela API.
- Realtime substituído por polling (10–15 s) enquanto a aba está visível.
- Bloqueio de login, log de tentativas e captcha passaram para `POST /auth/login` (no servidor).
- Headers de segurança (CSP etc.) saem do servidor Node e passam a ser aplicados pelo CloudFront — ver [deploy/AWS.md](deploy/AWS.md).

## Deploy

Push na `main` dispara [.github/workflows/deploy-frontend.yml](.github/workflows/deploy-frontend.yml): build → `s3 sync` → invalidação do CloudFront.
Configuração única da AWS em [deploy/AWS.md](deploy/AWS.md).

## Pendências conhecidas

- `src/assets/klinsync-logo.svg` é um **placeholder**: o PNG original só existia como referência de CDN da Lovable. Substitua por `klinsync-logo.png` (1010×300) e ajuste o import em `src/components/medsync/brand.tsx`.
